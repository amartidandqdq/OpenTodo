// @vitest-environment happy-dom
// Waiting shows dossiers on hold (OpenSpec change resume-dossiers): the wait and
// its follow-up date, never a late task, and resume clears only dossier fields.
import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setDateTime } from '../../lib/dates'
import { db, useDatabase } from '../../lib/db'
import { attachTaskToDossier, createDossier, setDossierWaiting } from '../../lib/dossiers'
import { createTask, resetDeviceId } from '../../lib/ops'
import { bulkToast } from '../bulk/toastStore'
import { click, render, waitFor } from '../../ui/test-utils'
import { WaitingDossiers } from './WaitingDossiers'

let n = 0
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 9, 14, 12, 0))
  useDatabase(`waiting-dossiers-${Date.now()}-${n++}`)
  resetDeviceId()
  setDateTime({ date_format: 'day-month', time_format: '24h', week_start: 'mon' }, { order: 'DM', hour12: false, weekStart: 1 })
})
afterEach(() => {
  vi.useRealTimers()
  setDateTime({ date_format: 'system', time_format: 'system', week_start: 'system' })
})

describe('WaitingDossiers', () => {
  it('lists the wait with its follow-up and resumes without changing the task', async () => {
    const task = await createTask({ title: 'Wait for the tiles', due: { date: '2026-11-05' } })
    const { id } = await createDossier('Bathroom')
    await attachTaskToDossier(id, task)
    await setDossierWaiting(id, 'the delivery', '2026-11-02')
    const r = await render(<WaitingDossiers />)
    await waitFor(() => !!r.container.querySelector('[data-waiting-dossiers]'), 'the waiting section')
    expect(r.container.textContent).toContain('A wait is not a late task.')
    expect(r.container.textContent).toContain('the delivery')
    expect(r.container.textContent).toContain('Look again on')
    await click(r.container.querySelector('[data-waiting-resume]')!)
    await waitFor(async () => (await db.dossiers.get(id))?.waiting === false, 'the resume')
    await waitFor(() => !r.container.querySelector('[data-waiting-dossiers]'), 'the section leaves')
    expect((await db.tasks.get(task))?.due).toEqual({ date: '2026-11-05' })
    expect(bulkToast()?.action?.label).toBe('Open the thread')
    await r.unmount()
  })

})
