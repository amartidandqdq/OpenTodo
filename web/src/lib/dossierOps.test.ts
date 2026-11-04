// Dossier writers (OpenSpec change resume-dossiers): create, rename, note,
// attach, detach, reorder, hold, resume, delete and today's focus. Every write
// goes through the op log, keeps an Undo inverse and never writes a task row.
import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db, entityTables, useDatabase } from './db'
import {
  attachTaskToDossier, createDossier, deleteDossier, detachTaskFromDossier,
  dossierLinkOffer, hideDossierLinkOffer, moveDossierTask, offerDossierLink, removeUnavailableDossierTasks,
  resumeDossier, setDossierFollowUp, setDossierWaiting, toggleDossierFocus, updateDossier,
} from './dossiers'
import { dossierState, suggestDossiers } from './dossierModel'
import { applyOps, completeTask, createProject, createTask, mutate, resetDeviceId, updateTask } from './ops'
import { undoBatch } from './undo'
import { storeWorkspaces, switchTo } from './workspaces'
import type { Dossier, WorkspaceEntry } from './types'

let n = 0
beforeEach(() => {
  useDatabase(`dossier-ops-${Date.now()}-${n++}`)
  resetDeviceId()
})

const TODAY = '2026-10-29'

async function seededTask(title: string, extra: Partial<Parameters<typeof createTask>[0]> = {}): Promise<string> {
  return createTask({ title, ...extra })
}

async function liveDossier(id: string): Promise<Dossier> {
  const row = await db.dossiers.get(id)
  if (!row) throw new Error('dossier missing')
  return row
}

async function beforeUndo(): Promise<Set<string>> {
  return new Set((await db.assistantUndo.toArray()).map((entry) => entry.id))
}

async function newUndo(before: Set<string>): Promise<string> {
  const entry = (await db.assistantUndo.toArray()).find((row) => !before.has(row.id))
  if (!entry) throw new Error('no undo entry was written')
  return entry.id
}

async function reviewRow() {
  return db.review.get('me')
}

describe('dossier lifecycle', () => {
  it('is a synced table and applies a remote dossier like any entity', async () => {
    expect(entityTables()).toContain(db.dossiers)
    await applyOps([
      { id: 'r1', entity: 'dossier', entityId: 'remote', field: 'title', value: 'Du téléphone', ts: 10, device: 'phone' },
      { id: 'r2', entity: 'dossier', entityId: 'remote', field: 'task_ids', value: ['t1'], ts: 10, device: 'phone' },
      { id: 'r3', entity: 'dossier', entityId: 'remote', field: 'waiting', value: true, ts: 10, device: 'phone' },
      { id: 'r4', entity: 'dossier', entityId: 'remote', field: 'waiting_for', value: 'la réponse', ts: 10, device: 'phone' },
    ])
    expect(await db.dossiers.get('remote')).toMatchObject({ title: 'Du téléphone', task_ids: ['t1'], waiting: true, waiting_for: 'la réponse', deleted_at: null })
  })

  it('creates, renames, notes, tombstones and restores through the op log', async () => {
    const { id, entry } = await createDossier('  Pneus avant  ', '  Garagiste du coin  ')
    expect(entry).not.toBeNull()
    expect(await liveDossier(id)).toMatchObject({ title: 'Pneus avant', note: 'Garagiste du coin', task_ids: [], waiting: false, waiting_for: '', follow_up: null, deleted_at: null })
    expect((await db.outbox.toArray()).map((op) => op.field).sort()).toEqual(['created_at', 'deleted_at', 'follow_up', 'note', 'position', 'task_ids', 'title', 'waiting', 'waiting_for'])

    const renamed = await updateDossier(id, { title: 'Pneus', note: 'Livraison chez le garagiste' })
    expect(renamed).not.toBeNull()
    expect(await liveDossier(id)).toMatchObject({ title: 'Pneus', note: 'Livraison chez le garagiste' })
    expect(await updateDossier(id, { title: 'Pneus', note: 'Livraison chez le garagiste' })).toBeNull()
    await expect(updateDossier(id, { title: '   ' })).rejects.toThrow()

    const before = await beforeUndo()
    await deleteDossier(id)
    expect((await liveDossier(id)).deleted_at).toBeGreaterThan(0)
    await undoBatch(await newUndo(before))
    expect((await liveDossier(id)).deleted_at).toBeNull()
  })

  it('refuses a blank title and an already deleted dossier', async () => {
    await expect(createDossier('   ')).rejects.toThrow()
    const { id } = await createDossier('Vide')
    await deleteDossier(id)
    await expect(updateDossier(id, { title: 'Encore' })).rejects.toThrow()
    await expect(attachTaskToDossier(id, 'anything')).rejects.toThrow()
  })
})

describe('attaching real tasks', () => {
  it('appends in the chosen order and Undo restores the previous order', async () => {
    const { id } = await createDossier('Cuisine')
    const first = await seededTask('Demander trois devis')
    const second = await seededTask('Réserver le monteur')
    const one = await attachTaskToDossier(id, first)
    const two = await attachTaskToDossier(id, second)
    expect(one).not.toBeNull()
    expect(two).not.toBeNull()
    expect((await liveDossier(id)).task_ids).toEqual([first, second])
    await undoBatch(two!.id)
    expect((await liveDossier(id)).task_ids).toEqual([first])
    expect(await db.tasks.get(first)).toMatchObject({ deleted_at: null })
  })

  it('refuses a deleted, completed, archived, read-only or foreign task', async () => {
    const { id } = await createDossier('Cuisine')
    const deleted = await seededTask('Supprimée')
    await updateTask(deleted, { deleted_at: 5 })
    await expect(attachTaskToDossier(id, deleted)).rejects.toThrow()

    const done = await seededTask('Terminée')
    await completeTask(done)
    await expect(attachTaskToDossier(id, done)).rejects.toThrow()

    const archivedProject = await createProject({ name: 'Archivé' })
    const archived = await createTask({ title: 'Dans un projet archivé', project_id: archivedProject })
    await mutate('project', archivedProject, { archived: true })
    await expect(attachTaskToDossier(id, archived)).rejects.toThrow()

    const sharedProject = await createProject({ name: 'Partagé' })
    const viewed = await createTask({ title: 'Lecture seule', project_id: sharedProject })
    await db.memberships.put({ projectId: sharedProject, role: 'viewer', ownerId: 'someone', members: [] })
    await expect(attachTaskToDossier(id, viewed)).rejects.toThrow()

    const deletedProject = await createProject({ name: 'Corbeille' })
    const inDeleted = await createTask({ title: 'Projet supprimé', project_id: deletedProject })
    await mutate('project', deletedProject, { deleted_at: 6 })
    await expect(attachTaskToDossier(id, inDeleted)).rejects.toThrow()
    expect((await liveDossier(id)).task_ids).toEqual([])
  })

  it('keeps at most fifty members and ignores a duplicate attach', async () => {
    const { id } = await createDossier('Long')
    const task = await seededTask('Une tâche')
    expect(await attachTaskToDossier(id, task)).not.toBeNull()
    expect(await attachTaskToDossier(id, task)).toBeNull()
    await mutate('dossier', id, { task_ids: [task, ...Array.from({ length: 49 }, (_, i) => `gone-${i}`)] })
    await expect(attachTaskToDossier(id, await seededTask('De trop'))).rejects.toThrow()
  })

  it('detaches and reorders without touching the task itself', async () => {
    const { id } = await createDossier('Ordre')
    const a = await seededTask('A', { due: { date: '2026-11-02' } })
    const b = await seededTask('B')
    const c = await seededTask('C')
    await attachTaskToDossier(id, a)
    await attachTaskToDossier(id, b)
    await attachTaskToDossier(id, c)
    const beforeTask = await db.tasks.get(a)
    const moved = await moveDossierTask(id, c, -1)
    expect(moved).not.toBeNull()
    expect((await liveDossier(id)).task_ids).toEqual([a, c, b])
    expect(await moveDossierTask(id, a, -1)).toBeNull()
    expect(await moveDossierTask(id, 'not-a-member', 1)).toBeNull()
    const detached = await detachTaskFromDossier(id, b)
    expect(detached).not.toBeNull()
    expect((await liveDossier(id)).task_ids).toEqual([a, c])
    expect(await db.tasks.get(a)).toEqual(beforeTask)
    expect(await detachTaskFromDossier(id, b)).toBeNull()
  })

  it('cleans only members that no longer resolve and never removes a live one', async () => {
    const { id } = await createDossier('Nettoyage')
    const kept = await seededTask('Gardée')
    const gone = await seededTask('Supprimée')
    await attachTaskToDossier(id, kept)
    await attachTaskToDossier(id, gone)
    await updateTask(gone, { deleted_at: 9 })
    expect(await removeUnavailableDossierTasks(id, [kept, 'unknown'])).toBeNull()
    const entry = await removeUnavailableDossierTasks(id)
    expect(entry).not.toBeNull()
    expect((await liveDossier(id)).task_ids).toEqual([kept])
    await undoBatch(entry!.id)
    expect((await liveDossier(id)).task_ids).toEqual([kept, gone])
  })
})

describe('waiting and resume', () => {
  it('writes only dossier fields and leaves every task date alone', async () => {
    const { id } = await createDossier('Garage BMW')
    const task = await seededTask('Commander les pneus', { due: { date: '2026-11-02', time: '09:00' } })
    await attachTaskToDossier(id, task)
    const before = await db.tasks.get(task)
    const entry = await setDossierWaiting(id, '  la livraison  ', '2026-11-05')
    expect(entry).not.toBeNull()
    expect(await liveDossier(id)).toMatchObject({ waiting: true, waiting_for: 'la livraison', follow_up: '2026-11-05' })
    expect(await db.tasks.get(task)).toEqual(before)
    expect(dossierState(await liveDossier(id), [before!]).next?.id).toBe(task)

    const follow = await setDossierFollowUp(id, '2026-11-09')
    expect(follow).not.toBeNull()
    expect((await liveDossier(id)).follow_up).toBe('2026-11-09')
    expect(await setDossierFollowUp(id, '2026-11-09')).toBeNull()

    const resumed = await resumeDossier(id)
    expect(resumed).not.toBeNull()
    expect(await liveDossier(id)).toMatchObject({ waiting: false, waiting_for: '', follow_up: null })
    expect(await db.tasks.get(task)).toEqual(before)
  })

  it('rejects a blank wait or an impossible date before any op', async () => {
    const { id } = await createDossier('Validation')
    const before = await db.outbox.count()
    await expect(setDossierWaiting(id, '   ', null)).rejects.toThrow()
    await expect(setDossierWaiting(id, 'la livraison', '2026-02-30')).rejects.toThrow()
    expect(await db.outbox.count()).toBe(before)
    expect(await setDossierFollowUp(id, '2026-11-02')).toBeNull()
    expect(await resumeDossier(id)).toBeNull()
  })

  it('clears a partial hold and Undo restores the whole wait', async () => {
    const { id } = await createDossier('Partiel')
    await setDossierWaiting(id, 'une réponse', '2026-11-04')
    const before = await beforeUndo()
    await resumeDossier(id)
    await undoBatch(await newUndo(before))
    expect(await liveDossier(id)).toMatchObject({ waiting: true, waiting_for: 'une réponse', follow_up: '2026-11-04' })
  })

  it('clears a row that only carries the stale parts of a hold', async () => {
    const { id } = await createDossier('Partiel')
    await mutate('dossier', id, { waiting: false, waiting_for: 'ancienne attente', follow_up: '2026-11-04' })
    expect(await resumeDossier(id)).not.toBeNull()
    expect(await liveDossier(id)).toMatchObject({ waiting: false, waiting_for: '', follow_up: null })
  })
})

describe("today's focus", () => {
  async function twoDossiers(): Promise<[Dossier, Dossier]> {
    const a = await createDossier('A')
    const b = await createDossier('B')
    return [await liveDossier(a.id), await liveDossier(b.id)]
  }

  it('keeps the task focus when a dossier is chosen on the same day', async () => {
    const [a, b] = await twoDossiers()
    await mutate('review', 'me', { focus_date: TODAY, focus: 'task-1', focus_dossiers: [a.id] })
    expect(await toggleDossierFocus(await reviewRow(), TODAY, [a, b], b.id)).toBe('added')
    expect(await reviewRow()).toMatchObject({ focus_date: TODAY, focus: 'task-1', focus_dossiers: [a.id, b.id] })
    expect(await toggleDossierFocus(await reviewRow(), TODAY, [a, b], a.id)).toBe('removed')
    expect(await reviewRow()).toMatchObject({ focus: 'task-1', focus_dossiers: [b.id] })
  })

  it('clears yesterday task focus when a dossier is chosen today', async () => {
    const [a, b] = await twoDossiers()
    await mutate('review', 'me', { focus_date: '2026-10-28', focus: 'old-task', focus_dossiers: [a.id] })
    expect(await toggleDossierFocus(await reviewRow(), TODAY, [a, b], b.id)).toBe('added')
    expect(await reviewRow()).toMatchObject({ focus_date: TODAY, focus: '', focus_dossiers: [b.id] })
  })

  it('reads the stored row when the screen has not loaded it yet', async () => {
    const [a, b] = await twoDossiers()
    await mutate('review', 'me', { focus_date: TODAY, focus: 'task-1', focus_dossiers: [a.id] })
    expect(await toggleDossierFocus(undefined, TODAY, [a, b], b.id)).toBe('added')
    expect(await reviewRow()).toMatchObject({ focus: 'task-1', focus_dossiers: [a.id, b.id] })
  })

  it('refuses a fourth dossier and a deleted id without writing', async () => {
    const [a, b] = await twoDossiers()
    const c = await liveDossier((await createDossier('C')).id)
    const d = await liveDossier((await createDossier('D')).id)
    await mutate('review', 'me', { focus_date: TODAY, focus: '', focus_dossiers: [a.id, b.id, c.id] })
    const before = await db.outbox.count()
    expect(await toggleDossierFocus(await reviewRow(), TODAY, [a, b, c, d], d.id)).toBe('full')
    expect(await db.outbox.count()).toBe(before)
    await expect(toggleDossierFocus(await reviewRow(), TODAY, [a, b, c, d], 'missing')).rejects.toThrow()
    expect(await db.outbox.count()).toBe(before)
  })

  it('records the focus change as one undoable batch', async () => {
    const [a, b] = await twoDossiers()
    await mutate('review', 'me', { focus_date: TODAY, focus: 'task-1', focus_dossiers: [a.id] })
    const before = await beforeUndo()
    await toggleDossierFocus(await reviewRow(), TODAY, [a, b], b.id)
    await undoBatch(await newUndo(before))
    expect(await reviewRow()).toMatchObject({ focus_date: TODAY, focus: 'task-1', focus_dossiers: [a.id] })
  })
})

describe('workspace partition', () => {
  const entry = (id: string, isDefault = false): WorkspaceEntry => ({ id, name: id, icon: '', color: '', default: isDefault, role: 'owner', ownerId: 'me', members: [], groups: [] })

  it('refuses a task of another workspace', async () => {
    await storeWorkspaces([entry('w-home', true), entry('w-work')])
    await switchTo('w-home')
    const local = await createDossier('Maison')
    await switchTo('w-work')
    const foreignProject = await createProject({ name: 'Travail' })
    const foreignTask = await createTask({ title: 'Tâche du travail', project_id: foreignProject })
    await switchTo('w-home')
    await expect(attachTaskToDossier(local.id, foreignTask)).rejects.toThrow()
    expect((await liveDossier(local.id)).task_ids).toEqual([])
  })

  it('refuses to edit a dossier left behind in another workspace', async () => {
    await storeWorkspaces([entry('w-home', true), entry('w-work')])
    await switchTo('w-work')
    const { id } = await createDossier('Travail')
    await switchTo('w-home')
    await expect(updateDossier(id, { title: 'Ailleurs' })).rejects.toThrow()
    expect((await liveDossier(id)).title).toBe('Travail')
  })
})

describe('local capture offer', () => {
  it('offers a match without writing, keeps the card until dismissed and clears only its own key', async () => {
    const { id } = await createDossier('Garage BMW')
    const other = await createDossier('Cuisine')
    const rows = [await liveDossier(id), await liveDossier(other.id)]
    expect(suggestDossiers('BMW garage confirmé', rows, []).map((d) => d.id)).toEqual([id])
    const before = await db.outbox.count()
    expect(offerDossierLink('t1', '  BMW garage confirmé  ', rows, [])).toBe(true)
    expect(dossierLinkOffer()).toMatchObject({ taskId: 't1', title: 'BMW garage confirmé', candidateIds: [id] })
    expect(await db.outbox.count()).toBe(before)
    const key = dossierLinkOffer()!.key
    hideDossierLinkOffer(key + 1)
    expect(dossierLinkOffer()).not.toBeNull()
    hideDossierLinkOffer(key)
    expect(dossierLinkOffer()).toBeNull()
    expect(offerDossierLink('t2', '   ', [await liveDossier(id)], [])).toBe(false)
  })

  it('uses the same deterministic match as the pure helper and dedupes candidates', async () => {
    const { id } = await createDossier('Garage')
    const task = await seededTask('Appeler le garage')
    const row = (await db.tasks.get(task))!
    const dossiers = [await liveDossier(id)]
    expect(suggestDossiers('garage', dossiers, [row]).map((d) => d.id)).toEqual([id])
    expect(offerDossierLink(task, 'garage', dossiers, [row])).toBe(true)
    expect(dossierLinkOffer()!.candidateIds).toEqual([id])
  })
})
