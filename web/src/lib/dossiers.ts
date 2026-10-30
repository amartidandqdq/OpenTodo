// Dossier writes (OpenSpec change resume-dossiers): every change is one batch of
// field ops, applied locally first and queued for sync, with the standard Undo
// inverse. The dossier is personal; the tasks it names keep their own scope and
// are never written here except by the ordinary completion path in the screen.
import { createStore } from './store'
import { resettable } from './moduleState'
import { db } from './db'
import { uuid } from './ids'
import { getDeviceId, mutationTables, planTask } from './ops'
import { applyBatch, type BatchOptions } from './undo'
import { t } from './i18n'
import { canEditTasks, membershipMap, roleOf } from './sharing'
import { visibleTaskSets } from './trash'
import { Partition, readWorkspaceState, workspaceFields } from './workspaces'
import type { ProposedChange } from './assistantTypes'
import type { Dossier, Review, Task } from './types'
import { DOSSIER_FOCUS_MAX, DOSSIER_TASK_MAX, focusDossierIds, suggestDossiers } from './dossierModel'
import { REVIEW_ID } from './review'

const ACTION: BatchOptions = { source: 'action' }

/** Serialize the stored read, field write and inverse across overlapping actions. */
async function dossierWrite<T>(write: () => Promise<T>): Promise<T> {
  await getDeviceId()
  return db.transaction('rw', [...mutationTables(), db.assistantUndo, db.workspaces, db.memberships], write)
}

/** The stored order, tolerant of a row written by a newer or damaged client. */
function orderOf(dossier: Pick<Dossier, 'task_ids'>): string[] {
  if (!Array.isArray(dossier.task_ids)) return []
  const seen = new Set<string>()
  return dossier.task_ids.filter((id): id is string => {
    if (typeof id !== 'string' || id === '' || seen.has(id)) return false
    seen.add(id)
    return true
  })
}

/** A real calendar date in YYYY-MM-DD form (the op schema's kDate). */
function calendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [y, m, d] = value.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d
}

/** Empty is no follow-up; anything else must be a real date, so the server cannot refuse it later. */
function followUpDate(value: string | null | undefined): string | null {
  if (value === undefined || value === null) return null
  const date = value.trim()
  if (!date) return null
  if (!calendarDate(date)) throw new Error(t('Choose a valid follow-up date.'))
  return date
}

/** A dossier row that exists and is not a tombstone. */
async function liveDossier(id: string): Promise<Dossier> {
  const dossier = await db.dossiers.get(id)
  if (!dossier || dossier.deleted_at) throw new Error(t('This dossier is no longer there.'))
  // A dossier belongs to one workspace: a stale id from another one is not
  // editable here, and removing its members against this workspace's tasks would
  // be wrong.
  const state = await readWorkspaceState()
  if (state.list.length > 1) {
    const partition = new Partition(state.defaultId, state.list.map((w) => w.id))
    if (partition.own(dossier.workspace_id) !== partition.own(state.current)) throw new Error(t('This dossier is in another workspace.'))
  }
  return dossier
}

/** Creates an empty dossier and returns its id and the Undo entry. */
export async function createDossier(title: string, note = ''): Promise<{ id: string; entry: Awaited<ReturnType<typeof applyBatch>> }> {
  const name = title.trim()
  if (!name) throw new Error(t('Please enter a name'))
  const id = uuid()
  const now = Date.now()
  const ws = await workspaceFields()
  const change: ProposedChange = {
    entity: 'dossier', entityId: id, create: true,
    patch: { title: name, note: note.trim(), task_ids: [], waiting: false, waiting_for: '', follow_up: null, ...ws, position: now, created_at: now, deleted_at: null },
  }
  const entry = await applyBatch([change], { ...ACTION, label: t('Dossier created') })
  return { id, entry }
}

/** Renames a dossier or changes its note; one undoable batch. */
export async function updateDossier(id: string, patch: Partial<Pick<Dossier, 'title' | 'note'>>): Promise<Awaited<ReturnType<typeof applyBatch>>> {
  return dossierWrite(async () => {
    const dossier = await liveDossier(id)
    const next: Record<string, unknown> = {}
    if (patch.title !== undefined) {
      const title = patch.title.trim()
      if (!title) throw new Error(t('Please enter a name'))
      if (title !== dossier.title) next.title = title
    }
    if (patch.note !== undefined) {
      const note = patch.note.trim()
      if (note !== (dossier.note ?? '')) next.note = note
    }
    if (Object.keys(next).length === 0) return null
    return applyBatch([{ entity: 'dossier', entityId: id, patch: next }], { ...ACTION, label: t('Dossier updated') })
  })
}

/** Deletes a dossier (a tombstone, restorable by Undo). */
export async function deleteDossier(id: string): Promise<Awaited<ReturnType<typeof applyBatch>>> {
  return dossierWrite(async () => {
    await liveDossier(id)
    return applyBatch([{ entity: 'dossier', entityId: id, patch: { deleted_at: Date.now() } }], { ...ACTION, label: t('Dossier deleted') })
  })
}

/**
 * Whether a task may become a step of a dossier that already holds `ids`: a live,
 * open task of this workspace that the person may edit, with room in the thread.
 * Runs inside the dossier write, so the reads are the ones the write is based on.
 */
async function checkAttachable(task: Task | undefined, ids: readonly string[]): Promise<void> {
  if (!task || task.deleted_at) throw new Error(t('This task is no longer there.'))
  if (task.completed_at) throw new Error(t('A completed task cannot be added to a dossier.'))
  // The task must still be visible in the current workspace: a deleted project, a
  // project the person left, and another workspace all remove it from this set.
  const { here } = await visibleTaskSets()
  if (!here.some((row) => row.id === task.id)) throw new Error(t('This task is no longer available.'))
  const [project, memberships] = await Promise.all([
    task.project_id ? db.projects.get(task.project_id) : Promise.resolve(undefined),
    membershipMap(),
  ])
  if (task.project_id && !project) throw new Error(t('This task is no longer available.'))
  if (project?.archived) throw new Error(t('This task is in an archived project.'))
  if (!canEditTasks(roleOf(task.project_id, memberships))) throw new Error(t('This task is read-only.'))
  if (ids.length >= DOSSIER_TASK_MAX) throw new Error(t('A dossier holds at most {n} tasks.', { n: DOSSIER_TASK_MAX }))
}

/**
 * Attaches a live, open task of this workspace that the person may edit, at the
 * end of the dossier's order. The task itself is never written.
 */
export async function attachTaskToDossier(dossierId: string, taskId: string): Promise<Awaited<ReturnType<typeof applyBatch>>> {
  return dossierWrite(async () => {
    const [dossier, task] = await Promise.all([liveDossier(dossierId), db.tasks.get(taskId)])
    const ids = orderOf(dossier)
    if (ids.includes(taskId)) return null
    await checkAttachable(task, ids)
    return applyBatch([{ entity: 'dossier', entityId: dossierId, patch: { task_ids: [...ids, taskId] } }],
      { ...ACTION, label: t('{task} added to {dossier}', { task: task!.title, dossier: dossier.title }) })
  })
}

/**
 * Creates a dossier whose only step is an existing task, in one undoable batch:
 * the task is checked as attachTaskToDossier checks it, and is not written.
 */
export async function createDossierWithTask(title: string, taskId: string): Promise<{ id: string; entry: Awaited<ReturnType<typeof applyBatch>> }> {
  const name = title.trim()
  if (!name) throw new Error(t('Please enter a name'))
  const id = uuid()
  const now = Date.now()
  const ws = await workspaceFields()
  return dossierWrite(async () => {
    const task = await db.tasks.get(taskId)
    await checkAttachable(task, [])
    const change: ProposedChange = {
      entity: 'dossier', entityId: id, create: true,
      patch: { title: name, note: '', task_ids: [taskId], waiting: false, waiting_for: '', follow_up: null, ...ws, position: now, created_at: now, deleted_at: null },
    }
    const entry = await applyBatch([change], { ...ACTION, label: t('{task} added to {dossier}', { task: task!.title, dossier: name }) })
    return { id, entry }
  })
}

/** Creates and attaches an Inbox task in one undoable batch. */
export async function createTaskInDossier(dossierId: string, title: string): Promise<Awaited<ReturnType<typeof applyBatch>>> {
  const name = title.trim()
  if (!name) throw new Error(t('Please enter a title'))
  const { id, change } = await planTask({ title: name })
  return dossierWrite(async () => {
    const dossier = await liveDossier(dossierId)
    const ids = orderOf(dossier)
    if (ids.length >= DOSSIER_TASK_MAX) throw new Error(t('A dossier holds at most {n} tasks.', { n: DOSSIER_TASK_MAX }))
    return applyBatch([{ ...change, create: true }, { entity: 'dossier', entityId: dossierId, patch: { task_ids: [...ids, id] } }],
      { ...ACTION, label: t('{task} added to {dossier}', { task: name, dossier: dossier.title }) })
  })
}

/** Removes one task from the order; the task itself is untouched. */
export async function detachTaskFromDossier(dossierId: string, taskId: string): Promise<Awaited<ReturnType<typeof applyBatch>>> {
  return dossierWrite(async () => {
    const dossier = await liveDossier(dossierId)
    const ids = orderOf(dossier)
    if (!ids.includes(taskId)) return null
    const task = await db.tasks.get(taskId)
    return applyBatch([{ entity: 'dossier', entityId: dossierId, patch: { task_ids: ids.filter((id) => id !== taskId) } }],
      { ...ACTION, label: t('{task} removed from {dossier}', { task: task?.title ?? t('Task'), dossier: dossier.title }) })
  })
}

/**
 * Removes ids that no longer resolve to a visible task, in one undoable batch;
 * never runs on its own. A caller-supplied id that turned out live again is kept.
 */
export async function removeUnavailableDossierTasks(dossierId: string, unavailable?: readonly string[]): Promise<Awaited<ReturnType<typeof applyBatch>>> {
  return dossierWrite(async () => {
    const dossier = await liveDossier(dossierId)
    const ids = orderOf(dossier)
    if (ids.length === 0) return null
    const { here } = await visibleTaskSets()
    const visible = new Set(here.map((task) => task.id))
    const candidates = unavailable ?? ids.filter((id) => !visible.has(id))
    const gone = new Set(candidates.filter((id) => !visible.has(id)))
    const next = ids.filter((id) => !gone.has(id))
    if (next.length === ids.length) return null
    return applyBatch([{ entity: 'dossier', entityId: dossierId, patch: { task_ids: next } }],
      { ...ACTION, label: t('Unavailable tasks removed') })
  })
}

/** Moves one task one place up (-1) or down (+1) in the order. */
export async function moveDossierTask(dossierId: string, taskId: string, delta: -1 | 1): Promise<Awaited<ReturnType<typeof applyBatch>>> {
  return dossierWrite(async () => {
    if (delta !== -1 && delta !== 1) return null
    const dossier = await liveDossier(dossierId)
    const ids = [...orderOf(dossier)]
    const at = ids.indexOf(taskId)
    const { here } = await visibleTaskSets()
    const visible = new Set(here.map((task) => task.id))
    if (at < 0 || !visible.has(taskId)) return null
    let to = at + delta
    while (to >= 0 && to < ids.length && !visible.has(ids[to])) to += delta
    if (to < 0 || to >= ids.length) return null
    ;[ids[at], ids[to]] = [ids[to], ids[at]]
    return applyBatch([{ entity: 'dossier', entityId: dossierId, patch: { task_ids: ids } }], { ...ACTION, label: t('Dossier order changed') })
  })
}

/** The order with `id` taken out and put just before or after `target`; null when that changes nothing. */
export function placeStep(order: readonly string[], id: string, target: string, zone: 'before' | 'after'): string[] | null {
  if (id === target || !order.includes(id) || !order.includes(target)) return null
  const rest = order.filter((x) => x !== id)
  rest.splice(rest.indexOf(target) + (zone === 'after' ? 1 : 0), 0, id)
  return rest.every((x, i) => x === order[i]) ? null : rest
}

/** Drops one step before or after another (drag and drop); steps hidden from this view keep their places. */
export async function placeDossierTask(dossierId: string, taskId: string, targetId: string, zone: 'before' | 'after'): Promise<Awaited<ReturnType<typeof applyBatch>>> {
  return dossierWrite(async () => {
    const dossier = await liveDossier(dossierId)
    const { here } = await visibleTaskSets()
    const visible = new Set(here.map((task) => task.id))
    if (!visible.has(taskId) || !visible.has(targetId)) return null
    const ids = placeStep(orderOf(dossier), taskId, targetId, zone)
    if (!ids) return null
    return applyBatch([{ entity: 'dossier', entityId: dossierId, patch: { task_ids: ids } }], { ...ACTION, label: t('Dossier order changed') })
  })
}

/** Puts the thread on hold; only dossier fields are written. */
export async function setDossierWaiting(dossierId: string, waitingFor: string, followUp: string | null): Promise<Awaited<ReturnType<typeof applyBatch>>> {
  return dossierWrite(async () => {
    const dossier = await liveDossier(dossierId)
    const text = waitingFor.trim()
    if (!text) throw new Error(t('Say what you are waiting for'))
    const date = followUpDate(followUp)
    if (dossier.waiting && dossier.waiting_for === text && (dossier.follow_up ?? null) === date) return null
    return applyBatch([{ entity: 'dossier', entityId: dossierId, patch: { waiting: true, waiting_for: text, follow_up: date } }],
      { ...ACTION, label: t('{dossier} is on hold', { dossier: dossier.title }) })
  })
}

/** Changes only the follow-up date of a dossier already on hold. */
export async function setDossierFollowUp(dossierId: string, followUp: string | null): Promise<Awaited<ReturnType<typeof applyBatch>>> {
  return dossierWrite(async () => {
    const dossier = await liveDossier(dossierId)
    const date = followUpDate(followUp)
    // A follow-up without a hold would be invisible in Waiting: hold first.
    if (!dossier.waiting) return null
    if ((dossier.follow_up ?? null) === date) return null
    return applyBatch([{ entity: 'dossier', entityId: dossierId, patch: { follow_up: date } }], { ...ACTION, label: t('Follow-up date changed') })
  })
}

/** Resumes a thread: clears the hold and its follow-up date, nothing on a task. */
export async function resumeDossier(dossierId: string): Promise<Awaited<ReturnType<typeof applyBatch>>> {
  return dossierWrite(async () => {
    const dossier = await liveDossier(dossierId)
    // Clear a partial hold too (an older row may carry only the date): resuming is
    // the one action that puts the three fields back to their empty state.
    if (!dossier.waiting && !dossier.waiting_for && !dossier.follow_up) return null
    return applyBatch([{ entity: 'dossier', entityId: dossierId, patch: { waiting: false, waiting_for: '', follow_up: null } }],
      { ...ACTION, label: t('{dossier} resumed', { dossier: dossier.title }) })
  })
}

/**
 * Adds or removes a dossier from today's focus; 'full' when it would be a fourth.
 * One undoable batch; the day it is chosen on decides whether the task focus is
 * kept (same day) or cleared (a selection from yesterday must not come back).
 */
export async function toggleDossierFocus(review: Pick<Review, 'focus_date' | 'focus_dossiers' | 'focus'> | null | undefined, today: string, dossiers: readonly Dossier[], id: string): Promise<'added' | 'removed' | 'full'> {
  return dossierWrite(async () => {
    // Read the stored row so two quick clicks, or a click while the snapshot is
    // loading, cannot act on an older selection and wipe the other kind's focus.
    // The passed row is only a fallback for a store with no review row yet.
    const row = (await db.review.get(REVIEW_ID)) ?? review ?? null
    const live = new Set(dossiers.filter((d) => !d.deleted_at).map((d) => d.id))
    if (!live.has(id)) throw new Error(t('This dossier is no longer there.'))
    const sameDay = row?.focus_date === today
    const current = focusDossierIds(row, today, dossiers)
    const base = { focus_date: row?.focus_date ?? '', focus: row?.focus ?? '', focus_dossiers: row?.focus_dossiers ?? [] }
    if (current.includes(id)) {
      await applyBatch([{ entity: 'review', entityId: REVIEW_ID, base, patch: { focus_date: today, focus_dossiers: current.filter((x) => x !== id) } }],
        { ...ACTION, label: t('{dossier} left today’s focus.', { dossier: dossiers.find((d) => d.id === id)?.title ?? '' }) })
      return 'removed'
    }
    if (current.length >= DOSSIER_FOCUS_MAX) return 'full'
    // A selection from another day must not resurrect the old task focus.
    await applyBatch([{ entity: 'review', entityId: REVIEW_ID, base, patch: { focus_date: today, focus_dossiers: [...current, id], ...(sameDay ? {} : { focus: '' }) } }],
      { ...ACTION, label: t('{dossier} is in today’s focus.', { dossier: dossiers.find((d) => d.id === id)?.title ?? '' }) })
    return 'added'
  })
}

/** The capture offer: the task is already created, only the attach is waiting for a choice. */
export interface DossierLinkOffer {
  key: number
  taskId: string
  title: string
  candidateIds: string[]
}

const offer = createStore<DossierLinkOffer | null>('dossierLinkOffer', null)
let seq = 0
resettable('dossierLinkOfferSeq', () => { seq = 0 })
export const dossierLinkOffer = offer.get
export const useDossierLinkOffer = offer.use

/** Offers the local match, if any; returns whether a card was shown. Never writes. */
export function offerDossierLink(taskId: string, title: string, dossiers: readonly Dossier[], tasks: readonly Task[]): boolean {
  const name = title.trim()
  if (!name) return false
  const matches = suggestDossiers(name, dossiers, tasks)
  if (matches.length === 0) return false
  offer.set({ key: ++seq, taskId, title: name, candidateIds: [...new Set(matches.map((d) => d.id))] })
  return true
}

export function hideDossierLinkOffer(key?: number): void {
  if (key === undefined || offer.get()?.key === key) offer.set(null)
}
