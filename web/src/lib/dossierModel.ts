// Dossier rules (OpenSpec change resume-dossiers): pure reads of a personal,
// ordered thread of real tasks. Nothing here writes; the writers are in
// lib/dossiers.ts. A dossier never stores progress: the current step is the
// first live open task in its order, and the finished state follows the tasks.
import type { Dossier, Label, Project, Review, Task } from './types'

/** Today's focus holds at most this many dossiers, beside the three tasks. */
export const DOSSIER_FOCUS_MAX = 3
/** The op schema's id-list bound, repeated for the attach picker and the UI. */
export const DOSSIER_TASK_MAX = 50

export interface DossierState {
  /** Live members in dossier order. */
  tasks: Task[]
  /** Ids in task_ids that no live task resolves: deleted, purged or no longer visible. */
  unavailable: string[]
  done: number
  total: number
  /** The first live, open task in order; null when the thread is empty or finished. */
  next: Task | null
  waiting: boolean
  empty: boolean
  complete: boolean
}

/**
 * The dossier's order resolved against the live tasks, and the ids that no longer
 * resolve. `projects` is optional: screens pass it so a task of a deleted project
 * is unavailable even when the raw task row still exists (the live task snapshot
 * already leaves those out, but pure callers do not have to remember).
 */
export function dossierTasks(dossier: Pick<Dossier, 'task_ids'>, tasks: readonly Task[], projects?: readonly Project[]): { tasks: Task[]; unavailable: string[] } {
  const deletedProjects = projects ? new Set(projects.filter((p) => !!p.deleted_at).map((p) => p.id)) : null
  const byId = new Map(tasks.filter((task) => !task.deleted_at).map((task) => [task.id, task]))
  const out: Task[] = []
  const unavailable: string[] = []
  const seen = new Set<string>()
  const order = Array.isArray(dossier.task_ids) ? dossier.task_ids : []
  for (const id of order) {
    if (!id || seen.has(id)) continue
    seen.add(id)
    const task = byId.get(id)
    const projectGone = !!task?.project_id && !!deletedProjects?.has(task.project_id)
    if (task && !projectGone) out.push(task)
    else unavailable.push(id)
  }
  return { tasks: out, unavailable }
}

/** The current step, progress and state of a dossier from the live task rows. */
export function dossierState(dossier: Pick<Dossier, 'task_ids' | 'waiting'>, tasks: readonly Task[], projects?: readonly Project[]): DossierState {
  const { tasks: members, unavailable } = dossierTasks(dossier, tasks, projects)
  const done = members.filter((task) => !!task.completed_at).length
  const next = members.find((task) => !task.completed_at) ?? null
  return {
    tasks: members,
    unavailable,
    done,
    total: members.length,
    next,
    waiting: !!dossier.waiting,
    empty: members.length === 0,
    complete: members.length > 0 && done === members.length,
  }
}

/**
 * The dossiers chosen for today: stored only when focus_date is today, distinct
 * non-empty ids in their stored order, at most the focus cap. When the dossiers
 * are passed, deleted ids are dropped first, so an old tombstone cannot hide the
 * third live choice. A row written by a newer client with more ids cannot make
 * the sun believe there is room.
 */
export function focusDossierIds(review: Pick<Review, 'focus_date' | 'focus_dossiers'> | null | undefined, today: string, dossiers?: readonly Dossier[]): string[] {
  if (!review || review.focus_date !== today) return []
  const list = Array.isArray(review.focus_dossiers) ? review.focus_dossiers : []
  const ids = [...new Set(list.filter((id): id is string => typeof id === 'string' && id !== ''))]
  const live = dossiers ? new Set(dossiers.filter((d) => !d.deleted_at).map((d) => d.id)) : null
  return (live ? ids.filter((id) => live.has(id)) : ids).slice(0, DOSSIER_FOCUS_MAX)
}

/** The chosen dossiers in their stored order, without deleted ones. */
export function focusDossiers(review: Pick<Review, 'focus_date' | 'focus_dossiers'> | null | undefined, today: string, dossiers: readonly Dossier[]): Dossier[] {
  const byId = new Map(dossiers.filter((d) => !d.deleted_at).map((d) => [d.id, d]))
  return focusDossierIds(review, today, dossiers).map((id) => byId.get(id)).filter((d): d is Dossier => !!d)
}

/**
 * The next open task of each chosen dossier that is moving, once each: what
 * Today's briefing and My day count. A thread on hold shows its wait instead of
 * posing its next task as chosen work.
 */
export function focusDossierTasks(review: Pick<Review, 'focus_date' | 'focus_dossiers'> | null | undefined, today: string, dossiers: readonly Dossier[], tasks: readonly Task[]): Task[] {
  const out: Task[] = []
  const seen = new Set<string>()
  for (const dossier of focusDossiers(review, today, dossiers)) {
    if (dossier.waiting) continue
    const next = dossierState(dossier, tasks).next
    if (next && !seen.has(next.id)) {
      seen.add(next.id)
      out.push(next)
    }
  }
  return out
}

/** Dossiers on hold, the nearest follow-up first and the undated ones last. */
export function waitingDossiers(dossiers: readonly Dossier[]): Dossier[] {
  return dossiers
    .filter((dossier) => !dossier.deleted_at && dossier.waiting)
    .sort((a, b) => {
      const fa = a.follow_up || '9999-12-31'
      const fb = b.follow_up || '9999-12-31'
      return fa < fb ? -1 : fa > fb ? 1 : (a.position ?? 0) - (b.position ?? 0) || (a.title ?? '').localeCompare(b.title ?? '')
    })
}

/**
 * The dossier to show first on Pick up the thread: today's chosen one, else the
 * first thread still to advance, else the first on hold, else the first.
 */
export function featuredDossier(dossiers: readonly Dossier[], tasks: readonly Task[], review: Pick<Review, 'focus_date' | 'focus_dossiers'> | null | undefined, today: string): Dossier | null {
  const live = dossiers.filter((d) => !d.deleted_at)
  const chosen = focusDossiers(review, today, live)[0]
  if (chosen) return chosen
  const state = (d: Dossier) => dossierState(d, tasks)
  return live.find((d) => { const s = state(d); return !s.waiting && !s.complete && !s.empty }) ??
    live.find((d) => state(d).waiting) ?? live[0] ?? null
}

/** One label as a context chip: the label and how many open tasks carry it. */
export interface ContextChip { label: Label; count: number }

/** Context chips are the labels already on the open tasks, most used first; nothing is created. */
export function contextChips(tasks: readonly Task[], labels: readonly Label[]): ContextChip[] {
  const live = new Map(labels.filter((l) => !l.deleted_at).map((l) => [l.id, l]))
  const counts = new Map<string, number>()
  for (const task of tasks) {
    if (task.completed_at || task.deleted_at) continue
    for (const id of new Set(task.labels ?? [])) if (live.has(id)) counts.set(id, (counts.get(id) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([id, count]) => ({ label: live.get(id)!, count }))
    .sort((a, b) => b.count - a.count || (a.label.name ?? '').localeCompare(b.label.name ?? ''))
}

/** The visible name of a context label (the Open Loops `@` is a convention, not part of the words). */
export function contextName(label: Pick<Label, 'name'>): string {
  const name = label.name ?? ''
  return name.replace(/^@+/, '').trim() || name
}

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'from', 'this', 'that', 'are', 'was', 'were', 'has', 'have', 'had', 'not', 'but', 'you', 'your',
  'les', 'des', 'une', 'un', 'le', 'la', 'de', 'du', 'sur', 'chez', 'mon', 'ma', 'mes', 'ton', 'ta', 'tes', 'son', 'sa', 'ses',
  'aux', 'en', 'et', 'ou', 'pour', 'avec', 'dans', 'par', 'pas', 'plus', 'est', 'sont', 'que', 'qui', 'quoi', 'tout', 'tous',
  'task', 'tache', 'tâche', 'todo', 'faire', 'jour', 'demain', 'today', 'tomorrow',
])

function words(text: string): string[] {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length >= 3 && !STOP_WORDS.has(word))
}

/**
 * The local capture offer (design D6): dossiers whose title, note or member task
 * titles share a word with the captured title. Deterministic, bounded and never
 * a model call. An empty result means no card.
 */
export function suggestDossiers(title: string, dossiers: readonly Dossier[], tasks: readonly Task[], limit = 3): Dossier[] {
  const query = new Set(words(title))
  if (query.size === 0) return []
  const byId = new Map(tasks.filter((task) => !task.deleted_at).map((task) => [task.id, task]))
  const scored = dossiers
    // A finished thread has nothing left to advance: a new capture is not offered to it.
    .filter((dossier) => !dossier.deleted_at && !dossierState(dossier, tasks).complete)
    .map((dossier) => {
      const memberTitles = (Array.isArray(dossier.task_ids) ? dossier.task_ids : []).map((id) => byId.get(id)?.title ?? '').join(' ')
      const haystack = new Set(words(`${dossier.title ?? ''} ${dossier.note ?? ''} ${memberTitles}`))
      let score = 0
      for (const word of query) if (haystack.has(word)) score++
      return { dossier, score }
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || (a.dossier.position ?? 0) - (b.dossier.position ?? 0) || (a.dossier.title ?? '').localeCompare(b.dossier.title ?? ''))
  return scored.slice(0, limit).map(({ dossier }) => dossier)
}
