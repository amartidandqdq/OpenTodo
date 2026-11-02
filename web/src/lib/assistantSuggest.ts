// Suggest after adding (fork change `assistant-suggest-after-add`): right after a task is typed into a quick-add line,
// the assistant proposes a clearer title, the right project and a few subtasks. It reuses the assistant panel, so the
// proposal is the usual change set: every item can be unchecked, nothing changes before Apply, and Undo puts it back.
import { db, getMeta, setMeta } from './db'
import { assistantStatus, openAssistantWith } from './assistantStatus'
import { classifyAfterAdd, hideClassifyOffer } from './classifyAfterAdd'
import type { Dossier, Task } from './types'
import { offerDossierLink, hideDossierLinkOffer } from './dossiers'
import { createTask, type NewTaskInput } from './ops'
import { Partition, readWorkspaceState } from './workspaces'

const KEY = 'assistant.suggestAfterAdd'

/** Per device, off by default: each add that asks costs one assistant turn. */
export async function getSuggestAfterAdd(): Promise<boolean> {
  try {
    return await getMeta<boolean>(KEY, false)
  } catch {
    return false
  }
}

export async function setSuggestAfterAdd(on: boolean): Promise<void> {
  await setMeta(KEY, on)
}

/** The question the assistant gets: bounded on purpose (title, project, at most 4 subtasks, nothing else touched). */
export function suggestionPrompt(title: string): string {
  // Not translated on purpose: it is an instruction to the model (which answers in the task's language), not text the person reads.
  return `Improve the task “${title}”: propose a clearer title only if it helps, the right project only if it is clearly better, and at most 4 subtasks only if the task is really several steps. Change nothing else, invent no date, and answer in the language of the task.`
}

/**
 * Asks for a suggestion about a task that was just added. Does nothing unless the device turned it on and the
 * assistant is available to this account (on, consented, not an encrypted account). Never throws: adding a task
 * must not depend on the assistant.
 */
export async function suggestAfterAdd(taskId: string, title: string): Promise<void> {
  try {
    const s = assistantStatus()
    if (!s || !s.enabled || !s.available || !s.consented) return
    if (!(await getSuggestAfterAdd())) return
    openAssistantWith({ text: suggestionPrompt(title), selected: [taskId], send: true })
  } catch {
    // The task is already created; a suggestion is a bonus.
  }
}

/** Dossiers of the task's workspace, for the local match; deleted ones never compete. */
async function sameWorkspaceDossiers(task: Task): Promise<Dossier[]> {
  const [all, state, projects, tasks] = await Promise.all([db.dossiers.toArray(), readWorkspaceState(), db.projects.toArray(), db.tasks.toArray()])
  const partition = new Partition(state.defaultId, state.list.map((workspace) => workspace.id), projects, tasks)
  return all.filter((dossier) => !dossier.deleted_at && partition.own(dossier.workspace_id) === partition.taskRow(task))
}

/**
 * Offers an existing dossier to the task just added. Deterministic and local: it reads the rows on this device,
 * needs no assistant or network, and writes nothing until the person confirms the card. Never throws.
 */
async function offerLocalDossier(taskId: string, title: string): Promise<boolean> {
  try {
    const task = await db.tasks.get(taskId)
    if (!task || task.deleted_at) return false
    const dossiers = await sameWorkspaceDossiers(task)
    if (dossiers.length === 0) return false
    return offerDossierLink(taskId, title, dossiers, await db.tasks.toArray())
  } catch {
    return false
  }
}

/** The one follow-up a capture may show: a local dossier card, else the existing list card, else the assistant panel. */
async function followUpAfterAdd(taskId: string, title: string): Promise<void> {
  // A new capture supersedes the previous proposal, so two cards never compete for the same attention.
  hideClassifyOffer()
  hideDossierLinkOffer()
  try {
    if (await offerLocalDossier(taskId, title)) return
    if (await classifyAfterAdd(taskId, title)) return
    await suggestAfterAdd(taskId, title)
  } catch {
    // The task is already created; a proposal is a bonus.
  }
}

/**
 * `createTask` for a line the person typed: the same task, then one offer at a time — a local dossier that matches the
 * title (resume-dossiers D6, no model), else, when the device asks for it, a card proposing a list (classify-after-add),
 * else a suggestion in the assistant panel (suggest-after-add).
 */
export async function createTaskThenSuggest(input: NewTaskInput): Promise<string> {
  const id = await createTask(input)
  void followUpAfterAdd(id, input.title)
  return id
}
