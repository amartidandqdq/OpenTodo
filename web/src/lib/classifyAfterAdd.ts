// Classify after adding (fork change `assistant-classify-card`): a task typed into a quick-add line with no list lands in
// the Inbox as always; the assistant then names the list it probably belongs in, and a small card asks the person to
// confirm it, pick another list or leave it ("Later"). Nothing moves before a choice, the move is one Undo away, and
// adding a task never depends on the assistant.
import { api } from './api'
import { assistantStatus } from './assistantStatus'
import { db, getMeta, setMeta } from './db'
import { resettable } from './moduleState'
import { createStore } from './store'
import type { Project } from './types'

const KEY = 'assistant.classifyAfterAdd'
/** Below this the assistant is guessing: the task stays in the Inbox without a card. */
export const CLASSIFY_MIN_CONFIDENCE = 0.5
const MAX_LISTS = 60

/** Per device, on by default (the assistant needs the person's consent anyway): each add costs one short model call. */
export async function getClassifyAfterAdd(): Promise<boolean> {
  try {
    return await getMeta<boolean>(KEY, true)
  } catch {
    return false
  }
}

export async function setClassifyAfterAdd(on: boolean): Promise<void> {
  await setMeta(KEY, on)
}

/** The card on screen: the new task and the list the assistant proposes. */
export interface ClassifyOffer {
  key: number
  taskId: string
  title: string
  projectId: string
}

const store = createStore<ClassifyOffer | null>('classifyOffer', null)
let seq = 0
resettable('classifyOfferSeq', () => { seq = 0 })
export const classifyOffer = store.get
export const useClassifyOffer = store.use
export const hideClassifyOffer = (key?: number): void => {
  if (key === undefined || store.get()?.key === key) store.set(null)
}

/** The lists the assistant may choose from: live, not archived, in the task's workspace, at most 60. */
export function candidateLists(projects: readonly Project[], workspaceId: string | null | undefined): Project[] {
  return projects
    .filter((p) => !p.deleted_at && !p.archived && (p.workspace_id ?? null) === (workspaceId ?? null))
    .sort((a, b) => a.position - b.position)
    .slice(0, MAX_LISTS)
}

/**
 * Proposes a list for a task that was just added. Does nothing unless this device keeps the switch on, the assistant is
 * available to the account (on, consented, not an encrypted account), and the task is unplaced: no list, no parent.
 * Returns whether a card was offered. Never throws: the task is already created and a proposal is a bonus.
 */
export async function classifyAfterAdd(taskId: string, title: string): Promise<boolean> {
  try {
    const s = assistantStatus()
    if (!s || !s.enabled || !s.available || !s.consented) return false
    if (!(await getClassifyAfterAdd())) return false
    const task = await db.tasks.get(taskId)
    if (!task || task.project_id || task.parent_id) return false
    const lists = candidateLists(await db.projects.toArray(), task.workspace_id)
    if (!lists.length) return false
    const answer = await api.assistantClassify(title, lists.map((p) => ({ id: p.id, name: p.name })))
    if (!answer.project_id || answer.confidence < CLASSIFY_MIN_CONFIDENCE) return false
    if (!lists.some((p) => p.id === answer.project_id)) return false
    // The person may have moved or finished the task while the model was thinking.
    const now = await db.tasks.get(taskId)
    if (!now || now.deleted_at || now.completed_at || now.project_id) return false
    store.set({ key: ++seq, taskId, title, projectId: answer.project_id })
    return true
  } catch {
    return false
  }
}
