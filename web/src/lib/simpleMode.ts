// Simple mode (OpenSpec change simple-mode): the synced switch, the lists the Simple
// screen leaves out and the star (the columns are in simpleBoard.ts, which only the
// lazy Simple screen loads). Nothing
// here writes a task or a project; the switch and the hidden lists are user_prefs ops,
// so they work offline, reach the user's other devices and converge per field.
import { db } from './db'
import { useUserPrefsRow } from './localData'
import { mutate } from './ops'
import type { Priority, Task, UserPrefs } from './types'
import { USER_PREFS_ID } from './userPrefs'

/** The column of tasks without a project ("My tasks"); never stored in `simple_hidden`. */
export const MY_TASKS = 'none'

/** Whether Simple mode is on; '', a missing field and an unknown value read as off (the row is kept). */
export function simpleModeOn(prefs: Partial<Pick<UserPrefs, 'simple_mode'>> | null | undefined): boolean {
  return prefs?.simple_mode === 'on'
}

/** Turns Simple mode on or off: one synced op, offline included; no task or project changes. */
export function setSimpleMode(on: boolean): Promise<void> {
  return mutate('user_prefs', USER_PREFS_ID, { simple_mode: on ? 'on' : '' })
}

/** The stored switch, read once (the launch redirect to /simple). */
export async function simpleModeStored(): Promise<boolean> {
  return simpleModeOn(await db.userPrefs.get(USER_PREFS_ID))
}

/** The account's switch, live (off while loading). */
export function useSimpleModeOn(): boolean {
  return simpleModeOn(useUserPrefsRow())
}

/** The stored hidden list ids; anything that is not a list of strings reads as none. */
export function hiddenLists(prefs: Partial<Pick<UserPrefs, 'simple_hidden'>> | null | undefined): string[] {
  const v = prefs?.simple_hidden
  return Array.isArray(v) ? v.filter((id): id is string => typeof id === 'string' && id !== MY_TASKS) : []
}

/** Shows or hides one list on the Simple screen (My tasks is always shown). */
export function setListHidden(current: readonly string[], projectId: string, hidden: boolean): Promise<void> {
  if (projectId === MY_TASKS) return Promise.resolve()
  const next = current.filter((id) => id !== projectId)
  if (hidden) next.push(projectId)
  return mutate('user_prefs', USER_PREFS_ID, { simple_hidden: next })
}

/** The star (simple-mode "The star"): priority 1 is starred, anything else is not. */
export function isStarred(task: Pick<Task, 'priority'>): boolean {
  return task.priority === 1
}

/** The priority a star toggle writes: 1 when starring, 4 when unstarring. */
export function starPriority(starred: boolean): Priority {
  return starred ? 1 : 4
}

