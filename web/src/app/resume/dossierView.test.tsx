// @vitest-environment happy-dom
// One dossier (OpenSpec change resume-dossiers): the next step follows the live
// tasks, attach/detach/reorder rewrite only task_ids, a hold never dates a task,
// and every write offers the same Undo as the rest of the app.
import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setDateTime } from '../../lib/dates'
import { db, useDatabase } from '../../lib/db'
import { attachTaskToDossier, createDossier, updateDossier } from '../../lib/dossiers'
import { createProject, createTask, resetDeviceId } from '../../lib/ops'
import { undoBatch } from '../../lib/undo'
import { bulkToast } from '../bulk/toastStore'
import { act } from 'react'
import { click, key, render, type, waitFor } from '../../ui/test-utils'
import { DossierView } from './DossierView'

let n = 0
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 9, 14, 12, 0))
  useDatabase(`dossier-view-${Date.now()}-${n++}`)
  resetDeviceId()
  setDateTime({ date_format: 'day-month', time_format: '24h', week_start: 'mon' }, { order: 'DM', hour12: false, weekStart: 1 })
})
afterEach(() => {
  vi.useRealTimers()
  setDateTime({ date_format: 'system', time_format: 'system', week_start: 'system' })
})

async function seedDossier(name = 'Kitchen', due = '2026-10-20') {
  const home = await createProject({ name: 'Home' })
  const quotes = await createTask({ title: 'Get three quotes', project_id: home, due: { date: due } })
  const fitters = await createTask({ title: 'Book the fitters', project_id: home })
  const { id } = await createDossier(name)
  await attachTaskToDossier(id, quotes)
  await attachTaskToDossier(id, fitters)
  return { id, quotes, fitters, home }
}

describe('DossierView', () => {
  it('shows a missing-target page for a deleted dossier without recreating it', async () => {
    const r = await render(<DossierView id="missing" />)
    await waitFor(() => r.container.textContent!.includes('This dossier is no longer there.'), 'the missing page')
    expect(r.container.textContent).toContain('Pick up the thread')
    expect(await db.dossiers.count()).toBe(0)
    await r.unmount()
  })

  it('insets the new-task row on narrow screens so it clears the floating add button', async () => {
    const { id } = await seedDossier()
    const r = await render(<DossierView id={id} />)
    await waitFor(() => !!r.container.querySelector('[data-dossier-new-task]'), 'the new task button')
    expect(r.container.querySelector('[data-dossier-new-task]')!.parentElement!.className).toContain('max-md:pe-[4.5rem]')
    await r.unmount()
  })

  it('drags a step below the other and saves the new order', async () => {
    const { id, quotes, fitters } = await seedDossier()
    const r = await render(<DossierView id={id} />)
    await waitFor(() => !!r.container.querySelector(`[data-dossier-step="${fitters}"]`), 'the steps')
    const first = r.container.querySelector<HTMLElement>(`[data-dossier-step="${quotes}"]`)!
    const second = r.container.querySelector<HTMLElement>(`[data-dossier-step="${fitters}"]`)!
    second.getBoundingClientRect = () => ({ top: 100, height: 40, bottom: 140, left: 0, right: 300, width: 300, x: 0, y: 100, toJSON: () => ({}) })
    const at = vi.spyOn(document, 'elementFromPoint').mockReturnValue(second)
    await act(async () => {
      first.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 1, pointerType: 'mouse', button: 0, clientX: 50, clientY: 50 }))
      window.dispatchEvent(new PointerEvent('pointermove', { pointerId: 1, pointerType: 'mouse', clientX: 50, clientY: 130 }))
    })
    await waitFor(() => !!r.container.querySelector('[data-drop-indicator="after"]'), 'the drop line below the second step')
    await act(async () => { window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, pointerType: 'mouse', clientX: 50, clientY: 130 })) })
    await waitFor(async () => (await db.dossiers.get(id))?.task_ids.join() === [fitters, quotes].join(), 'the saved order')
    expect(r.container.querySelector('[data-drop-indicator]')).toBeNull()
    at.mockRestore()
    await r.unmount()
  })

  it('advances to the following open task and reopens the earlier step', async () => {
    const { id, quotes, fitters } = await seedDossier()
    const r = await render(<DossierView id={id} />)
    await waitFor(() => r.container.textContent!.includes('Get three quotes'), 'the dossier')
    await click(r.container.querySelector('[data-dossier-complete]')!)
    await waitFor(async () => !!(await db.tasks.get(quotes))?.completed_at, 'the completed step')
    await waitFor(() => r.container.querySelector('[data-dossier-next]')!.textContent!.includes('Book the fitters'), 'the next step')
    expect(r.container.querySelector(`[data-dossier-step="${fitters}"]`)?.hasAttribute('data-current')).toBe(true)
    const reopen = r.container.querySelector(`[data-dossier-step="${quotes}"] button[aria-label*="Reopen Get three quotes"]`)!
    await click(reopen)
    await waitFor(async () => !(await db.tasks.get(quotes))?.completed_at, 'the reopened step')
    await waitFor(() => r.container.querySelector('[data-dossier-next]')!.textContent!.includes('Get three quotes'), 'the earlier step back')
    await r.unmount()
  })

  it('attaches an existing task and Undo detaches it without deleting it', async () => {
    const { id } = await seedDossier()
    const candidate = await createTask({ title: 'Buy tiles' })
    const r = await render(<DossierView id={id} />)
    await waitFor(() => !!r.container.querySelector('[data-dossier-attach] input[role="combobox"]'), 'the attach picker')
    const field = r.container.querySelector<HTMLInputElement>('[data-dossier-attach] input[role="combobox"]')!
    await act(async () => { field.focus(); field.dispatchEvent(new FocusEvent('focus')); field.dispatchEvent(new FocusEvent('focusin', { bubbles: true })) })
    await type(field, 'Buy tiles')
    await waitFor(() => [...document.querySelectorAll<HTMLElement>('[role="option"]')].some((o) => o.textContent?.includes('Buy tiles')), 'the candidate')
    await key(field, 'Enter')
    await waitFor(async () => !!(await db.dossiers.get(id))?.task_ids.includes(candidate), 'the attachment')
    const undoId = bulkToast()?.undoId
    expect(undoId).toBeTruthy()
    await undoBatch(undoId!)
    await waitFor(async () => !(await db.dossiers.get(id))?.task_ids.includes(candidate), 'the undo')
    expect(await db.tasks.get(candidate)).toBeTruthy()
    await r.unmount()
  })

  it('reorders the thread without touching the tasks', async () => {
    const { id, quotes, fitters } = await seedDossier()
    const r = await render(<DossierView id={id} />)
    await waitFor(() => !!r.container.querySelector(`[data-dossier-step="${quotes}"] button[aria-label="Actions for Get three quotes"]`), 'the step menu')
    await click(r.container.querySelector(`[data-dossier-step="${quotes}"] button[aria-label="Actions for Get three quotes"]`)!)
    await waitFor(() => !!document.querySelector('[role="menu"]'), 'the open menu')
    const move = [...document.querySelectorAll<HTMLElement>('[role="menuitem"]')].find((item) => item.textContent?.includes('Move down'))!
    await click(move)
    await waitFor(async () => (await db.dossiers.get(id))?.task_ids[0] === fitters, 'the swapped order')
    expect((await db.tasks.get(quotes))?.completed_at).toBeNull()
    await r.unmount()
  })

  it('reorders across an unavailable id instead of silently doing nothing', async () => {
    const { id, quotes, fitters } = await seedDossier()
    await db.dossiers.update(id, { task_ids: [quotes, 'gone', fitters] })
    const r = await render(<DossierView id={id} />)
    await waitFor(() => !!r.container.querySelector(`[data-dossier-step="${quotes}"] button[aria-label="Actions for Get three quotes"]`), 'the step menu')
    await click(r.container.querySelector(`[data-dossier-step="${quotes}"] button[aria-label="Actions for Get three quotes"]`)!)
    await waitFor(() => !!document.querySelector('[role="menu"]'), 'the open menu')
    const move = [...document.querySelectorAll<HTMLElement>('[role="menuitem"]')].find((item) => item.textContent?.includes('Move down'))!
    await click(move)
    await waitFor(async () => (await db.dossiers.get(id))?.task_ids[0] === fitters, 'the visible swap')
    expect((await db.dossiers.get(id))?.task_ids).toContain('gone')
    await r.unmount()
  })

  it('names a deleted member, keeps its id, and removes it only on the explicit action', async () => {
    const { id, quotes } = await seedDossier()
    await db.tasks.update(quotes, { deleted_at: Date.now() })
    const r = await render(<DossierView id={id} />)
    await waitFor(() => r.container.textContent!.includes('Get three quotes'), 'the named deleted member')
    expect(r.container.querySelector('[data-dossier-unavailable]')).toBeTruthy()
    expect((await db.dossiers.get(id))?.task_ids).toContain(quotes)
    const remove = [...r.container.querySelectorAll<HTMLButtonElement>('button')].find((button) => button.textContent === 'Remove them')!
    await click(remove)
    await waitFor(async () => !(await db.dossiers.get(id))?.task_ids.includes(quotes), 'the explicit cleanup')
    await r.unmount()
  })

  it('holds and resumes the thread without changing a task due date, and Undo restores the wait', async () => {
    const { id, quotes } = await seedDossier('Tyres', '2026-11-05')
    const r = await render(<DossierView id={id} />)
    await waitFor(() => r.container.textContent!.includes('Put on hold'), 'the hold action')
    const hold = [...r.container.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent?.includes('Put on hold'))!
    await click(hold)
    await waitFor(() => !!document.querySelector('[data-dossier-hold-save]'), 'the hold dialog')
    const waiting = document.querySelector<HTMLInputElement>('input[placeholder="The delivery"]')!
    await type(waiting, 'the delivery')
    await click(document.querySelector('[data-dossier-hold-save]')!)
    await waitFor(async () => (await db.dossiers.get(id))?.waiting === true, 'the hold')
    expect((await db.dossiers.get(id))?.waiting_for).toBe('the delivery')
    expect((await db.tasks.get(quotes))?.due).toEqual({ date: '2026-11-05' })
    await waitFor(() => !!r.container.querySelector('[data-dossier-follow-up] input'), 'the inline follow-up')
    const date = r.container.querySelector<HTMLInputElement>('[data-dossier-follow-up] input')!
    await type(date, '02/11/2026')
    await key(date, 'Enter')
    await waitFor(async () => (await db.dossiers.get(id))?.follow_up === '2026-11-02', 'the follow-up date')
    await waitFor(() => bulkToast()?.label === 'Follow-up date changed', 'the follow-up undo entry')
    const previousUndo = bulkToast()?.undoId
    await click(r.container.querySelector('[data-dossier-resume]')!)
    await waitFor(async () => !(await db.dossiers.get(id))?.waiting, 'the resume')
    await waitFor(() => !!bulkToast()?.undoId && bulkToast()?.undoId !== previousUndo && bulkToast()?.label === 'Tyres resumed', 'the resume undo entry')
    expect((await db.dossiers.get(id))?.follow_up).toBeNull()
    expect((await db.tasks.get(quotes))?.due).toEqual({ date: '2026-11-05' })
    const undoId = bulkToast()?.undoId
    expect(undoId).toBeTruthy()
    await act(async () => { await undoBatch(undoId!) })
    await waitFor(async () => (await db.dossiers.get(id))?.waiting === true, 'the restored wait')
    expect((await db.dossiers.get(id))?.follow_up).toBe('2026-11-02')
    await r.unmount()
  })

  it('creates a first task in one batch, shows the note, and Undo removes both the task and the step', async () => {
    const { id } = await createDossier('Réparations')
    await updateDossier(id, { note: 'Measure twice.' })
    const r = await render(<DossierView id={id} />)
    await waitFor(() => !!r.container.querySelector('[data-dossier-note]'), 'the note')
    expect(r.container.querySelector('[data-dossier-note]')!.textContent).toContain('Measure twice.')
    expect(r.container.querySelector('[data-dossier-step]')).toBeNull()
    await click(r.container.querySelector('[data-dossier-new-task]')!)
    await waitFor(() => !!document.querySelector('[data-dossier-new-save]'), 'the new task dialog')
    const title = document.querySelector<HTMLInputElement>('input[placeholder="A first step"]')!
    await type(title, 'Call the mason')
    await click(document.querySelector('[data-dossier-new-save]')!)
    await waitFor(async () => (await db.dossiers.get(id))?.task_ids.length === 1, 'the new step')
    const taskId = (await db.dossiers.get(id))!.task_ids[0]
    const task = (await db.tasks.get(taskId))!
    expect(task.title).toBe('Call the mason')
    await waitFor(() => r.container.textContent!.includes('Call the mason'), 'the step row')
    const undoId = bulkToast()?.undoId
    expect(undoId).toBeTruthy()
    await undoBatch(undoId!)
    await waitFor(async () => (await db.dossiers.get(id))?.task_ids.length === 0, 'the undone step')
    expect((await db.tasks.get(taskId))?.deleted_at).toBeTruthy()
    await r.unmount()
  })

  it('keeps a read-only project out of the attach picker and disables its step completion', async () => {
    const shared = await createProject({ name: 'Shared' })
    const readOnlyStep = await createTask({ title: 'Read-only step', project_id: shared })
    await createTask({ title: 'Read-only candidate', project_id: shared })
    await db.memberships.put({ projectId: shared, role: 'viewer', ownerId: 'me', members: [{ userId: 'me', name: 'Ada', email: 'ada@example.com', role: 'viewer' }] } as never)
    await createTask({ title: 'Editable candidate' })
    const { id } = await createDossier('Shared thread')
    // A viewer cannot attach through the writer; this row is the older membership state a sync can leave behind.
    await db.dossiers.update(id, { task_ids: [readOnlyStep] })
    const r = await render(<DossierView id={id} />)
    await waitFor(() => !!r.container.querySelector('[data-dossier-complete]'), 'the step')
    expect(r.container.querySelector<HTMLButtonElement>('[data-dossier-complete]')!.disabled).toBe(true)
    const field = r.container.querySelector<HTMLInputElement>('[data-dossier-attach] input[role="combobox"]')!
    await act(async () => { field.focus(); field.dispatchEvent(new FocusEvent('focus')); field.dispatchEvent(new FocusEvent('focusin', { bubbles: true })) })
    await waitFor(() => [...document.querySelectorAll<HTMLElement>('[role="option"]')].some((option) => option.textContent?.includes('Editable candidate')), 'the editable candidate')
    const options = [...document.querySelectorAll<HTMLElement>('[role="option"]')].map((option) => option.textContent ?? '')
    expect(options.some((option) => option.includes('Read-only candidate'))).toBe(false)
    expect(options.some((option) => option.includes('Read-only step'))).toBe(false)
    await r.unmount()
  })
})
