// @vitest-environment happy-dom
// The project's To do / Completed tabs (approved mockup A, openspec original-mockup-a):
// the view bar under the bordered capture. The Completed tab is local view state,
// shows only this project's completed tasks as flat rows, lets them reopen, and
// resets when the project changes; nothing in it writes tasks or stored preferences.
import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../lib/db'
import { createProject, createTask, resetDeviceId, setTaskCompleted } from '../lib/ops'
import { click, mockFetch, noPublicLinks, render, waitFor } from '../ui/test-utils'
import { TaskListView } from './TaskListView'

beforeEach(() => mockFetch(noPublicLinks))
afterEach(() => { vi.unstubAllGlobals() })
beforeEach(async () => {
  await db.delete()
  await db.open()
  resetDeviceId()
})

const tab = (c: HTMLElement, name: string) => c.querySelector<HTMLButtonElement>(`[data-mockup-tab="${name}"]`)!
const pageCount = (c: HTMLElement, name: string) => tab(c, name)!.querySelector('.mockup-count')!.textContent
const rowsWhere = (c: HTMLElement, m: RegExp) => [...c.querySelectorAll('[data-task-id]')].map((r) => r.textContent?.match(m)?.[0]).filter(Boolean)

async function groceries() {
  const pid = await createProject({ name: 'Groceries' })
  const milk = await createTask({ title: 'Milk', project_id: pid })
  const eggs = await createTask({ title: 'Eggs', project_id: pid })
  await createTask({ title: 'Bread', project_id: pid })
  await setTaskCompleted(milk, true)
  const at = Date.now()
  await waitFor(() => Date.now() > at, 'the next millisecond')
  await setTaskCompleted(eggs, true)
  return { pid, milk, eggs }
}

describe('the project view bar', () => {
  it('shows the To do / Completed tabs with their counts; the Completed tab lists the completed tasks, newest first, and reopening works', async () => {
    const { pid, eggs } = await groceries()
    const r = await render(<TaskListView route={{ view: 'project', id: pid }} />)
    await waitFor(() => r.container.textContent!.includes('Bread'))
    expect(pageCount(r.container, 'todo')).toBe('1')
    expect(pageCount(r.container, 'completed')).toBe('2')
    await click(tab(r.container, 'completed'))
    // Flat rows, no groups: no section headers between the tasks.
    await waitFor(() => rowsWhere(r.container, /Milk|Eggs/).length === 2)
    expect(rowsWhere(r.container, /Milk|Eggs|Bread/)).toEqual(['Eggs', 'Milk'])
    expect(r.container.querySelector('[data-completed-group]')).toBeNull()
    // Reopen one; it leaves the tab and returns to To do.
    await click(r.container.querySelector<HTMLButtonElement>(`[data-task-id="${eggs}"] button[aria-label^="Reopen"]`)!)
    await waitFor(async () => (await db.tasks.get(eggs))!.completed_at === null)
    await waitFor(() => pageCount(r.container, 'completed') === '1')
    await click(tab(r.container, 'todo'))
    await waitFor(() => rowsWhere(r.container, /Eggs/).includes('Eggs'))
    expect(rowsWhere(r.container, /Milk/)).toEqual([])
    await r.unmount()
})
})

  it('resets to the open list when the project changes', async () => {
    const { pid } = await groceries()
    const other = await createProject({ name: 'Home' })
    await createTask({ title: 'Paint the fence', project_id: other })
    const r = await render(<TaskListView route={{ view: 'project', id: pid }} />)
    await waitFor(() => r.container.textContent!.includes('Bread'))
    await click(tab(r.container, 'completed'))
    await waitFor(() => rowsWhere(r.container, /Eggs|Paint the fence/).length > 0)
    await r.rerender(<TaskListView route={{ view: 'project', id: other }} />)
    await waitFor(() => r.container.textContent!.includes('Paint the fence'))
    expect(rowsWhere(r.container, /Milk|Eggs/)).toEqual([])
    // A stored panel of the first project is not consulted: the new project shows its open tasks.
    expect(tab(r.container, 'completed')!.getAttribute('aria-current')).toBeNull()
    await r.unmount()
  })

  it('an empty Completed tab shows its quiet line, with no add-section prompt and no hidden-completed footer', async () => {
    const pid = await createProject({ name: 'Home' })
    await createTask({ title: 'Paint the fence', project_id: pid })
    const r = await render(<TaskListView route={{ view: 'project', id: pid }} userId="u1" />)
    await waitFor(() => r.container.textContent!.includes('Paint the fence'))
    expect(pageCount(r.container, 'completed')).toBe('0')
    await click(tab(r.container, 'completed'))
    await waitFor(() => r.container.querySelector('[data-completed-tab-empty]') !== null)
    expect(r.container.textContent).not.toContain('Add a section')
    expect(r.container.querySelector('[data-hidden-note]')).toBeNull()
    expect(r.container.querySelector("[data-empty-state='project']")).toBeNull()
    await r.unmount()
  })
