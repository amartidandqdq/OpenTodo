// Dossier writes (OpenSpec change resume-dossiers, task 2.4): the persisted
// dossier row, its one-batch ops, the standard Undo inverse, offline reload,
// attachment choices and the focus row shared with tasks. The tasks themselves
// keep their list, due date, labels, priority and completion state.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db, useDatabase } from './db'
import { applyOps, createProject, createTask, deleteProject, deleteTask, mutate, resetDeviceId, updateTask } from './ops'
import { completeUndoable } from './undoActions'
import { undoBatch } from './undo'
import { ownIn, readWorkspaceState, storeWorkspaces, switchTo } from './workspaces'
import { toggleFocus } from './review'
import {
  attachTaskToDossier, createDossier, deleteDossier, detachTaskFromDossier, dossierLinkOffer, hideDossierLinkOffer,
  moveDossierTask, offerDossierLink, removeUnavailableDossierTasks, resumeDossier, setDossierFollowUp, setDossierWaiting,
  toggleDossierFocus, updateDossier,
} from './dossiers'
import { DOSSIER_TASK_MAX, dossierState } from './dossierModel'
import type { Dossier, Membership, Op, Task, WorkspaceEntry } from './types'

const TODAY = '2026-10-29'
const YESTERDAY = '2026-10-28'

it('preserves both overlapping attachments and their individual undo entries', async () => {
  const { id } = await createDossier('Concurrent attachments')
  const a = await createTask({ title: 'First step' })
  const b = await createTask({ title: 'Second step' })
  const entries = await Promise.all([attachTaskToDossier(id, a), attachTaskToDossier(id, b)])
  expect((await db.dossiers.get(id))?.task_ids).toEqual([a, b])
  await undoBatch(entries[1]!.id)
  expect((await db.dossiers.get(id))?.task_ids).toEqual([a])
})

let n = 0
let databaseName = ''
beforeEach(() => {
  databaseName = `dossiers-${Date.now()}-${n++}`
  useDatabase(databaseName)
  resetDeviceId()
})

async function dossierRow(id: string): Promise<Dossier> {
  const row = await db.dossiers.get(id)
  expect(row).toBeTruthy()
  return row as Dossier
}

async function taskRow(id: string): Promise<Task> {
  const row = await db.tasks.get(id)
  expect(row).toBeTruthy()
  return row as Task
}

async function snapshotTasks(ids: readonly string[]): Promise<Task[]> {
  return Promise.all(ids.map((id) => taskRow(id)))
}

function workspaceEntry(id: string, extra: Partial<WorkspaceEntry> = {}): WorkspaceEntry {
  return {
    id, name: id, icon: '', color: '', default: false, role: 'owner', ownerId: 'me', members: [], groups: [], ...extra,
  }
}

const membership = (projectId: string, role: Membership['role']): Membership => ({
  projectId, role, ownerId: 'me',
  members: [{ userId: 'me', name: 'Me', email: 'me@example.test', role }],
})

async function seedTasks(count: number): Promise<string[]> {
  const ids = Array.from({ length: count }, (_, i) => `t${i}`)
  const ops: Op[] = ids.map((id, i) => ({
    id: `seed-${i}`, entity: 'task' as const, entityId: id, field: 'title', value: `Seeded ${i}`, ts: 1000 + i, device: 'seed',
  }))
  await applyOps(ops)
  return ids
}

describe('creating a dossier', () => {
  it('writes the personal row in one offline batch, persists its defaults and Undo trashes it', async () => {
    await expect(createDossier('   ')).rejects.toThrow()
    expect(await db.dossiers.count()).toBe(0)

    const { id, entry } = await createDossier('  Kitchen  ', '  Quotes from two fitters  ')
    const row = await dossierRow(id)
    expect(row).toMatchObject({
      title: 'Kitchen', note: 'Quotes from two fitters', task_ids: [], waiting: false, waiting_for: '', follow_up: null,
      workspace_id: null, deleted_at: null,
    })
    expect(row.created_at).toBeGreaterThan(0)
    expect(row.position).toBeGreaterThan(0)
    expect(entry).toMatchObject({ source: 'action' })

    const ops = (await db.outbox.toArray()).filter((op) => op.entity === 'dossier' && op.entityId === id)
    expect(new Set(ops.map((op) => op.field))).toEqual(new Set([
      'title', 'note', 'task_ids', 'waiting', 'waiting_for', 'follow_up', 'position', 'created_at', 'deleted_at',
    ]))
    expect(new Set(ops.map((op) => `${op.ts}|${op.device}`)).size).toBe(1)

    await undoBatch(entry?.id as string)
    expect((await dossierRow(id)).deleted_at).toBeTruthy()
    expect(await db.dossiers.count()).toBe(1)
    await expect(updateDossier(id, { title: 'Gone' })).rejects.toThrow()
  })

  it('keeps the row and its queued ops through a reload, with no network request', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const { id } = await createDossier('Tyres')
    const order = await createTask({ title: 'Order the tyres' })
    const book = await createTask({ title: 'Book the fitting' })
    await attachTaskToDossier(id, order)
    await attachTaskToDossier(id, book)
    await setDossierWaiting(id, 'the delivery', '2026-11-02')
    const queued = await db.outbox.count()

    db.close()
    useDatabase(databaseName)
    resetDeviceId()

    const row = await dossierRow(id)
    expect(row.task_ids).toEqual([order, book])
    expect(row).toMatchObject({ waiting: true, waiting_for: 'the delivery', follow_up: '2026-11-02' })
    expect((await db.outbox.count())).toBe(queued)
    const tasks = await db.tasks.toArray()
    expect(dossierState(row, tasks).next?.id).toBe(order)
    expect(fetchSpy).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
  })
})

describe('renaming and deleting', () => {
  it('renames and notes in one undoable batch, trims the values and writes nothing for a no-op', async () => {
    const { id } = await createDossier('Kitchen', 'Before')
    await db.outbox.clear()

    const changed = await updateDossier(id, { title: '  Kitchen and hall  ', note: '  Two rooms  ' })
    expect(await dossierRow(id)).toMatchObject({ title: 'Kitchen and hall', note: 'Two rooms' })
    expect(changed).toMatchObject({ source: 'action' })
    expect((await db.outbox.toArray()).map((op) => op.field).sort()).toEqual(['note', 'title'])

    await undoBatch(changed?.id as string)
    expect(await dossierRow(id)).toMatchObject({ title: 'Kitchen', note: 'Before' })

    await db.outbox.clear()
    expect(await updateDossier(id, { title: 'Kitchen', note: 'Before' })).toBeNull()
    expect(await db.outbox.count()).toBe(0)
    await expect(updateDossier(id, { title: '   ' })).rejects.toThrow()
    expect(await dossierRow(id)).toMatchObject({ title: 'Kitchen', note: 'Before' })
  })

  it('deletes by tombstone, leaves member tasks alone, and Undo restores the dossier', async () => {
    const taskId = await createTask({ title: 'Get three quotes', due: { date: '2026-11-01' } })
    const { id } = await createDossier('Kitchen')
    await attachTaskToDossier(id, taskId)
    const before = await taskRow(taskId)
    await db.outbox.clear()

    const removed = await deleteDossier(id)
    expect((await dossierRow(id)).deleted_at).toBeTruthy()
    expect(await taskRow(taskId)).toEqual(before)
    expect((await db.outbox.toArray()).map((op) => [op.entity, op.field])).toEqual([['dossier', 'deleted_at']])
    await expect(attachTaskToDossier(id, taskId)).rejects.toThrow()

    await undoBatch(removed?.id as string)
    expect((await dossierRow(id)).deleted_at).toBeNull()
    expect((await dossierRow(id)).task_ids).toEqual([taskId])
  })
})

describe('attaching, detaching and ordering', () => {
  it('appends live tasks from two lists in the chosen order and writes only task_ids', async () => {
    const home = await createProject({ name: 'Home' })
    const errands = await createProject({ name: 'Errands' })
    const quotes = await createTask({ title: 'Get three quotes', project_id: home, due: { date: '2026-11-01' }, priority: 2, labels: ['calls'] })
    const fitters = await createTask({ title: 'Book the fitters', project_id: errands, labels: ['errands'] })
    const { id } = await createDossier('Kitchen')
    const before = await snapshotTasks([quotes, fitters])
    await db.outbox.clear()

    await attachTaskToDossier(id, quotes)
    await attachTaskToDossier(id, fitters)
    expect(await attachTaskToDossier(id, quotes)).toBeNull()

    const row = await dossierRow(id)
    expect(row.task_ids).toEqual([quotes, fitters])
    expect(await snapshotTasks([quotes, fitters])).toEqual(before)
    expect((await taskRow(quotes)).project_id).toBe(home)
    expect((await taskRow(fitters)).project_id).toBe(errands)
    const written = await db.outbox.toArray()
    expect(written.map((op) => [op.entity, op.entityId, op.field, op.value])).toEqual([
      ['dossier', id, 'task_ids', [quotes]],
      ['dossier', id, 'task_ids', [quotes, fitters]],
    ])
    expect(dossierState(row, await db.tasks.toArray()).next?.id).toBe(quotes)
  })

  it('detaches a step without touching its task, and Undo puts the step back', async () => {
    const a = await createTask({ title: 'A' })
    const b = await createTask({ title: 'B' })
    const { id } = await createDossier('Thread')
    await attachTaskToDossier(id, a)
    await attachTaskToDossier(id, b)
    const before = await taskRow(a)
    await db.outbox.clear()

    const removed = await detachTaskFromDossier(id, a)
    expect((await dossierRow(id)).task_ids).toEqual([b])
    expect(await taskRow(a)).toEqual(before)
    expect((await db.outbox.toArray()).map((op) => [op.entity, op.field, op.value])).toEqual([['dossier', 'task_ids', [b]]])

    await undoBatch(removed?.id as string)
    expect((await dossierRow(id)).task_ids).toEqual([a, b])
  })

  it('rejects a completed, deleted, unknown or read-only-project task without a write', async () => {
    const { id } = await createDossier('Thread')
    const done = await createTask({ title: 'Done' })
    await updateTask(done, { completed_at: 5000 })
    const deleted = await createTask({ title: 'Deleted' })
    await deleteTask(deleted)
    await db.outbox.clear()

    for (const taskId of [done, deleted, 'missing']) {
      await expect(attachTaskToDossier(id, taskId)).rejects.toThrow()
    }
    expect((await dossierRow(id)).task_ids).toEqual([])
    expect(await db.outbox.count()).toBe(0)

    // A task in a shared project the person can only view would make the dossier's
    // completion actions impossible, so it is not attachable (design D2).
    const readonly = await createProject({ name: 'Shared' })
    const viewOnly = await createTask({ title: 'Someone else’s task', project_id: readonly })
    await db.memberships.put(membership(readonly, 'viewer'))
    await db.outbox.clear()
    await expect(attachTaskToDossier(id, viewOnly)).rejects.toThrow()
    expect((await dossierRow(id)).task_ids).toEqual([])

    // An editor on the same shared project is allowed.
    const editableProject = await createProject({ name: 'Editable shared' })
    const editable = await createTask({ title: 'Our task', project_id: editableProject })
    await db.memberships.put(membership(editableProject, 'editor'))
    await attachTaskToDossier(id, editable)
    expect((await dossierRow(id)).task_ids).toEqual([editable])
  })

  it('rejects a task whose project is in the Trash, even though the task row is live', async () => {
    const project = await createProject({ name: 'Old list' })
    const taskId = await createTask({ title: 'Still visible to rows?', project_id: project })
    await deleteProject(project)
    const { id } = await createDossier('Thread')
    await db.outbox.clear()

    expect((await taskRow(taskId)).deleted_at).toBeNull()
    await expect(attachTaskToDossier(id, taskId)).rejects.toThrow()
    expect((await dossierRow(id)).task_ids).toEqual([])
    expect(await db.outbox.count()).toBe(0)
  })

  it('caps the order at DOSSIER_TASK_MAX and only accepts another step once one is detached', async () => {
    const ids = await seedTasks(DOSSIER_TASK_MAX + 1)
    const { id } = await createDossier('Full thread')
    await mutate('dossier', id, { task_ids: ids.slice(0, DOSSIER_TASK_MAX) })
    await db.outbox.clear()

    await expect(attachTaskToDossier(id, ids[DOSSIER_TASK_MAX])).rejects.toThrow()
    expect((await dossierRow(id)).task_ids).toHaveLength(DOSSIER_TASK_MAX)
    expect(await db.outbox.count()).toBe(0)

    await detachTaskFromDossier(id, ids[0])
    await attachTaskToDossier(id, ids[DOSSIER_TASK_MAX])
    const row = await dossierRow(id)
    expect(row.task_ids).toHaveLength(DOSSIER_TASK_MAX)
    expect(row.task_ids.at(-1)).toBe(ids[DOSSIER_TASK_MAX])
    expect(row.task_ids).not.toContain(ids[0])
    // The detached task is still a real task.
    expect((await taskRow(ids[0])).deleted_at).toBeNull()
  })

  it('moves one step at a time, refuses the ends, and Undo restores the previous order', async () => {
    const a = await createTask({ title: 'A' })
    const b = await createTask({ title: 'B' })
    const c = await createTask({ title: 'C' })
    const { id } = await createDossier('Thread')
    for (const taskId of [a, b, c]) await attachTaskToDossier(id, taskId)
    const before = await snapshotTasks([a, b, c])
    await db.outbox.clear()

    const moved = await moveDossierTask(id, b, -1)
    expect((await dossierRow(id)).task_ids).toEqual([b, a, c])
    expect((await db.outbox.toArray()).map((op) => [op.entity, op.field, op.value])).toEqual([['dossier', 'task_ids', [b, a, c]]])
    await undoBatch(moved?.id as string)
    expect((await dossierRow(id)).task_ids).toEqual([a, b, c])

    await db.outbox.clear()
    expect(await moveDossierTask(id, a, -1)).toBeNull()
    expect(await moveDossierTask(id, c, 1)).toBeNull()
    expect(await moveDossierTask(id, 'missing', 1)).toBeNull()
    expect(await db.outbox.count()).toBe(0)
    expect(await snapshotTasks([a, b, c])).toEqual(before)
  })

  it('keeps a deleted member in the order until an explicit cleanup, which Undo reverses', async () => {
    const a = await createTask({ title: 'A' })
    const b = await createTask({ title: 'B' })
    const c = await createTask({ title: 'C' })
    const { id } = await createDossier('Thread')
    for (const taskId of [a, b, c]) await attachTaskToDossier(id, taskId)
    await db.outbox.clear()

    await deleteTask(b)
    const row = await dossierRow(id)
    expect(row.task_ids).toEqual([a, b, c])
    expect((await db.outbox.toArray()).filter((op) => op.entity === 'dossier')).toEqual([])
    const state = dossierState(row, await db.tasks.toArray())
    expect(state.tasks.map((x) => x.id)).toEqual([a, c])
    expect(state.unavailable).toEqual([b])
    expect(state.next?.id).toBe(a)

    await db.outbox.clear()
    expect(await removeUnavailableDossierTasks(id, ['not-in-the-order'])).toBeNull()
    expect(await db.outbox.count()).toBe(0)
    const cleaned = await removeUnavailableDossierTasks(id, state.unavailable)
    expect((await dossierRow(id)).task_ids).toEqual([a, c])
    await undoBatch(cleaned?.id as string)
    expect((await dossierRow(id)).task_ids).toEqual([a, b, c])
    expect((await taskRow(b)).deleted_at).toBeTruthy()
  })
})

describe('waiting is its own state', () => {
  it('holds a thread without touching a member due date, and resume clears the whole hold', async () => {
    const taskId = await createTask({ title: 'Order the tyres', due: { date: YESTERDAY }, priority: 2, labels: ['car'] })
    const { id } = await createDossier('Tyres')
    await attachTaskToDossier(id, taskId)
    const before = await taskRow(taskId)
    await db.outbox.clear()

    const held = await setDossierWaiting(id, '  the delivery  ', '2026-11-02')
    expect(await dossierRow(id)).toMatchObject({ waiting: true, waiting_for: 'the delivery', follow_up: '2026-11-02' })
    expect(await taskRow(taskId)).toEqual(before)
    expect((await db.outbox.toArray()).map((op) => [op.entity, op.field]).sort()).toEqual([
      ['dossier', 'follow_up'], ['dossier', 'waiting'], ['dossier', 'waiting_for'],
    ])
    expect(dossierState(await dossierRow(id), [await taskRow(taskId)])).toMatchObject({ waiting: true, next: expect.objectContaining({ id: taskId }) })
    expect(held).toMatchObject({ source: 'action' })

    await db.outbox.clear()
    const resumed = await resumeDossier(id)
    expect(await dossierRow(id)).toMatchObject({ waiting: false, waiting_for: '', follow_up: null })
    expect(await taskRow(taskId)).toEqual(before)
    await undoBatch(resumed?.id as string)
    expect(await dossierRow(id)).toMatchObject({ waiting: true, waiting_for: 'the delivery', follow_up: '2026-11-02' })
    expect(await taskRow(taskId)).toEqual(before)

    await db.outbox.clear()
    await expect(setDossierWaiting(id, '   ', '2026-11-03')).rejects.toThrow()
    expect(await db.outbox.count()).toBe(0)
    expect(await dossierRow(id)).toMatchObject({ waiting: true, waiting_for: 'the delivery', follow_up: '2026-11-02' })
    await expect(setDossierWaiting(id, 'the delivery', '2026-02-30')).rejects.toThrow()
    expect(await db.outbox.count()).toBe(0)
    expect(await dossierRow(id)).toMatchObject({ waiting: true, waiting_for: 'the delivery', follow_up: '2026-11-02' })
    await resumeDossier(id)
    await db.outbox.clear()
    expect(await resumeDossier(id)).toBeNull()
    expect(await db.outbox.count()).toBe(0)
  })

  it('changes only the follow-up date and keeps the hold and the tasks untouched', async () => {
    const taskId = await createTask({ title: 'Wait for parts', due: { date: '2026-11-01' } })
    const { id } = await createDossier('Parts')
    await attachTaskToDossier(id, taskId)
    await setDossierWaiting(id, 'the parts', '2026-11-02')
    const before = await taskRow(taskId)
    await db.outbox.clear()

    await setDossierFollowUp(id, '2026-11-05')
    expect(await dossierRow(id)).toMatchObject({ waiting: true, waiting_for: 'the parts', follow_up: '2026-11-05' })
    expect((await db.outbox.toArray()).map((op) => [op.field, op.value])).toEqual([['follow_up', '2026-11-05']])
    expect(await taskRow(taskId)).toEqual(before)
    expect(await setDossierFollowUp(id, '2026-11-05')).toBeNull()
    expect(await db.outbox.count()).toBe(1)
    await setDossierFollowUp(id, null)
    expect(await dossierRow(id)).toMatchObject({ waiting: true, follow_up: null })
    expect(await taskRow(taskId)).toEqual(before)
  })
})

describe('derived progress follows the ordinary task paths', () => {
  it('advances when the current step is completed and Undo reopens the step before it', async () => {
    const a = await createTask({ title: 'First' })
    const b = await createTask({ title: 'Second' })
    const { id } = await createDossier('Thread')
    await attachTaskToDossier(id, a)
    await attachTaskToDossier(id, b)
    await db.outbox.clear()

    const completed = await completeUndoable(a, true, { now: 5000 })
    expect(dossierState(await dossierRow(id), await db.tasks.toArray())).toMatchObject({ done: 1, total: 2 })
    expect(dossierState(await dossierRow(id), await db.tasks.toArray()).next?.id).toBe(b)
    expect((await dossierRow(id)).task_ids).toEqual([a, b])

    await undoBatch(completed.entry?.id as string)
    expect((await taskRow(a)).completed_at).toBeNull()
    expect(dossierState(await dossierRow(id), await db.tasks.toArray())).toMatchObject({ done: 0, total: 2 })
    expect(dossierState(await dossierRow(id), await db.tasks.toArray()).next?.id).toBe(a)
    expect((await db.outbox.toArray()).filter((op) => op.entity === 'dossier')).toEqual([])
  })

  it('advances after a completion from another device and moves back after a remote reopen, with no dossier write', async () => {
    const a = await createTask({ title: 'First' })
    const b = await createTask({ title: 'Second' })
    const { id } = await createDossier('Thread')
    await attachTaskToDossier(id, a)
    await attachTaskToDossier(id, b)
    const local = (await taskRow(a))._clock.completed_at
    await db.outbox.clear()

    await applyOps([{ id: 'remote-done', entity: 'task', entityId: a, field: 'completed_at', value: 9000, ts: local.ts + 1, device: 'tablet' }])
    expect(dossierState(await dossierRow(id), await db.tasks.toArray()).next?.id).toBe(b)
    await applyOps([{ id: 'remote-open', entity: 'task', entityId: a, field: 'completed_at', value: null, ts: local.ts + 2, device: 'tablet' }])
    expect(dossierState(await dossierRow(id), await db.tasks.toArray()).next?.id).toBe(a)
    expect((await db.outbox.toArray()).filter((op) => op.entity === 'dossier')).toEqual([])
  })
})

describe("today's focus on the shared review row", () => {
  it('adds and removes a dossier beside the task focus without rewriting the tasks', async () => {
    const d = await createDossier('Tyres')
    await mutate('review', 'me', { focus_date: TODAY, focus: 'task-1,task-2' })
    await db.outbox.clear()

    let review = await db.review.get('me')
    expect(await toggleDossierFocus(review, TODAY, [await dossierRow(d.id)], d.id)).toBe('added')
    review = await db.review.get('me')
    expect(review).toMatchObject({ focus_date: TODAY, focus_dossiers: [d.id], focus: 'task-1,task-2' })
    expect((await db.outbox.toArray()).map((op) => op.field)).toEqual(['focus_date', 'focus_dossiers'])

    await toggleDossierFocus(review, TODAY, [await dossierRow(d.id)], d.id)
    review = await db.review.get('me')
    expect(review).toMatchObject({ focus_date: TODAY, focus_dossiers: [], focus: 'task-1,task-2' })
  })

  it('holds three dossiers, writes nothing for a fourth, and keeps the task focus intact', async () => {
    const dossiers = [await createDossier('A'), await createDossier('B'), await createDossier('C'), await createDossier('D')]
    const rows = await db.dossiers.toArray()
    await mutate('review', 'me', { focus_date: TODAY, focus: 'task-1', focus_dossiers: [] })
    await db.outbox.clear()

    for (const d of dossiers.slice(0, 3)) await toggleDossierFocus(await db.review.get('me'), TODAY, rows, d.id)
    let review = await db.review.get('me')
    expect(review?.focus_dossiers).toEqual(dossiers.slice(0, 3).map((d) => d.id))
    expect(review?.focus).toBe('task-1')

    await db.outbox.clear()
    expect(await toggleDossierFocus(review, TODAY, rows, dossiers[3].id)).toBe('full')
    expect(await db.outbox.count()).toBe(0)
    expect((await db.review.get('me'))?.focus_dossiers).toEqual(dossiers.slice(0, 3).map((d) => d.id))

    expect(await toggleDossierFocus(review, TODAY, rows, dossiers[0].id)).toBe('removed')
    review = await db.review.get('me')
    expect(await toggleDossierFocus(review, TODAY, rows, dossiers[3].id)).toBe('added')
    expect((await db.review.get('me'))?.focus_dossiers).toEqual([dossiers[1].id, dossiers[2].id, dossiers[3].id])
    expect((await db.review.get('me'))?.focus).toBe('task-1')
  })

  it('clears yesterday\'s other kind in the same write, in both directions', async () => {
    const d1 = await createDossier('Yesterday')
    const d2 = await createDossier('Today')
    const rows = await db.dossiers.toArray()
    await mutate('review', 'me', { focus_date: YESTERDAY, focus: 'old-task', focus_dossiers: [d1.id] })
    await db.outbox.clear()

    let review = await db.review.get('me')
    expect(await toggleDossierFocus(review, TODAY, rows, d2.id)).toBe('added')
    review = await db.review.get('me')
    expect(review).toMatchObject({ focus_date: TODAY, focus: '', focus_dossiers: [d2.id] })
    let ops = await db.outbox.toArray()
    expect(new Set(ops.map((op) => op.field))).toEqual(new Set(['focus_date', 'focus', 'focus_dossiers']))
    expect(new Set(ops.map((op) => `${op.ts}|${op.device}`)).size).toBe(1)

    await mutate('review', 'me', { focus_date: YESTERDAY, focus: '', focus_dossiers: [d1.id] })
    await db.outbox.clear()
    review = await db.review.get('me')
    await toggleFocus(review, TODAY, [], 'task-today')
    review = await db.review.get('me')
    expect(review).toMatchObject({ focus_date: TODAY, focus: 'task-today', focus_dossiers: [] })
    ops = await db.outbox.toArray()
    expect(new Set(ops.map((op) => op.field))).toEqual(new Set(['focus_date', 'focus', 'focus_dossiers']))
    expect(new Set(ops.map((op) => `${op.ts}|${op.device}`)).size).toBe(1)
  })
})

describe('workspace and the local capture offer', () => {
  it('creates a dossier in the current workspace like a label', async () => {
    await storeWorkspaces([workspaceEntry('w-p', { default: true, name: 'Personal' }), workspaceEntry('w-work', { name: 'Work' })])
    await switchTo('w-work')
    const work = await createDossier('Work thread')
    expect((await dossierRow(work.id)).workspace_id).toBe('w-work')

    await switchTo('w-p')
    const home = await createDossier('Home thread')
    expect((await dossierRow(home.id)).workspace_id ?? null).toBeNull()
    const state = await readWorkspaceState()
    expect(ownIn(state, await db.dossiers.toArray()).map((d) => d.id)).toEqual([home.id])
  })

  it('offers a local match without a write, attaches only the confirmed dossier, and Undo removes it', async () => {
    const tyres = await createDossier('BMW tyres')
    const garage = await createDossier('Garage appointment')
    const taskId = await createTask({ title: 'BMW garage confirmed' })
    const dossiers = await db.dossiers.toArray()
    const tasks = await db.tasks.toArray()
    await db.outbox.clear()
    const fetchSpy = vi.spyOn(globalThis, 'fetch')

    expect(offerDossierLink(taskId, 'BMW garage confirmed', dossiers, tasks)).toBe(true)
    const offered = dossierLinkOffer()
    expect(offered).toMatchObject({ taskId, title: 'BMW garage confirmed' })
    expect(offered?.candidateIds).toEqual([tyres.id, garage.id])
    expect(await db.outbox.count()).toBe(0)
    expect((await dossierRow(tyres.id)).task_ids).toEqual([])
    expect((await dossierRow(garage.id)).task_ids).toEqual([])
    expect(fetchSpy).not.toHaveBeenCalled()

    hideDossierLinkOffer(offered?.key)
    expect(dossierLinkOffer()).toBeNull()
    expect(await db.outbox.count()).toBe(0)
    expect(offerDossierLink(taskId, 'BMW garage confirmed', dossiers, tasks)).toBe(true)
    const chosen = dossierLinkOffer()
    const attached = await attachTaskToDossier(chosen?.candidateIds[1] as string, taskId)
    expect((await dossierRow(garage.id)).task_ids).toEqual([taskId])
    expect((await dossierRow(tyres.id)).task_ids).toEqual([])
    await undoBatch(attached?.id as string)
    expect((await dossierRow(garage.id)).task_ids).toEqual([])
    expect(fetchSpy).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
  })
})
