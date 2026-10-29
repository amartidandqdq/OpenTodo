// @vitest-environment happy-dom
// "Ma journée" (fork change `my-day-sun`, resume-dossiers D5): today's threads and
// tasks are shown above Today's groups, and the sun is not a second kind of date.
import 'fake-indexeddb/auto'
import { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db, useDatabase } from '../lib/db'
import { setDateTime } from '../lib/dates'
import { attachTaskToDossier, createDossier, setDossierWaiting } from '../lib/dossiers'
import { createTask, mutate, resetDeviceId } from '../lib/ops'
import { render, waitFor } from '../ui/test-utils'
import { resetPanel } from './panel'
import { TaskListView } from './TaskListView'

let n = 0
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 9, 14, 12, 0))
  useDatabase(`today-focus-${Date.now()}-${n++}`)
  resetDeviceId()
  setDateTime({ date_format: 'day-month', time_format: '24h', week_start: 'mon' }, { order: 'MD', hour12: true, weekStart: 1 })
})
afterEach(() => {
  vi.useRealTimers()
  resetPanel()
  setDateTime({ date_format: 'system', time_format: 'system', week_start: 'system' })
})

describe('Today summary line', () => {
  it('reads what is chosen, the next timed task and what is earlier under the title', async () => {
    const id = await createTask({ title: 'Appeler le garage' })
    await mutate('review', 'me', { focus_date: '2026-10-14', focus: id })
    await createTask({ title: 'Dentiste', due: { date: '2026-10-14', time: '14:30' } })
    await createTask({ title: 'Facture', due: { date: '2026-10-10' } })
    const r = await render(<TaskListView route={{ view: 'today' }} />)
    await waitFor(() => r.container.querySelector('[data-today-summary]')?.textContent?.includes('1 earlier') ?? false, 'the summary line')
    const line = r.container.querySelector('[data-today-summary]')!.textContent!
    expect(line).toContain('1 chosen for today')
    expect(line).toContain('next appointment 14:30 Dentiste')
    expect(line).not.toContain('nothing earlier')
  })

  it('says nothing earlier when no open task is earlier, and leaves out an empty part', async () => {
    await createTask({ title: 'Plus tard', due: { date: '2026-10-20' } })
    const r = await render(<TaskListView route={{ view: 'today' }} />)
    await waitFor(() => r.container.querySelector('[data-today-summary]')?.textContent?.includes('nothing earlier') ?? false, 'the summary line')
    expect(r.container.querySelector('[data-today-summary]')!.textContent).not.toContain('chosen')
    expect(r.container.querySelector('[data-today-summary]')!.textContent).not.toContain('appointment')
  })
})

describe('Ma journée', () => {
  it('shows a task chosen with the sun above Today, without giving it a due date', async () => {
    const id = await createTask({ title: 'Appeler le garage' })
    await mutate('review', 'me', { focus_date: '2026-10-14', focus: id })
    const r = await render(<TaskListView route={{ view: 'today' }} />)
    await waitFor(() => r.container.textContent!.includes('Appeler le garage'), 'the task in My day')
    const section = r.container.querySelector('[data-today-focus]')!
    expect(section.textContent).toContain('My day')
    expect(section.textContent).toContain('Appeler le garage')
    expect(section.textContent).not.toContain('2026-10-15')
    expect(r.container.querySelector('[data-empty-state="today"]')).toBeNull()
    // A focus-only day is planned work, not a clear day (resume-dossiers D5).
    await waitFor(() => r.container.querySelector('[data-briefing="today"]')?.textContent?.includes('One task is planned') ?? false, 'the briefing counting the focus')
  })

  it('shows a chosen task due today once, in My day and not again in Today’s groups', async () => {
    const id = await createTask({ title: 'Payer le loyer', due: { date: '2026-10-14' } })
    await mutate('review', 'me', { focus_date: '2026-10-14', focus: id })
    const r = await render(<TaskListView route={{ view: 'today' }} />)
    await waitFor(() => r.container.querySelector('[data-today-focus]')?.textContent?.includes('Payer le loyer') ?? false, 'the chosen task in My day')
    expect(r.container.querySelectorAll(`[data-task-id="${id}"]`).length).toBe(1)
    expect(r.container.querySelector('[data-empty-state="today"]')).toBeNull()
  })

  it('shows a chosen dossier before the chosen tasks and does not repeat its due step in Today’s groups', async () => {
    const id = await createTask({ title: 'Prendre rendez-vous', due: { date: '2026-10-14' } })
    const { id: dossierId } = await createDossier('Pneus avant')
    await attachTaskToDossier(dossierId, id)
    await mutate('review', 'me', { focus_date: '2026-10-14', focus: '', focus_dossiers: [dossierId] })
    const r = await render(<TaskListView route={{ view: 'today' }} />)
    await waitFor(() => r.container.querySelector('[data-today-focus-dossiers]')?.textContent?.includes('Pneus avant') ?? false, 'the chosen dossier')
    const section = r.container.querySelector('[data-today-focus]')!
    expect(section.textContent).toContain('Prendre rendez-vous')
    // The row is in the dossier card, never twice in Today's ordinary groups.
    expect(r.container.querySelectorAll(`[data-task-id="${id}"]`).length).toBe(0)
    expect(r.container.querySelector('[data-empty-state="today"]')).toBeNull()
    await waitFor(() => r.container.querySelector('[data-briefing]')?.textContent?.includes('One task is planned') ?? false, 'the briefing counting the dossier step')
    // The sun on the chosen card removes it without touching the task's due date.
    await act(async () => { r.container.querySelector<HTMLButtonElement>('[data-dossier-focus]')!.click() })
    await waitFor(() => r.container.querySelector('[data-today-focus-dossiers]') === null, 'the dossier left My day')
    expect((await db.review.get('me'))?.focus_dossiers).toEqual([])
    expect((await db.tasks.get(id))?.due).toEqual({ date: '2026-10-14' })
  })

  it('shows a waiting dossier on hold and does not count its next task as planned today', async () => {
    const id = await createTask({ title: 'Monter les pneus' })
    const { id: dossierId } = await createDossier('Pneus avant')
    await attachTaskToDossier(dossierId, id)
    await setDossierWaiting(dossierId, 'La livraison', null)
    await mutate('review', 'me', { focus_date: '2026-10-14', focus: '', focus_dossiers: [dossierId] })
    const r = await render(<TaskListView route={{ view: 'today' }} />)
    await waitFor(() => r.container.querySelector('[data-dossier-state="waiting"]')?.textContent?.includes('La livraison') ?? false, 'the held thread')
    expect(r.container.querySelector('[data-dossier-state="waiting"]')?.textContent).toContain('On hold')
    expect(r.container.querySelector('[data-empty-state="today"]')).toBeNull()
    await waitFor(() => r.container.querySelector('[data-briefing]')?.getAttribute('data-briefing') === 'clear', 'a briefing that does not count the held step')
    expect(r.container.querySelector('[data-briefing]')!.textContent).not.toContain('One task is planned')
  })

  it('briefs a focus-only day with the next step of a chosen dossier, undated', async () => {
    const id = await createTask({ title: 'Commander les pneus', estimate_minutes: 25 })
    const { id: dossierId } = await createDossier('Pneus avant')
    await attachTaskToDossier(dossierId, id)
    await mutate('review', 'me', { focus_date: '2026-10-14', focus: '', focus_dossiers: [dossierId] })
    const r = await render(<TaskListView route={{ view: 'today' }} />)
    await waitFor(() => r.container.querySelector('[data-dossier-card]')?.textContent?.includes('Commander les pneus') ?? false, 'the dossier next step')
    await waitFor(() => r.container.querySelector('[data-briefing="today"]')?.textContent?.includes('One task is planned') ?? false, 'the briefing counting the undated step')
    expect(r.container.querySelector('[data-briefing]')!.textContent).not.toContain('Nothing is planned')
    await waitFor(() => r.container.textContent!.includes('25m planned'), 'the header including the chosen dossier estimate')
    expect(r.container.querySelector('[data-empty-state="today"]')).toBeNull()
    expect(r.container.querySelectorAll(`[data-task-id="${id}"]`).length).toBe(0)
  })

  it('does not resurrect yesterday’s task and dossier focus', async () => {
    const id = await createTask({ title: 'Hier' })
    const { id: dossierId } = await createDossier('Hier aussi')
    await attachTaskToDossier(dossierId, id)
    await mutate('review', 'me', { focus_date: '2026-10-13', focus: id, focus_dossiers: [dossierId] })
    const r = await render(<TaskListView route={{ view: 'today' }} />)
    await waitFor(() => r.container.querySelector('[data-empty-state="today"]') !== null, 'Today rendered')
    expect(r.container.querySelector('[data-today-focus]')).toBeNull()
    expect(r.container.querySelector(`[data-dossier-card="${dossierId}"]`)).toBeNull()
  })
})
