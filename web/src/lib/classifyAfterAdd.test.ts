import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from './api'
import * as status from './assistantStatus'
import { candidateLists, classifyAfterAdd, classifyOffer, getClassifyAfterAdd, hideClassifyOffer, setClassifyAfterAdd } from './classifyAfterAdd'
import { useDatabase } from './db'
import { getTask } from './localData'
import { createProject, createTask, updateTask } from './ops'

let n = 0
beforeEach(() => {
  useDatabase(`classify-${Date.now()}-${n++}`)
  vi.restoreAllMocks()
  hideClassifyOffer()
})

const ready = { available: true, enabled: true, consented: true, reason: '' } as unknown as status.AssistantStatus

async function setup() {
  vi.spyOn(status, 'assistantStatus').mockReturnValue(ready)
  const home = await createProject({ name: 'Maison' })
  const car = await createProject({ name: 'Voiture' })
  const old = await createProject({ name: 'Ancien' })
  await updateProject(old, { archived: true })
  const id = await createTask({ title: 'Appeler le garage', project_id: null, labels: [] })
  return { home, car, old, id }
}

async function updateProject(id: string, patch: Record<string, unknown>) {
  const { mutate } = await import('./ops')
  await mutate('project', id, patch)
}

describe('classify after adding', () => {
  it('is on by default and remembers the choice on this device', async () => {
    expect(await getClassifyAfterAdd()).toBe(true)
    await setClassifyAfterAdd(false)
    expect(await getClassifyAfterAdd()).toBe(false)
    await setClassifyAfterAdd(true)
    expect(await getClassifyAfterAdd()).toBe(true)
  })

  it('offers a card for an unplaced task, asking about the title and the live lists only', async () => {
    const { home, car, id } = await setup()
    const ask = vi.spyOn(api, 'assistantClassify').mockResolvedValue({ project_id: car, confidence: 0.9 })
    expect(await classifyAfterAdd(id, 'Appeler le garage')).toBe(true)
    expect(ask).toHaveBeenCalledWith('Appeler le garage', [{ id: home, name: 'Maison' }, { id: car, name: 'Voiture' }])
    expect(classifyOffer()).toMatchObject({ taskId: id, title: 'Appeler le garage', projectId: car })
    // A proposal alone moves nothing.
    expect((await getTask(id))?.project_id ?? null).toBeNull()
  })

  it.each([
    ['the device turned it off', async () => { await setClassifyAfterAdd(false) }],
    ['the assistant is not consented', async () => { vi.spyOn(status, 'assistantStatus').mockReturnValue({ ...ready, consented: false }) }],
    ['the status is not loaded yet', async () => { vi.spyOn(status, 'assistantStatus').mockReturnValue(null) }],
  ])('asks nothing when %s', async (_why, arrange) => {
    const { car, id } = await setup()
    await arrange()
    const ask = vi.spyOn(api, 'assistantClassify').mockResolvedValue({ project_id: car, confidence: 1 })
    expect(await classifyAfterAdd(id, 'x')).toBe(false)
    expect(ask).not.toHaveBeenCalled()
    expect(classifyOffer()).toBeNull()
  })

  it('leaves a task that already has a list or a parent alone', async () => {
    const { home, car, id } = await setup()
    const ask = vi.spyOn(api, 'assistantClassify').mockResolvedValue({ project_id: car, confidence: 1 })
    const placed = await createTask({ title: 'Peindre', project_id: home, labels: [] })
    const sub = await createTask({ title: 'Sous-tâche', project_id: null, parent_id: id, labels: [] })
    expect(await classifyAfterAdd(placed, 'Peindre')).toBe(false)
    expect(await classifyAfterAdd(sub, 'Sous-tâche')).toBe(false)
    expect(ask).not.toHaveBeenCalled()
  })

  it.each([
    ['no list fits', { project_id: null, confidence: 0 }],
    ['the model is guessing', { project_id: 'CAR', confidence: 0.3 }],
    ['the list was not one of those offered', { project_id: 'elsewhere', confidence: 0.99 }],
  ])('offers no card when %s', async (_why, answer) => {
    const { car, id } = await setup()
    vi.spyOn(api, 'assistantClassify').mockResolvedValue({ ...answer, project_id: answer.project_id === 'CAR' ? car : answer.project_id })
    expect(await classifyAfterAdd(id, 'Appeler le garage')).toBe(false)
    expect(classifyOffer()).toBeNull()
  })

  it('never throws when the assistant fails: the task is already created', async () => {
    const { id } = await setup()
    vi.spyOn(api, 'assistantClassify').mockRejectedValue(new Error('502'))
    await expect(classifyAfterAdd(id, 'x')).resolves.toBe(false)
  })

  it('drops the proposal when the person filed the task while the model was thinking', async () => {
    const { home, car, id } = await setup()
    vi.spyOn(api, 'assistantClassify').mockImplementation(async () => {
      await updateTask(id, { project_id: home })
      return { project_id: car, confidence: 0.9 }
    })
    expect(await classifyAfterAdd(id, 'Appeler le garage')).toBe(false)
    expect(classifyOffer()).toBeNull()
  })

  it('offers only lists of the task’s workspace, in order, at most 60', () => {
    const p = (i: number, over: Record<string, unknown> = {}) => ({ id: `p${i}`, name: `P${i}`, position: i, archived: false, deleted_at: null, workspace_id: null, ...over }) as never
    const rows = [p(2), p(1), p(3, { workspace_id: 'w2' }), p(4, { deleted_at: 1 }), p(5, { archived: true }), ...Array.from({ length: 70 }, (_, i) => p(10 + i))]
    const got = candidateLists(rows, null)
    expect(got).toHaveLength(60)
    expect(got.slice(0, 2).map((x) => x.id)).toEqual(['p1', 'p2'])
    expect(got.some((x) => ['p3', 'p4', 'p5'].includes(x.id))).toBe(false)
    expect(candidateLists(rows, 'w2').map((x) => x.id)).toEqual(['p3'])
  })
})
