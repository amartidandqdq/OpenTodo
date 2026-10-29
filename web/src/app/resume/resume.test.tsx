// @vitest-environment happy-dom
// Pick up the thread (OpenSpec change resume-dossiers): the empty account explains
// a dossier without creating one, context chips are the labels already on open
// tasks, and the capture's local offer attaches only after confirmation.
import 'fake-indexeddb/auto'
import { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setDateTime } from '../../lib/dates'
import { db, useDatabase } from '../../lib/db'
import { attachTaskToDossier, createDossier, dossierLinkOffer } from '../../lib/dossiers'
import { createLabel } from '../../lib/labels'
import { createProject, createTask, resetDeviceId } from '../../lib/ops'
import { click, key, render, type, waitFor } from '../../ui/test-utils'
import { ResumeView } from './ResumeView'

let n = 0
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 9, 14, 12, 0))
  useDatabase(`resume-${Date.now()}-${n++}`)
  resetDeviceId()
  setDateTime({ date_format: 'day-month', time_format: '24h', week_start: 'mon' }, { order: 'DM', hour12: false, weekStart: 1 })
})
afterEach(() => {
  vi.useRealTimers()
  setDateTime({ date_format: 'system', time_format: 'system', week_start: 'system' })
})

describe('Pick up the thread', () => {
  it('explains a dossier and offers to create one without writing anything', async () => {
    const r = await render(<ResumeView />)
    await waitFor(() => !!r.container.querySelector('[data-resume-empty]'), 'the empty dossier card')
    expect(r.container.textContent).toContain('A dossier links the steps of one thread.')
    expect(r.container.textContent).toContain('Create a dossier')
    expect(await db.dossiers.count()).toBe(0)
    await r.unmount()
  })

  it('creates a dossier from the empty page and opens its page', async () => {
    const r = await render(<ResumeView />)
    await waitFor(() => !!r.container.querySelector('[data-resume-empty]'), 'the empty dossier card')
    const create = [...r.container.querySelectorAll<HTMLButtonElement>('button')].find((button) => button.textContent === 'Create a dossier')!
    await click(create)
    await waitFor(() => !!document.querySelector('input[aria-label="Name"]'), 'the name prompt')
    const name = document.querySelector<HTMLInputElement>('input[aria-label="Name"]')!
    await type(name, 'Kitchen')
    await act(async () => { name.closest('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })) })
    await waitFor(async () => (await db.dossiers.toArray()).length === 1, 'the created dossier')
    const dossier = (await db.dossiers.toArray())[0]
    expect(dossier.title).toBe('Kitchen')
    expect(dossier.task_ids).toEqual([])
    await waitFor(() => location.pathname === `/dossier/${dossier.id}`, 'the dossier page address')
    await r.unmount()
  })

  it('offers the labels already on open tasks as context filters and lists only their matches', async () => {
    const home = await createProject({ name: 'Home' })
    const calls = await createLabel({ name: 'Calls' })
    const quotes = await createTask({ title: 'Get three quotes', project_id: home, labels: [calls] })
    const fitters = await createTask({ title: 'Book the fitters', project_id: home })
    await createTask({ title: 'Call the plumber', labels: [calls] })
    await createTask({ title: 'File the receipts' })
    const dossier = await createDossier('Kitchen')
    for (const id of [quotes, fitters]) await attachTaskToDossier(dossier.id, id)
    const r = await render(<ResumeView />)
    await waitFor(() => !!r.container.querySelector('[data-resume-contexts]'), 'the context chips')
    const chips = [...r.container.querySelectorAll<HTMLButtonElement>('[data-resume-contexts] button')]
    const callsChip = chips.find((chip) => chip.textContent?.includes('Calls'))!
    expect(callsChip).toBeTruthy()
    expect(callsChip.textContent).toContain('1')
    await click(callsChip)
    await waitFor(() => r.container.textContent!.includes('Call the plumber'), 'the matching task')
    expect(r.container.querySelector('[data-resume-tasks]')!.textContent).not.toContain('File the receipts')
    expect(r.container.querySelector('[data-resume-edit-labels]')).toBeTruthy()
    await click(chips.find((chip) => chip.textContent?.startsWith('All'))!)
    expect(r.container.querySelector('[data-resume-tasks]')!.textContent).not.toContain('Book the fitters')
    await r.unmount()
  })

  it('offers ordinary label editing when no open task has a label yet', async () => {
    const first = await createTask({ title: 'Get three quotes' })
    await createTask({ title: 'Book the fitters' })
    const r = await render(<ResumeView />)
    await waitFor(() => !!r.container.querySelector('[data-resume-no-labels]'), 'the no-label state')
    expect(r.container.textContent).toContain('No other open task has a label yet.')
    await click(r.container.querySelector('[data-resume-edit-labels]')!)
    await waitFor(() => !!document.querySelector('[data-context-labels-picker]'), 'the label picker')
    const picker = document.querySelector('[data-context-labels-picker]')!
    const field = picker.querySelector<HTMLInputElement>('input[role="combobox"]')!
    await type(field, 'Calls')
    await waitFor(() => [...document.querySelectorAll<HTMLElement>('[role="option"]')].some((option) => option.textContent?.includes('Calls')), 'the create option')
    await key(field, 'Enter')
    await waitFor(async () => (await db.labels.toArray()).some((label) => label.name === 'Calls'), 'the created label')
    const label = (await db.labels.toArray()).find((l) => l.name === 'Calls')!
    expect((await db.tasks.get(first))?.labels).toEqual([label.id])
    await r.unmount()
  })

  it('offers a matching dossier after capture and attaches only on confirm', async () => {
    const dossier = await createDossier('Pneus avant · BMW')
    const member = await createTask({ title: 'Commander les pneus avant' })
    await attachTaskToDossier(dossier.id, member)
    const r = await render(<ResumeView />)
    await waitFor(() => !!r.container.querySelector('[data-resume-capture] input'), 'the capture field')
    const input = r.container.querySelector<HTMLInputElement>('[data-resume-capture] input')!
    await type(input, 'BMW garage confirmed')
    await act(async () => { r.container.querySelector('[data-resume-capture] form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })) })
    await waitFor(() => !!dossierLinkOffer(), 'the local offer')
    const task = (await db.tasks.toArray()).find((t) => t.title === 'BMW garage confirmed')!
    expect(task).toBeTruthy()
    expect(dossierLinkOffer()?.candidateIds[0]).toBe(dossier.id)
    expect((await db.dossiers.get(dossier.id))?.task_ids).toEqual([member])
    await waitFor(() => !!document.querySelector('[data-dossier-link-card]'), 'the offer card')
    await click(document.querySelector('[data-dossier-link-confirm]')!)
    await waitFor(async () => !!(await db.dossiers.get(dossier.id))?.task_ids.includes(task.id), 'the confirmed attachment')
    await r.unmount()
  })
  it('lists only the other dossiers under the featured card', async () => {
    const first = await createDossier('Pneus avant · BMW')
    await attachTaskToDossier(first.id, await createTask({ title: 'Commander les pneus avant' }))
    const r = await render(<ResumeView />)
    await waitFor(() => !!r.container.querySelector('[data-dossier-card]'), 'the featured card')
    expect(r.container.querySelector('[data-resume-dossiers]')).toBeNull()
    const second = await createDossier('Cuisine')
    await attachTaskToDossier(second.id, await createTask({ title: 'Installer étagère' }))
    await waitFor(() => r.container.querySelectorAll('[data-dossier-row]').length === 1, 'the other dossier row')
    await r.unmount()
  })
})
