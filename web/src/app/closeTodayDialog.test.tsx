// @vitest-environment happy-dom
// Close the day from Today (OpenSpec change close-day): the footer strip's tomorrow line,
// the dialog's one choice per My day task, Done as one batch, and "See you tomorrow".
import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../lib/db'
import { createTask, resetDeviceId, REVIEW_DEFAULTS } from '../lib/ops'
import type { User } from '../lib/types'
import { click, render, waitFor } from '../ui/test-utils'
import { hideBulkToast } from './bulk/toastStore'
import { resetPanel } from './panel'
import { navigate } from './router'
import { Shell } from './Shell'

const user = { id: 'u1', email: 'a@example.com', name: 'Ada', role: 'owner', createdAt: 0 } as User
const NOW = new Date(2026, 9, 14, 18, 42)
const TODAY = '2026-10-14'
const TOMORROW = '2026-10-15'

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(NOW)
  await db.delete()
  await db.open()
  await db.meta.put({ key: 'userId', value: 'u1' })
  resetDeviceId()
  resetPanel()
  hideBulkToast()
  localStorage.clear()
  vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 404 })))
  history.replaceState(null, '', '/')
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  resetPanel()
})

const shell = async () => { navigate({ view: 'today' }); return render(<Shell user={user} onLogout={() => {}} />) }
const footerLine = () => document.querySelector('[data-close-day] [data-tomorrow-line]')?.textContent ?? ''
const dialogLine = () => document.querySelector('[data-close-today] [data-tomorrow-line]')?.textContent ?? ''
const dialogRow = (id: string) => document.querySelector<HTMLElement>(`[data-close-today-row="${id}"]`)
const choose = async (id: string, choice: 'tomorrow' | 'another' | 'later') => {
  await click(dialogRow(id)!.querySelector<HTMLElement>(`[data-close-choice="${choice}"]`)!)
}
const doneButton = () => document.querySelector<HTMLButtonElement>('[data-close-today-done-button]')!
const openDialog = async () => {
  await waitFor(() => !!document.querySelector('[data-close-day-open]'))
  await click(document.querySelector<HTMLElement>('[data-close-day-open]')!)
  await waitFor(() => !!document.querySelector('[data-close-today]'))
}

describe('Close the day from Today', () => {
  it('the footer strip reads tomorrow: nothing planned when nothing is due tomorrow', async () => {
    const r = await shell()
    await waitFor(() => footerLine() !== '')
    expect(footerLine()).toBe('Tomorrow: nothing planned')
    await r.unmount()
  })

  it('the footer strip counts tomorrow and names its first appointment', async () => {
    await createTask({ title: 'Call the bank', due: { date: TOMORROW, time: '09:15' } })
    await createTask({ title: 'Renew passport', due: { date: TOMORROW } })
    const r = await shell()
    await waitFor(() => footerLine().includes('2 things'))
    expect(footerLine()).toContain('next appointment')
    expect(footerLine()).toContain('Call the bank')
    await r.unmount()
  })

  it('Done stays disabled until every My day task has a choice', async () => {
    const a = await createTask({ title: 'Write the report', due: { date: TODAY } })
    const b = await createTask({ title: 'Book the dentist' })
    await db.review.put({ ...REVIEW_DEFAULTS, id: 'me', focus_date: TODAY, focus: `${a},${b}`, _clock: {} })
    const r = await shell()
    await openDialog()
    expect(doneButton().disabled).toBe(true)
    await choose(a, 'tomorrow')
    expect(doneButton().disabled).toBe(true)
    await choose(b, 'later')
    await waitFor(() => !doneButton().disabled)
    await r.unmount()
  })

  it('the preview follows the choices, then Done writes them and shows See you tomorrow', async () => {
    const a = await createTask({ title: 'Write the report', due: { date: TODAY, time: '10:00' } })
    const b = await createTask({ title: 'Book the dentist', due: { date: TODAY } })
    const c = await createTask({ title: 'Water the plants', due: { date: TODAY } })
    await db.review.put({ ...REVIEW_DEFAULTS, id: 'me', focus_date: TODAY, focus: `${a},${b},${c}`, _clock: {} })
    const r = await shell()
    await openDialog()
    await choose(a, 'tomorrow')
    await choose(b, 'later')
    await choose(c, 'later')
    await waitFor(() => dialogLine().includes('1 thing'))
    await click(doneButton())
    await waitFor(() => !!document.querySelector('[data-close-today-done]'))
    expect(document.body.textContent).toContain('See you tomorrow')
    expect((await db.tasks.get(a))?.due).toEqual({ date: TOMORROW, time: '10:00' })
    expect((await db.tasks.get(b))?.due).toEqual({ date: TODAY })
    expect((await db.tasks.get(c))?.due).toEqual({ date: TODAY })
    const review = await db.review.get('me')
    expect(review?.focus).toBe('')
    expect(review?.closed_day).toBe(TODAY)
    expect(review?.closed_at).toBe(NOW.getTime())
    expect(JSON.parse(review!.carry_over!).items.some((i: { id: string; field: string }) => i.id === a && i.field === 'due')).toBe(true)
    await r.unmount()
  })

  it('with nothing in My day, Done is enabled at once and closes the day', async () => {
    const r = await shell()
    await openDialog()
    expect(document.querySelector('[data-close-today-empty]')).not.toBeNull()
    await click(doneButton())
    await waitFor(() => !!document.querySelector('[data-close-today-done]'))
    expect((await db.review.get('me'))?.closed_day).toBe(TODAY)
    await r.unmount()
  })
})
