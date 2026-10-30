import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useDatabase } from './db'
import * as status from './assistantStatus'
import { api } from './api'
import { classifyOffer, hideClassifyOffer } from './classifyAfterAdd'
import { createDossier, dossierLinkOffer } from './dossiers'
import { getTask } from './localData'
import { createProject } from './ops'
import { createTaskThenSuggest, getSuggestAfterAdd, setSuggestAfterAdd, suggestAfterAdd, suggestionPrompt } from './assistantSuggest'

let n = 0
beforeEach(() => {
  useDatabase(`suggest-${Date.now()}-${n++}`)
  vi.restoreAllMocks()
})

const ready = { available: true, enabled: true, consented: true, reason: '' } as unknown as status.AssistantStatus

describe('suggest after adding', () => {
  it('is off by default and remembers the choice on this device', async () => {
    expect(await getSuggestAfterAdd()).toBe(false)
    await setSuggestAfterAdd(true)
    expect(await getSuggestAfterAdd()).toBe(true)
    await setSuggestAfterAdd(false)
    expect(await getSuggestAfterAdd()).toBe(false)
  })

  it('asks the assistant about exactly the new task, and sends at once', async () => {
    vi.spyOn(status, 'assistantStatus').mockReturnValue(ready)
    const open = vi.spyOn(status, 'openAssistantWith').mockImplementation(() => {})
    await setSuggestAfterAdd(true)
    await suggestAfterAdd('task-1', 'Call the garage tomorrow')
    expect(open).toHaveBeenCalledTimes(1)
    expect(open).toHaveBeenCalledWith({ text: suggestionPrompt('Call the garage tomorrow'), selected: ['task-1'], send: true })
  })

  it('bounds the request: at most 4 subtasks, nothing else touched, no invented date', () => {
    const p = suggestionPrompt('Fix shelf')
    expect(p).toContain('“Fix shelf”')
    expect(p).toMatch(/at most 4 subtasks/)
    expect(p).toMatch(/Change nothing else/)
    expect(p).toMatch(/invent no date/)
  })

  it.each([
    ['the device did not turn it on', ready, false],
    ['the owner has not enabled the assistant', { ...ready, enabled: false }, true],
    ['the account is not allowed to use it', { ...ready, available: false }, true],
    ['the consent was not given', { ...ready, consented: false }, true],
    ['the status is not loaded yet', null, true],
  ])('does nothing when %s', async (_why, s, on) => {
    vi.spyOn(status, 'assistantStatus').mockReturnValue(s as status.AssistantStatus | null)
    const open = vi.spyOn(status, 'openAssistantWith').mockImplementation(() => {})
    await setSuggestAfterAdd(on)
    await suggestAfterAdd('task-1', 'x')
    expect(open).not.toHaveBeenCalled()
  })

  it('never throws, so adding a task cannot fail because of it', async () => {
    vi.spyOn(status, 'assistantStatus').mockImplementation(() => { throw new Error('boom') })
    await expect(suggestAfterAdd('task-1', 'x')).resolves.toBeUndefined()
  })

  it('createTaskThenSuggest creates the task first, then asks about it', async () => {
    vi.spyOn(status, 'assistantStatus').mockReturnValue(ready)
    const open = vi.spyOn(status, 'openAssistantWith').mockImplementation(() => {})
    await setSuggestAfterAdd(true)
    const id = await createTaskThenSuggest({ title: 'Call the garage tomorrow', project_id: null, labels: [] })
    expect((await getTask(id))?.title).toBe('Call the garage tomorrow')
    await vi.waitFor(() => expect(open).toHaveBeenCalledWith(expect.objectContaining({ selected: [id], send: true })))
  })

  it('createTaskThenSuggest still returns the id when the setting is off', async () => {
    const open = vi.spyOn(status, 'openAssistantWith').mockImplementation(() => {})
    const id = await createTaskThenSuggest({ title: 'Buy milk', project_id: null, labels: [] })
    expect(typeof id).toBe('string')
    expect(open).not.toHaveBeenCalled()
  })

  it('a list card replaces the suggestion panel for the same add, and the panel still follows when no card is offered', async () => {
    vi.spyOn(status, 'assistantStatus').mockReturnValue(ready)
    const open = vi.spyOn(status, 'openAssistantWith').mockImplementation(() => {})
    await setSuggestAfterAdd(true)
    const car = await createProject({ name: 'Voiture' })
    const ask = vi.spyOn(api, 'assistantClassify').mockResolvedValue({ project_id: car, confidence: 0.9 })
    await createTaskThenSuggest({ title: 'Appeler le garage', project_id: null, labels: [] })
    await vi.waitFor(() => expect(ask).toHaveBeenCalledTimes(1))
    await vi.waitFor(() => expect(classifyOffer()).not.toBeNull())
    expect(open).not.toHaveBeenCalled()
    hideClassifyOffer()
    ask.mockResolvedValue({ project_id: null, confidence: 0 })
    const id = await createTaskThenSuggest({ title: 'Idée', project_id: null, labels: [] })
    await vi.waitFor(() => expect(open).toHaveBeenCalledWith(expect.objectContaining({ selected: [id] })))
  })

  it('a local dossier match is offered first, with no model call and no list card', async () => {
    vi.spyOn(status, 'assistantStatus').mockReturnValue(ready)
    const open = vi.spyOn(status, 'openAssistantWith').mockImplementation(() => {})
    const classify = vi.spyOn(api, 'assistantClassify')
    await setSuggestAfterAdd(true)
    const dossier = await createDossier('Pneus avant')
    const id = await createTaskThenSuggest({ title: 'Commander les pneus avant', project_id: null, labels: [] })
    await vi.waitFor(() => expect(dossierLinkOffer()).not.toBeNull())
    expect(dossierLinkOffer()).toMatchObject({ taskId: id, title: 'Commander les pneus avant', candidateIds: [dossier.id] })
    expect(classify).not.toHaveBeenCalled()
    expect(open).not.toHaveBeenCalled()
    expect(classifyOffer()).toBeNull()
  })

  it('offers the local dossier with no assistant available at all', async () => {
    vi.spyOn(status, 'assistantStatus').mockReturnValue(null)
    const open = vi.spyOn(status, 'openAssistantWith').mockImplementation(() => {})
    const dossier = await createDossier('Voiture')
    const id = await createTaskThenSuggest({ title: 'Contrôle technique de la voiture', project_id: null, labels: [] })
    await vi.waitFor(() => expect(dossierLinkOffer()).not.toBeNull())
    expect(dossierLinkOffer()).toMatchObject({ taskId: id, candidateIds: [dossier.id] })
    expect(open).not.toHaveBeenCalled()
  })

  it('keeps the list card when no dossier matches', async () => {
    vi.spyOn(status, 'assistantStatus').mockReturnValue(ready)
    await setSuggestAfterAdd(true)
    const car = await createProject({ name: 'Voiture' })
    const ask = vi.spyOn(api, 'assistantClassify').mockResolvedValue({ project_id: car, confidence: 0.9 })
    await createDossier('Maison')
    await createTaskThenSuggest({ title: 'Appeler le garage', project_id: null, labels: [] })
    await vi.waitFor(() => expect(ask).toHaveBeenCalledTimes(1))
    await vi.waitFor(() => expect(classifyOffer()).not.toBeNull())
    expect(dossierLinkOffer()).toBeNull()
  })
})
