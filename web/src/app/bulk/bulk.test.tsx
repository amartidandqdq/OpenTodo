// @vitest-environment happy-dom
// Bulk selection, bar, Actions menu and undo toast in a list (OpenSpec change
// bulk-edit, tasks 2.1, 2.3, 2.4, 2.5, 3.3, 4.2 and 5.1).
import 'fake-indexeddb/auto'
import { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db, useDatabase } from '../../lib/db'
import { setDateTime } from '../../lib/dates'
import { createDossier } from '../../lib/dossiers'
import { createLabel } from '../../lib/labels'
import { createProject, createTask, mutate, resetDeviceId, updateTask } from '../../lib/ops'
import { key, render, type, waitFor } from '../../ui/test-utils'
import type { Task } from '../../lib/types'
import { dossierMenuItem } from './BulkActions'
import { PanelHost } from '../PanelHost'
import { resetPanel } from '../panel'
import { TaskListView } from '../TaskListView'
import { hideBulkToast } from './toastStore'
import { UndoToast } from './UndoToast'

let n = 0
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 9, 14, 12, 0))
  useDatabase(`bulk-ui-${Date.now()}-${n++}`)
  resetDeviceId()
  setDateTime({ date_format: 'day-month', time_format: '24h', week_start: 'mon' }, { order: 'MD', hour12: true, weekStart: 1 })
})
const mounted: { unmount: () => Promise<void> }[] = []
afterEach(async () => {
  for (const r of mounted.splice(0)) await r.unmount()
  vi.useRealTimers()
  hideBulkToast()
  resetPanel()
  // A case that opened a task page leaves its address; the next list starts from the Inbox's.
  history.replaceState(null, '', '/')
})

const tickedTitles = () => [...document.querySelectorAll('[data-ticked] [data-tick]')].map((e) => e.getAttribute('aria-label')!.replace('Select ', ''))
const option = (name: string) => [...document.querySelectorAll('[data-picker-step] [role="option"]')].find((o) => o.textContent?.includes(name)) as HTMLElement | undefined
const errandOption = () => option('errand')
const bar = () => document.querySelector('[data-selection-bar] [role="status"]')?.textContent ?? null

async function inbox(...titles: string[]) {
  const ids: string[] = []
  for (const t of titles) ids.push(await createTask({ title: t }))
  const r = await render(<><TaskListView route={{ view: 'inbox' }} /><PanelHost /><UndoToast /></>)
  mounted.push(r)
  await waitFor(() => document.body.textContent!.includes(titles[titles.length - 1]))
  return { r, ids }
}

describe('ticking from the keyboard (2.1, 2.4)', () => {
  it('x then Shift+ArrowDown twice ticks three rows; the bar counts them; Escape clears', async () => {
    await inbox('One', 'Two', 'Three', 'Four')
    await key(document.body, 'j')
    await key(document.body, 'x')
    await waitFor(() => bar() === '1 selected')
    await key(document.body, 'ArrowDown', { shiftKey: true })
    await key(document.body, 'ArrowDown', { shiftKey: true })
    await waitFor(() => bar() === '3 selected')
    expect(tickedTitles()).toEqual(['One', 'Two', 'Three'])
    await key(document.body, 'Escape')
    await waitFor(() => bar() === null)
  })

  it('Space with no cursor and Ctrl+A with nothing ticked fall through to the browser', async () => {
    await inbox('One', 'Two')
    const space = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true })
    await act(async () => { document.body.dispatchEvent(space) })
    expect(space.defaultPrevented).toBe(false)
    const all = new KeyboardEvent('keydown', { key: 'a', ctrlKey: true, bubbles: true, cancelable: true })
    await act(async () => { document.body.dispatchEvent(all) })
    expect(all.defaultPrevented).toBe(false)
    await key(document.body, 'j')
    await key(document.body, ' ')
    await key(document.body, 'a', { ctrlKey: true })
    await waitFor(() => bar() === '2 selected')
  })

  it('Escape clears the ticks; Enter opens the selected task as its page (task-full-page)', async () => {
    const { ids } = await inbox('One', 'Two')
    await key(document.body, 'j')
    await key(document.body, 'x')
    expect(bar()).toBe('1 selected')
    await key(document.body, 'Escape')
    await waitFor(() => bar() === null)
    await key(document.body, 'Enter')
    // On the Inbox's split the task stood beside the list until Enter opened its page (inbox-split D1).
    await waitFor(() => ids.some((id) => location.pathname === `/task/${id}`))
  })
})

describe('ticking with the pointer (2.3)', () => {
  it('Shift+click ticks a range and opens nothing; the checkbox passes axe', async () => {
    await inbox('One', 'Two', 'Three')
    const box = (title: string) => document.querySelector(`[data-tick][aria-label="Select ${title}"]`) as HTMLInputElement
    await act(async () => { box('One').dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })) })
    await act(async () => { box('Three').dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, shiftKey: true })) })
    await waitFor(() => bar() === '3 selected')
    expect(document.querySelector('aside[data-detail-for]')).toBeNull()
    const axe = (await import('axe-core')).default
    const res = await axe.run(document.querySelector('ul, [role="list"]') ?? document.body, { rules: { 'color-contrast': { enabled: false } } })
    expect(res.violations.filter((v) => v.id !== 'region').map((v) => v.id)).toEqual([])
  })
})

describe('actions (2.5, 3.3, 4.2)', () => {
  it('c on three ticked rows completes them in one batch, and Undo restores them', async () => {
    const { ids } = await inbox('One', 'Two', 'Three')
    await key(document.body, 'j'); await key(document.body, 'x')
    await key(document.body, 'ArrowDown', { shiftKey: true }); await key(document.body, 'ArrowDown', { shiftKey: true })
    await db.outbox.clear()
    await key(document.body, 'c')
    await waitFor(() => !!document.querySelector('[data-bulk-toast]'))
    expect(document.querySelector('[data-bulk-toast]')!.textContent).toContain('3 tasks completed')
    expect(new Set((await db.outbox.toArray()).map((o) => o.ts)).size).toBe(1)
    await act(async () => { (document.querySelector('[data-bulk-toast] button') as HTMLButtonElement).click() })
    await waitFor(() => document.querySelector('[data-bulk-toast]')!.textContent!.includes('Undone: 3 restored'))
    for (const id of ids) expect((await db.tasks.get(id))!.completed_at).toBeNull()
  })

  it('`.` with four ticked opens a menu titled "4 tasks"; two projects disable Assign with the reason', async () => {
    const a = await createProject({ name: 'A' })
    await createTask({ title: 'In A', project_id: a })
    await inbox('One', 'Two', 'Three', 'Four')
    await key(document.body, 'j'); await key(document.body, 'x')
    for (let i = 0; i < 3; i++) await key(document.body, 'ArrowDown', { shiftKey: true })
    await key(document.body, '.')
    await waitFor(() => document.querySelectorAll('[role="menuitem"]').length > 0)
    expect(document.querySelector('[aria-label="Actions for 4 tasks"]')!.getAttribute('aria-expanded')).toBe('true')
    const assign = [...document.querySelectorAll('[role="menuitem"]')].find((m) => m.textContent?.includes('Assign'))!
    expect((assign as HTMLButtonElement).disabled).toBe(true)
    expect(document.body.textContent).toContain('Tasks must be in one shared project')
  })

  it('More on a row opens the menu at that button, without the Priority and Date its neighbours offer; `.` keeps them', async () => {
    await inbox('One', 'Two')
    const items = () => [...document.querySelectorAll('[role^="menuitem"]')].map((m) => m.textContent ?? '')
    const more = document.querySelector<HTMLButtonElement>('[data-task-id] [data-row-action="more"]')!
    await act(async () => { more.click() })
    await waitFor(() => items().length > 0)
    expect(items().some((m) => m.includes('Move to project'))).toBe(true)
    expect(items().some((m) => m.startsWith('Date') || m.startsWith('Priority'))).toBe(false)
    // Closing returns focus to the More button the menu was placed at.
    await key(document.activeElement as HTMLElement, 'Escape')
    await waitFor(() => items().length === 0)
    expect(document.activeElement).toBe(more)
    await key(document.body, 'j')
    await key(document.body, '.')
    await waitFor(() => items().length > 0)
    expect(items().some((m) => m.startsWith('Date…'))).toBe(true)
    expect(items().some((m) => m.startsWith('Priority…'))).toBe(true)
  })

  it('Priority and Date are one item each: their choices open in place, Escape goes back', async () => {
    await inbox('One')
    const items = () => [...document.querySelectorAll<HTMLElement>('[role^="menuitem"]')]
    const item = (label: string) => items().find((m) => m.textContent?.startsWith(label))
    await key(document.body, 'j')
    await key(document.body, '.')
    await waitFor(() => items().length > 0)
    expect(item('Priority 1')).toBeUndefined()
    expect(item('Tomorrow')).toBeUndefined()
    await act(async () => { item('Priority…')!.click() })
    await waitFor(() => !!item('Priority 4'))
    expect(item('Move to project')).toBeUndefined()
    expect(document.activeElement).toBe(item('Priority 1'))
    await key(document.activeElement as HTMLElement, 'Escape')
    await waitFor(() => !!item('Move to project'))
    expect(document.activeElement).toBe(item('Priority…'))
    await act(async () => { item('Date…')!.click() })
    await waitFor(() => !!item('Next week'))
    await act(async () => { item('Date')!.click() })
    await waitFor(() => !!item('Date…'))
  })

  it('Date → Tomorrow reschedules the ticked tasks', async () => {
    const { ids } = await inbox('One', 'Two', 'Three')
    await key(document.body, 'j'); await key(document.body, 'x')
    await key(document.body, 'ArrowDown', { shiftKey: true }); await key(document.body, 'ArrowDown', { shiftKey: true })
    await key(document.body, '.')
    await waitFor(() => document.querySelectorAll('[role="menuitem"]').length > 0)
    await act(async () => { ([...document.querySelectorAll('[role="menuitem"]')].find((m) => m.textContent?.startsWith('Date…')) as HTMLElement).click() })
    await waitFor(() => [...document.querySelectorAll('[role="menuitem"]')].some((m) => m.textContent?.startsWith('Tomorrow')))
    await act(async () => { ([...document.querySelectorAll('[role="menuitem"]')].find((m) => m.textContent?.startsWith('Tomorrow')) as HTMLElement).click() })
    await waitFor(() => !!document.querySelector('[data-bulk-toast]'))
    for (const id of ids) expect((await db.tasks.get(id))!.due).toEqual({ date: '2026-10-15' })
  })

  it('the Actions menu puts one task in My day and takes it back out', async () => {
    const { ids } = await inbox('Pay rent')
    const item = (label: string) => [...document.querySelectorAll<HTMLElement>('[role="menuitem"]')].find((m) => m.textContent?.startsWith(label))
    await key(document.body, 'j')
    await key(document.body, '.')
    await waitFor(() => !!item('Add to today’s focus'), 'the focus action')
    await act(async () => { item('Add to today’s focus')!.click() })
    await waitFor(async () => (await db.review.get('me'))?.focus === ids[0], 'the task in today’s focus')
    expect((await db.review.get('me'))?.focus_date).toBe('2026-10-14')
    await key(document.body, '.')
    await waitFor(() => !!item('Remove from today’s focus'), 'the remove action')
    await act(async () => { item('Remove from today’s focus')!.click() })
    await waitFor(async () => (await db.review.get('me'))?.focus === '', 'the empty focus')
  })

  it('the sun on a row puts it in My day without giving it a date', async () => {
    const { ids } = await inbox('Pay rent')
    const sun = document.querySelector<HTMLButtonElement>('[data-task-id] [data-row-action="focus"]')!
    expect(sun.getAttribute('aria-pressed')).toBe('false')
    await act(async () => { sun.click() })
    await waitFor(async () => (await db.review.get('me'))?.focus === ids[0], 'the task in today’s focus')
    await waitFor(() => sun.getAttribute('aria-pressed') === 'true', 'the sun marked pressed')
    expect((await db.tasks.get(ids[0]))?.due).toBeNull()
  })

  it('adding one task to the focus from a one-task menu keeps the tasks already chosen', async () => {
    const { ids } = await inbox('Pay rent', 'Call the bank')
    await act(async () => { await mutate('review', 'me', { focus_date: '2026-10-14', focus: ids[0] }) })
    await waitFor(async () => (await db.review.get('me'))?.focus === ids[0], 'the first task in the focus')
    const item = (label: string) => [...document.querySelectorAll<HTMLElement>('[role="menuitem"]')].find((m) => m.textContent?.startsWith(label))
    await key(document.body, 'j')
    await key(document.body, 'j')
    await key(document.body, '.')
    await waitFor(() => !!item('Add to today’s focus'), 'the focus action for the second task')
    await act(async () => { item('Add to today’s focus')!.click() })
    // The menu read held only the second task; the write must keep the first (review-full-tasks).
    await waitFor(async () => (await db.review.get('me'))?.focus === `${ids[0]},${ids[1]}`, 'both tasks in the focus')
  })

  it('Add to a dossier on one open task attaches it to the dossier picked, and a typed name creates one with it', async () => {
    const kitchen = await createDossier('Kitchen')
    const { ids } = await inbox('Get three quotes')
    const item = (label: string) => [...document.querySelectorAll<HTMLElement>('[role="menuitem"]')].find((m) => m.textContent?.startsWith(label))
    await key(document.body, 'j')
    await key(document.body, '.')
    await waitFor(() => !!item('Add to a dossier'), 'the dossier action')
    await act(async () => { item('Add to a dossier')!.click() })
    await waitFor(() => !!option('Kitchen'), 'the existing dossier')
    await act(async () => { option('Kitchen')!.click() })
    await waitFor(async () => !!(await db.dossiers.get(kitchen.id))?.task_ids.includes(ids[0]), 'the attached step')
    expect((await db.tasks.get(ids[0]))?.title).toBe('Get three quotes')

    // A name that matches no dossier creates one holding only this task.
    await key(document.body, 'Escape')
    await waitFor(() => !document.querySelector('[data-picker-step]'), 'the menu closed')
    await key(document.body, 'j')
    await key(document.body, '.')
    await waitFor(() => !!item('Add to a dossier'), 'the dossier action again')
    await act(async () => { item('Add to a dossier')!.click() })
    const field = document.querySelector<HTMLInputElement>('[data-picker-step] input[role="combobox"]')!
    await type(field, 'Garage')
    await waitFor(() => !!document.querySelector('[data-picker-step] [role="option"]'), 'the create option')
    await key(field, 'Enter')
    await waitFor(async () => (await db.dossiers.toArray()).some((d) => d.title === 'Garage'), 'the created dossier')
    const garage = (await db.dossiers.toArray()).find((d) => d.title === 'Garage')!
    expect(garage.task_ids).toEqual([ids[0]])
    expect((await db.tasks.get(ids[0]))?.title).toBe('Get three quotes')
  })

  it('L then "errand" adds it to the tasks lacking it and the picker stays open', async () => {
    const l = await createLabel({ name: 'errand' })
    const { ids } = await inbox('One', 'Two', 'Three')
    await updateTask(ids[0], { labels: [l] })
    await key(document.body, 'j'); await key(document.body, 'x')
    await key(document.body, 'ArrowDown', { shiftKey: true }); await key(document.body, 'ArrowDown', { shiftKey: true })
    await waitFor(() => bar() === '3 selected')
    await key(document.body, 'L', { shiftKey: true })
    await waitFor(() => !!document.querySelector('[data-picker-step]'))
    // Picked at once, before the menu's own read lands: the click reads the tasks itself.
    await act(async () => { ([...document.querySelectorAll('[data-picker-step] [role="option"]')].find((o) => o.textContent?.includes('errand')) as HTMLElement).click() })
    await waitFor(() => !!document.querySelector('[data-bulk-toast]'), 'the undo offer')
    // The toast can show before the batch's last row is read back; wait for the store.
    const labels = () => Promise.all(ids.map(async (id) => (await db.tasks.get(id))!.labels))
    await waitFor(async () => (await labels()).every((ls) => ls.length === 1), 'the label on every task')
    expect(await labels()).toEqual(ids.map(() => [l]))
    expect(document.querySelector('[data-picker-step]')).not.toBeNull()
    // The open picker follows the stored tasks: the label now on every task is marked.
    await waitFor(() => errandOption()?.getAttribute('aria-selected') === 'true')
  })

  it('a picker opened before the read marks the common label once the read lands (precision-polish-2)', async () => {
    const l = await createLabel({ name: 'errand' })
    await createLabel({ name: 'home' })
    const { ids } = await inbox('One', 'Two')
    for (const id of ids) await updateTask(id, { labels: [l] })
    await key(document.body, 'j'); await key(document.body, 'x')
    await key(document.body, 'ArrowDown', { shiftKey: true })
    await waitFor(() => bar() === '2 selected')
    await key(document.body, 'L', { shiftKey: true })
    await waitFor(() => !!document.querySelector('[data-picker-step]'))
    await waitFor(() => errandOption()?.getAttribute('aria-selected') === 'true')
    expect(option('home')?.getAttribute('aria-selected')).toBe('false')
    // Picking it removes it from both, and the mark goes away in the same open picker.
    await act(async () => { errandOption()!.click() })
    await waitFor(() => errandOption()?.getAttribute('aria-selected') === 'false')
    for (const id of ids) expect((await db.tasks.get(id))!.labels).toEqual([])
    // Let the pick's toast land here, not in the next case.
    await waitFor(() => !!document.querySelector('[data-bulk-toast]'))
  })

  it('L then a label every ticked task has removes it, even when picked at once', async () => {
    const l = await createLabel({ name: 'errand' })
    const { ids } = await inbox('One', 'Two')
    for (const id of ids) await updateTask(id, { labels: [l] })
    await key(document.body, 'j'); await key(document.body, 'x')
    await key(document.body, 'ArrowDown', { shiftKey: true })
    await waitFor(() => bar() === '2 selected')
    await key(document.body, 'L', { shiftKey: true })
    await waitFor(() => !!document.querySelector('[data-picker-step]'))
    await act(async () => { ([...document.querySelectorAll('[data-picker-step] [role="option"]')].find((o) => o.textContent?.includes('errand')) as HTMLElement).click() })
    const labels = () => Promise.all(ids.map(async (id) => (await db.tasks.get(id))!.labels))
    await waitFor(async () => (await labels()).every((ls) => ls.length === 0), 'the label off every task')
    expect(await labels()).toEqual(ids.map(() => []))
    // Let the pick's toast land here: shown after the write, it would otherwise
    // appear in the next case and pass for that case's own offer.
    await waitFor(() => !!document.querySelector('[data-bulk-toast]'), 'the undo offer')
  })

  it('Ctrl+Z undoes outside text fields, never inside a textarea', async () => {
    const { ids } = await inbox('One', 'Two')
    const priority = async () => (await db.tasks.get(ids[0]))!.priority
    await key(document.body, 'j'); await key(document.body, 'x')
    await waitFor(() => bar() === '1 selected', 'one row ticked')
    await key(document.body, '1')
    // This case's own offer and write, not a toast an earlier case left behind.
    await waitFor(async () => (await priority()) === 1, 'priority 1 stored')
    await waitFor(() => !!document.querySelector('[data-bulk-toast]')?.textContent?.includes('Priority'), 'the undo offer for the priority')
    const ta = document.createElement('textarea')
    document.body.append(ta)
    const inField = new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true, cancelable: true })
    await act(async () => { ta.dispatchEvent(inField) })
    expect(inField.defaultPrevented).toBe(false)
    expect(await priority()).toBe(1)
    await key(document.body, 'z', { ctrlKey: true })
    await waitFor(() => document.querySelector('[data-bulk-toast]')!.textContent!.includes('Undone'), 'Undone in the toast')
    await waitFor(async () => (await priority()) === 4, 'priority 4 back')
  })
})

describe('Add to a dossier in the task menu', () => {
  it('is offered only for one open task the person may edit', () => {
    const d = { dossiers: [] as never[], memberships: new Map() }
    const open = { id: 't1', title: 'Open', project_id: null, completed_at: null, deleted_at: null } as unknown as Task
    expect(dossierMenuItem(open, d)).toMatchObject({ kind: 'picker', id: 'dossier' })
    expect(dossierMenuItem({ ...open, completed_at: 5 } as Task, d)).toBeUndefined()
    expect(dossierMenuItem({ ...open, deleted_at: 5 } as Task, d)).toBeUndefined()
    expect(dossierMenuItem(undefined, d)).toBeUndefined()
  })
})
