// @vitest-environment happy-dom
// The card after a quick add (fork change `assistant-classify-card`): file it, choose another list, or leave it for later.
import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../lib/api'
import * as status from '../lib/assistantStatus'
import { classifyAfterAdd, classifyOffer, hideClassifyOffer } from '../lib/classifyAfterAdd'
import { db } from '../lib/db'
import { getTask } from '../lib/localData'
import { createProject, createTask } from '../lib/ops'
import { bulkToast, hideBulkToast } from './bulk/toastStore'
import { ClassifyCard } from './ClassifyCard'
import { click, flush, key, render, waitFor } from '../ui/test-utils'

beforeEach(async () => {
  await db.delete()
  await db.open()
  vi.restoreAllMocks()
  hideClassifyOffer()
  hideBulkToast()
  vi.spyOn(status, 'assistantStatus').mockReturnValue({ available: true, enabled: true, consented: true, reason: '' } as unknown as status.AssistantStatus)
})

async function offered() {
  const car = await createProject({ name: 'Voiture' })
  await createProject({ name: 'Maison' })
  const id = await createTask({ title: 'Appeler le garage demain', project_id: null, labels: [] })
  vi.spyOn(api, 'assistantClassify').mockResolvedValue({ project_id: car, confidence: 0.92 })
  expect(await classifyAfterAdd(id, 'Appeler le garage demain')).toBe(true)
  return { car, id }
}

const q = <T extends Element>(sel: string) => document.querySelector<T>(sel)

describe('ClassifyCard', () => {
  it('shows nothing until a list is proposed', async () => {
    const r = await render(<ClassifyCard />)
    await flush()
    expect(q('[data-classify-card]')).toBeNull()
    await r.unmount()
  })

  it('names the task and the proposed list, and moves nothing by itself', async () => {
    const { id } = await offered()
    const r = await render(<ClassifyCard />)
    await waitFor(() => !!q('[data-classify-card]'), 'the card')
    expect(q('[data-classify-card]')!.textContent).toContain('Appeler le garage demain')
    await waitFor(() => !!q('[data-classify-card]')!.textContent?.includes('Voiture'), 'the proposed list in the picker')
    expect((await getTask(id))?.project_id ?? null).toBeNull()
    await r.unmount()
  })

  it('"File it" moves the task to the proposed list, closes the card and offers Undo', async () => {
    const { car, id } = await offered()
    const r = await render(<ClassifyCard />)
    await waitFor(() => !!q('[data-classify-file]'), 'File it')
    await click(q('[data-classify-file]')!)
    await waitFor(async () => (await getTask(id))?.project_id === car, 'the task filed in Voiture')
    expect(q('[data-classify-card]')).toBeNull()
    expect(classifyOffer()).toBeNull()
    await waitFor(() => !!bulkToast()?.undoId, 'the Undo toast')
    await r.unmount()
  })

  it('"Later" leaves the task in the Inbox as typed', async () => {
    const { id } = await offered()
    const r = await render(<ClassifyCard />)
    await waitFor(() => !!q('[data-classify-later]'), 'Later')
    await click(q('[data-classify-later]')!)
    expect(q('[data-classify-card]')).toBeNull()
    expect((await getTask(id))?.project_id ?? null).toBeNull()
    expect((await getTask(id))?.title).toBe('Appeler le garage demain')
    await r.unmount()
  })

  it('Escape is "Later"', async () => {
    const { id } = await offered()
    const r = await render(<ClassifyCard />)
    await waitFor(() => !!q('[data-classify-card]'), 'the card')
    await key(q('[data-classify-card]')!, 'Escape')
    expect(q('[data-classify-card]')).toBeNull()
    expect((await getTask(id))?.project_id ?? null).toBeNull()
    await r.unmount()
  })
})
