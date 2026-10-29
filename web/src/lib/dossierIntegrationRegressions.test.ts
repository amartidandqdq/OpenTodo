import 'fake-indexeddb/auto'
import { beforeEach, expect, it, vi } from 'vitest'
import { db, useDatabase } from './db'
import { createDossier, attachTaskToDossier, dossierLinkOffer, hideDossierLinkOffer, moveDossierTask } from './dossiers'
import { createTaskThenSuggest } from './assistantSuggest'
import { createProject, createTask, mutate, resetDeviceId } from './ops'
import { forgetRejected } from './sharing'
import { storeWorkspaces, switchTo } from './workspaces'
import type { WorkspaceEntry } from './types'

let n = 0
beforeEach(() => { useDatabase(`dossier-integration-${Date.now()}-${n++}`); resetDeviceId(); hideDossierLinkOffer() })

it('matches a project task against dossiers in its effective workspace', async () => {
  const entries = ['personal', 'work'].map((id): WorkspaceEntry => ({ id, name: id, default: id === 'personal', role: 'owner', ownerId: 'me', icon: '', color: '', members: [], groups: [] }))
  await storeWorkspaces(entries)
  const wrong = await createDossier('Pneus BMW')
  await switchTo('work')
  const right = await createDossier('Pneus BMW')
  const project = await createProject({ name: 'Work garage' })
  const task = await createTaskThenSuggest({ title: 'Commander pneus BMW', project_id: project })
  await vi.waitFor(() => expect(dossierLinkOffer()).toMatchObject({ taskId: task, candidateIds: [right.id] }))
  expect(dossierLinkOffer()?.candidateIds).not.toContain(wrong.id)
})

it('resets a refused first order to the server default while preserving the dossier', async () => {
  const { id } = await createDossier('A thread')
  await mutate('dossier', id, { task_ids: ['lost-access'] })
  const sent = (await db.outbox.toArray()).filter((op) => op.entityId === id && op.field === 'task_ids')
  await forgetRejected(sent, sent.map((op) => ({ id: op.id, reason: 'forbidden' })))
  expect((await db.dossiers.get(id))?.task_ids).toEqual([])
  expect((await db.dossiers.get(id))?.title).toBe('A thread')
})

it('moves relative to the visible neighbour without removing unavailable members', async () => {
  const { id } = await createDossier('Thread')
  const a = await createTask({ title: 'A' })
  const b = await createTask({ title: 'B' })
  await attachTaskToDossier(id, a)
  await attachTaskToDossier(id, b)
  await mutate('dossier', id, { task_ids: [a, 'missing', b] })
  await moveDossierTask(id, b, -1)
  expect((await db.dossiers.get(id))?.task_ids).toEqual([b, 'missing', a])
})
