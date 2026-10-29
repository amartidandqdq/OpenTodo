// @vitest-environment happy-dom
// "Replace which one?" (fork change `my-day-replace`): the sun on a fourth task asks which
// of the three in My day goes, instead of refusing; one batch, one Undo, the cap stays three.
import 'fake-indexeddb/auto'
import { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db, useDatabase } from '../lib/db'
import { setDateTime } from '../lib/dates'
import { createTask, mutate, resetDeviceId } from '../lib/ops'
import { undoBatch } from '../lib/undo'
import { key, render, waitFor } from '../ui/test-utils'
import { bulkToast, hideBulkToast } from './bulk/toastStore'
import { resetPanel } from './panel'
import { TaskListView } from './TaskListView'

const DAY = '2026-10-14'
let n = 0
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 9, 14, 12, 0))
  useDatabase(`focus-replace-${Date.now()}-${n++}`)
  resetDeviceId()
  setDateTime({ date_format: 'day-month', time_format: '24h', week_start: 'mon' }, { order: 'MD', hour12: true, weekStart: 1 })
})
afterEach(() => {
  vi.useRealTimers()
  hideBulkToast()
  resetPanel()
  setDateTime({ date_format: 'system', time_format: 'system', week_start: 'system' })
})

/** Three tasks already in My day, and a fourth task that is not. */
async function fullFocus() {
  const ids = [await createTask({ title: 'Appeler le garage', due: { date: DAY } }), await createTask({ title: 'Payer la facture', due: { date: DAY } }), await createTask({ title: 'Acheter du pain', due: { date: DAY } })]
  const fourth = await createTask({ title: 'Ranger le garage', due: { date: DAY } })
  await mutate('review', 'me', { focus_date: DAY, focus: ids.join(',') })
  return { ids, fourth }
}

const sunOf = (container: HTMLElement, id: string) => container.querySelector<HTMLButtonElement>(`[data-task-id="${id}"] [data-row-action="focus"]`)!
const popover = () => document.querySelector<HTMLElement>('[data-focus-replace]')

describe('Replace which one?', () => {
  it('opens the choice instead of refusing a fourth task, and writes nothing yet', async () => {
    const { ids, fourth } = await fullFocus()
    const r = await render(<TaskListView route={{ view: 'today' }} />)
    await waitFor(() => !!sunOf(r.container, fourth), 'the fourth task row')
    await act(async () => { sunOf(r.container, fourth).click() })
    await waitFor(() => !!popover(), 'the replace choice')
    expect(popover()!.querySelectorAll('[data-focus-replace-out]').length).toBe(3)
    for (const id of ids) expect(popover()!.querySelector(`[data-focus-replace-out="${id}"]`)).not.toBeNull()
    expect(bulkToast()?.label ?? '').not.toContain('holds')
    expect((await db.review.get('me'))?.focus).toBe(ids.join(','))
  })

  it('takes the chosen task out and puts the new one in, in one batch with one Undo', async () => {
    const { ids, fourth } = await fullFocus()
    const r = await render(<TaskListView route={{ view: 'today' }} />)
    await waitFor(() => !!sunOf(r.container, fourth), 'the fourth task row')
    await act(async () => { sunOf(r.container, fourth).click() })
    await waitFor(() => !!popover(), 'the replace choice')
    const before = await db.assistantUndo.count()
    await act(async () => { popover()!.querySelector<HTMLButtonElement>(`[data-focus-replace-out="${ids[1]}"]`)!.click() })
    await waitFor(() => !popover(), 'the choice closed')
    const row = await db.review.get('me')
    expect(row?.focus_date).toBe(DAY)
    expect(row?.focus).toBe([ids[0], ids[2], fourth].join(','))
    await waitFor(() => !!bulkToast()?.undoId, 'the Undo offer')
    expect(await db.assistantUndo.count()).toBe(before + 1)
    // The new task keeps its due date; Undo puts the old selection back in one step.
    expect((await db.tasks.get(fourth))?.due).toEqual({ date: DAY })
    await undoBatch(bulkToast()!.undoId!)
    expect((await db.review.get('me'))?.focus).toBe(ids.join(','))
  })

  it('closes on Escape and leaves My day as it was', async () => {
    const { ids, fourth } = await fullFocus()
    const r = await render(<TaskListView route={{ view: 'today' }} />)
    await waitFor(() => !!sunOf(r.container, fourth), 'the fourth task row')
    await act(async () => { sunOf(r.container, fourth).click() })
    await waitFor(() => !!popover(), 'the replace choice')
    await key(popover()!, 'Escape')
    await waitFor(() => !popover(), 'the choice closed by Escape')
    expect((await db.review.get('me'))?.focus).toBe(ids.join(','))
  })

  it('keeps the cap at three: a task added while there is room is not offered a choice', async () => {
    const a = await createTask({ title: 'Appeler le garage', due: { date: DAY } })
    const b = await createTask({ title: 'Payer la facture', due: { date: DAY } })
    await mutate('review', 'me', { focus_date: DAY, focus: a })
    const r = await render(<TaskListView route={{ view: 'today' }} />)
    await waitFor(() => !!sunOf(r.container, b), 'the second task row')
    await act(async () => { sunOf(r.container, b).click() })
    await waitFor(() => !!r.container.querySelector('[data-task-id]'), 'the rows')
    expect((await db.review.get('me'))?.focus).toBe(`${a},${b}`)
    expect(popover()).toBeNull()
  })
})
