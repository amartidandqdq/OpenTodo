// The dossier table and its workspace partition (OpenSpec change
// resume-dossiers): a v25 additive table and the same own/foreign rule as labels.
import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { describe, expect, it } from 'vitest'
import { useDatabase } from './db'
import { ownIn, Partition, workspaceOf, type WorkspaceState } from './workspaces'
import type { Dossier, Workspace } from './types'

const ws = (id: string, isDefault = false): Workspace => ({ id, name: id, icon: '', color: '', default: isDefault, role: 'owner', ownerId: 'me' })

const dossier = (id: string, workspace_id: string | null): Dossier => ({
  id, title: id, note: '', task_ids: [], waiting: false, waiting_for: '', follow_up: null, workspace_id,
  position: 0, created_at: 1, deleted_at: null, _clock: {},
})

describe('dossier workspace partition', () => {
  it('shows the current workspace and treats an absent id as the default', () => {
    const state: WorkspaceState = { current: 'w-a', defaultId: 'w-p', list: [ws('w-p', true), ws('w-a')] }
    const rows = [dossier('a', 'w-a'), dossier('b', null), dossier('c', 'w-p'), dossier('d', 'w-gone')]
    expect(ownIn(state, rows).map((d) => d.id)).toEqual(['a'])
    const partition = new Partition(state.defaultId, state.list.map((w) => w.id))
    expect(workspaceOf('dossier', rows[0], partition)).toBe('w-a')
    expect(workspaceOf('dossier', rows[1], partition)).toBe('w-p')
    expect(workspaceOf('dossier', rows[3], partition)).toBe('w-p')
  })
})

describe('the dossier table', () => {
  it('is created by the v25 upgrade without touching existing rows', async () => {
    const name = `dossier-v25-${Date.now()}-${Math.random()}`
    const old = new Dexie(name)
    old.version(24).stores({ projects: 'id, position, workspace_id' })
    await old.open()
    await old.table('projects').put({ id: 'p1', name: 'Maison', position: 1 })
    old.close()

    const d = useDatabase(name)
    await d.open()
    expect(d.verno).toBe(25)
    expect(await d.projects.get('p1')).toMatchObject({ name: 'Maison' })
    expect(await d.dossiers.count()).toBe(0)
    await d.dossiers.put(dossier('d1', null))
    expect(await d.dossiers.get('d1')).toMatchObject({ title: 'd1' })
    await d.delete()
  })
})
