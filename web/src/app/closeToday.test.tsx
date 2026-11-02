// @vitest-environment happy-dom
import 'fake-indexeddb/auto'
import { act } from 'react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { db, useDatabase } from '../lib/db'
import { createTask, mutate, resetDeviceId } from '../lib/ops'
import { undoBatch } from '../lib/undo'
import { render, waitFor } from '../ui/test-utils'
import { CloseTodayDialog } from './CloseTodayDialog'
import { bulkToast, hideBulkToast } from './bulk/toastStore'

const clock = vi.hoisted(() => ({ day: '2026-10-14' }))
vi.mock('./useViews', async (original) => ({ ...await original<object>(), useToday: () => clock.day }))
let n = 0
beforeEach(() => {
  useDatabase(`close-dialog-${n++}`)
  resetDeviceId()
  clock.day = '2026-10-14'
})
afterEach(() => { hideBulkToast() })

it('closes dossier steps once on the opening logical day, offers Undo and restores the whole selection', async () => {
  const day = clock.day
  const id = await createTask({ title: 'Next dossier step', due: { date: day, time: '10:00' } })
  await mutate('dossier', 'thread', { title: 'Thread', task_ids: [id] })
  await mutate('dossier', 'second', { title: 'Second', task_ids: [id] })
  await mutate('review', 'me', { focus_date: day, focus: '', focus_dossiers: ['thread', 'second'], closed_day: '2026-10-13', tomorrow_note: 'Old note' })
  const r = await render(<CloseTodayDialog onClose={() => {}} />)
  const rows = () => document.querySelectorAll('[data-close-today-row]')
  await waitFor(() => rows().length === 1, 'one deduplicated dossier step')
  const done = () => document.querySelector<HTMLButtonElement>('[data-close-today-done-button]')!
  expect(done().disabled).toBe(true)
  clock.day = '2026-10-15'
  await r.rerender(<CloseTodayDialog onClose={() => {}} />)
  expect(rows()).toHaveLength(1)
  await act(async () => { document.querySelector<HTMLButtonElement>('[data-close-choice="tomorrow"]')!.click() })
  await act(async () => { done().click() })
  await waitFor(() => !!document.querySelector('[data-close-today-done]'), 'confirmation')
  const row = await db.review.get('me')
  expect(row).toMatchObject({ focus: '', focus_dossiers: [], focus_date: day, closed_day: day, tomorrow_note: '' })
  expect((await db.tasks.get(id))?.due).toEqual({ date: '2026-10-15', time: '10:00' })
  expect(bulkToast()?.undoId).toBeTruthy()
  await undoBatch(bulkToast()!.undoId!)
  expect((await db.tasks.get(id))?.due).toEqual({ date: day, time: '10:00' })
  expect(await db.review.get('me')).toMatchObject({ focus_dossiers: ['thread', 'second'], closed_day: '2026-10-13', tomorrow_note: 'Old note' })
})

it('closes a selection containing only waiting and empty threads and offers Undo', async () => {
  await mutate('dossier', 'waiting', { title: 'Waiting', waiting: true })
  await mutate('dossier', 'empty', { title: 'Empty' })
  await mutate('review', 'me', { focus_date: clock.day, focus: '', focus_dossiers: ['waiting', 'empty'] })
  await render(<CloseTodayDialog onClose={() => {}} />)
  const done = () => document.querySelector<HTMLButtonElement>('[data-close-today-done-button]')
  await waitFor(() => !!done() && !done()!.disabled, 'empty selection can close')
  await act(async () => { done()!.click() })
  await waitFor(() => !!document.querySelector('[data-close-today-done]'), 'confirmation')
  expect((await db.review.get('me'))?.focus_dossiers).toEqual([])
  expect(bulkToast()?.undoId).toBeTruthy()
  await undoBatch(bulkToast()!.undoId!)
  expect((await db.review.get('me'))?.focus_dossiers).toEqual(['waiting', 'empty'])
})
