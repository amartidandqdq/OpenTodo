// Built-in assistant skills (OpenSpec change assistant-skills): the list the
// server offers, the device's working day for "Plan my week", and how pasted
// text is told apart from a typed question. The skills' instructions stay on
// the server; the client only names a skill by id.
import { useEffect, useMemo, useState } from 'react'
import { api } from './api'
import { DEFAULT_GRID_PREFS, GRID_PREFS_META_KEY, normalizeGridPrefs, type GridPrefs } from './calendar'
import { getMeta } from './db'
import { assistantStatus } from './assistantStatus'
import { t } from './i18n'

export interface AssistantSkill {
  id: string
  name: string
  description: string
  example: string
  result: 'changes' | 'answer'
  subject?: 'selection' | 'pasted'
}

let cache: AssistantSkill[] | null = null
const listeners = new Set<(s: AssistantSkill[]) => void>()

/** Fetches the skill list (empty when the assistant is not available to you). */
export async function loadSkills(): Promise<AssistantSkill[]> {
  try {
    cache = (await api.assistantSkills()).skills
  } catch {
    cache ??= []
  }
  // An encrypted account in device mode runs the skills of the generated manifest (assistant-on-device D11).
  if (!cache.length && assistantStatus()?.mode === 'device') {
    try {
      const { manifest } = await import('./assistantDevice/manifest')
      cache = manifest.skills.map(({ id, name, description, example, result, subject }) => ({ id, name, description, example, result, ...(subject ? { subject } : {}) }))
    } catch {
      // The chunk could not load (offline after an update): no starters.
    }
  }
  listeners.forEach((fn) => fn(cache!))
  return cache
}

/**
 * A built-in skill's name, description and example in the user's language. The
 * server and the manifest send English; an id it does not know is shown as sent.
 */
export function localizeSkill(s: AssistantSkill): AssistantSkill {
  switch (s.id) {
    case 'idea-to-project': return { ...s, name: t('Turn an idea into a project'), description: t('Turns an idea or pasted notes into a project with phases and estimated tasks.'), example: t('Plan a garden makeover in spring, budget 2000') }
    case 'plan-week': return { ...s, name: t('Plan my week'), description: t('Proposes due dates and times for your open work within your working hours.'), example: t('Plan my week around the Q4 launch') }
    case 'weekly-review': return { ...s, name: t('Weekly review'), description: t('Walks your inbox, earlier and stale tasks and proposes what to reschedule, move or complete.'), example: t('Run my weekly review') }
    case 'triage-inbox': return { ...s, name: t('Triage my inbox'), description: t('Proposes a project, labels, priority and date for each task in your inbox.'), example: t('Triage my inbox') }
    case 'break-down': return { ...s, name: t('Break this down'), description: t('Turns one task into subtasks with estimates.'), example: t('Break this task into steps') }
  }
  return s
}

/** The skills, loaded once per session and shared. */
export function useAssistantSkills(enabled = true): AssistantSkill[] {
  const [skills, setSkills] = useState<AssistantSkill[]>(cache ?? [])
  useEffect(() => {
    if (!enabled) return
    listeners.add(setSkills)
    if (cache === null) void loadSkills()
    else setSkills(cache)
    return () => { listeners.delete(setSkills) }
  }, [enabled])
  const shown = useMemo(() => skills.map(localizeSkill), [skills])
  return enabled ? shown : []
}

/** Test hook. */
export function resetSkills(list: AssistantSkill[] | null = null): void {
  cache = list
}

/** The device's working day (Settings → Calendar), for plan-week. */
export async function workday(): Promise<Pick<GridPrefs, 'startHour' | 'endHour' | 'dayLength'>> {
  let prefs = DEFAULT_GRID_PREFS
  try {
    prefs = normalizeGridPrefs(await getMeta<unknown>(GRID_PREFS_META_KEY, null))
  } catch {
    // The defaults.
  }
  // Only the working day: the server refuses fields it does not know (the Plan's span stays on the device).
  return { startHour: prefs.startHour, endHour: prefs.endHour, dayLength: prefs.dayLength }
}

/** A paste becomes untrusted material when it is long or has line breaks (design D3). */
export function isMaterial(text: string): boolean {
  return text.length > 280 || /\r|\n/.test(text.trim())
}
