// @vitest-environment happy-dom
// The dossier card (OpenSpec change resume-dossiers): its next action is the first
// live open task, a hold outranks a finished timeline, and the sun writes the same
// synced today's focus as a task's sun.
import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setDateTime } from '../../lib/dates'
import { db, useDatabase } from '../../lib/db'
import { UNDECRYPTABLE } from '../../lib/e2ee'
import { createDossier, attachTaskToDossier, setDossierWaiting } from '../../lib/dossiers'
import { createProject, createTask, resetDeviceId, setTaskCompleted } from '../../lib/ops'
import type { Dossier, Project, Task } from '../../lib/types'
import { click, key, render, type, waitFor } from '../../ui/test-utils'
import { DossierCard } from './DossierCard'

let n = 0
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 9, 14, 12, 0))
  useDatabase(`dossier-card-${Date.now()}-${n++}`)
  resetDeviceId()
  setDateTime({ date_format: 'day-month', time_format: '24h', week_start: 'mon' }, { order: 'DM', hour12: false, weekStart: 1 })
})
afterEach(() => {
  vi.useRealTimers()
  setDateTime({ date_format: 'system', time_format: 'system', week_start: 'system' })
})

async function rows(...ids: string[]): Promise<Map<string, Task>> {
  const all = await Promise.all(ids.map(async (id) => [id, (await db.tasks.get(id))!] as const))
  return new Map(all)
}

describe('DossierCard', () => {
  it('names the first live open task and the completed count, not a stored stage', async () => {
    const home = await createProject({ name: 'Home' })
    const quotes = await createTask({ title: 'Get three quotes', project_id: home })
    const fitters = await createTask({ title: 'Book the fitters', project_id: home })
    const paint = await createTask({ title: 'Choose the paint' })
    const created = await createDossier('Kitchen')
    for (const id of [quotes, fitters, paint]) await attachTaskToDossier(created.id, id)
    await setTaskCompleted(quotes, true)
    const dossier = (await db.dossiers.get(created.id)) as Dossier
    const taskMap = await rows(quotes, fitters, paint)
    const projectMap = new Map<string, Project>([[home, { id: home, name: 'Home', color: '#60816b', position: 0, archived: false, parent_id: null, created_at: 0, deleted_at: null, _clock: {} } as Project]])
    const r = await render(<DossierCard dossier={dossier} tasks={[...taskMap.values()]} projects={projectMap} focus={false} />)
    await waitFor(() => r.container.textContent!.includes('Book the fitters'), 'the next task')
    expect(r.container.querySelector('[data-dossier-next]')!.textContent).toContain('Book the fitters')
    expect(r.container.textContent).toContain('1 of 3 steps completed')
    expect(r.container.textContent).toContain('To advance')
    await r.unmount()
  })

  it('shows the hold rather than a finished state, with what is waited for and the date', async () => {
    const first = await createTask({ title: 'Order the tyres' })
    const second = await createTask({ title: 'Book the fitting' })
    const created = await createDossier('Tyres')
    for (const id of [first, second]) await attachTaskToDossier(created.id, id)
    await setTaskCompleted(first, true)
    await setTaskCompleted(second, true)
    await setDossierWaiting(created.id, 'the delivery', '2026-11-02')
    const dossier = (await db.dossiers.get(created.id)) as Dossier
    const taskMap = await rows(first, second)
    const r = await render(<DossierCard dossier={dossier} tasks={[...taskMap.values()]} projects={new Map()} focus={false} />)
    await waitFor(() => r.container.textContent!.includes('the delivery'), 'the wait')
    expect(r.container.querySelector('[data-dossier-card]')!.getAttribute('data-dossier-state')).toBe('waiting')
    expect(r.container.textContent).toContain('On hold')
    expect(r.container.textContent).toContain('Look again on')
    expect(r.container.textContent).not.toContain('Every step is complete')
    await r.unmount()
  })

  it('edits the follow-up date of a waiting thread on the card and leaves the task due date alone', async () => {
    const order = await createTask({ title: 'Order the tyres', due: { date: '2026-11-05' } })
    const created = await createDossier('Tyres')
    await attachTaskToDossier(created.id, order)
    await setDossierWaiting(created.id, 'the delivery', '2026-11-02')
    const dossier = (await db.dossiers.get(created.id)) as Dossier
    const r = await render(<DossierCard dossier={dossier} tasks={[(await db.tasks.get(order))!]} projects={new Map()} focus={false} />)
    await waitFor(() => !!r.container.querySelector('[data-dossier-follow-up] input'), 'the follow-up field')
    expect(r.container.textContent).toContain('Look again on')
    expect(r.container.textContent).toContain('Follow-up date, no due date on the task.')
    const input = r.container.querySelector<HTMLInputElement>('[data-dossier-follow-up] input')!
    await type(input, '05/11/2026')
    await key(input, 'Enter')
    await waitFor(async () => (await db.dossiers.get(created.id))?.follow_up === '2026-11-05', 'the card follow-up write')
    expect((await db.tasks.get(order))?.due).toEqual({ date: '2026-11-05' })
    await r.unmount()
  })

  it('shows the follow-up date read-only when no step of the thread can be edited', async () => {
    const order = await createTask({ title: 'Order the tyres' })
    const created = await createDossier('Tyres')
    await attachTaskToDossier(created.id, order)
    await setDossierWaiting(created.id, 'the delivery', '2026-11-02')
    const dossier = (await db.dossiers.get(created.id)) as Dossier
    const r = await render(<DossierCard dossier={dossier} tasks={[(await db.tasks.get(order))!]} projects={new Map()} focus={false} canEdit={() => false} />)
    await waitFor(() => r.container.textContent!.includes('the delivery'), 'the wait')
    expect(r.container.querySelector('[data-dossier-follow-up]')).toBeNull()
    expect(r.container.textContent).toContain('Look again on')
    await r.unmount()
  })

  it('degrades undecryptable words explicitly instead of printing the envelope', async () => {
    const created = await createDossier('Private thread')
    const dossier = { ...(await db.dossiers.get(created.id))!, title: UNDECRYPTABLE } as Dossier
    const r = await render(<DossierCard dossier={dossier} tasks={[]} projects={new Map()} focus={false} />)
    expect(r.container.textContent).toContain('[Cannot decrypt]')
    expect(r.container.querySelector('[data-dossier-encrypted]')).toBeTruthy()
    await r.unmount()
  })

  it('the sun writes focus_dossiers for today and toggles it back', async () => {
    const created = await createDossier('Kitchen')
    const dossier = (await db.dossiers.get(created.id)) as Dossier
    const r = await render(<DossierCard dossier={dossier} tasks={[]} projects={new Map()} />)
    await waitFor(() => !(r.container.querySelector<HTMLButtonElement>('[data-dossier-focus]')?.disabled), 'the loaded sun')
    await click(r.container.querySelector('[data-dossier-focus]')!)
    await waitFor(async () => !!(await db.review.get('me'))?.focus_dossiers?.includes(created.id), 'the focus write')
    const review = await db.review.get('me')
    expect(review?.focus_date).toBe('2026-10-14')
    await click(r.container.querySelector('[data-dossier-focus]')!)
    await waitFor(async () => !(await db.review.get('me'))?.focus_dossiers?.includes(created.id), 'the focus removal')
    await r.unmount()
  })
})
