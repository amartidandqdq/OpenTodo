// @vitest-environment happy-dom
// The Simple screen (OpenSpec change simple-mode, tasks 3.1 to 4.6): columns, rows,
// the star, subtasks, the completed row, moves, the field, the menu and the keys.
import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../../lib/db'
import { applyOps, createProject, createSubtask, createTask, resetDeviceId } from '../../lib/ops'
import { createSection } from '../../lib/sections'
import { resetAssistantStatus, setAssistantStatus, takeAssistantPrefill, type AssistantStatus } from '../../lib/assistantStatus'
import { setSimpleMode } from '../../lib/simpleMode'
import { USER_PREFS_ID } from '../../lib/userPrefs'
import { click, key, render, type, waitFor } from '../../ui/test-utils'
import { bulkToast, hideBulkToast } from '../bulk/toastStore'
import type { User } from '../../lib/types'
import { Shell } from '../Shell'
import { SimpleScreen } from './SimpleScreen'

const user = { id: 'u1', email: 'a@example.com', name: 'Ada', role: 'owner', created_at: 0 } as unknown as User

// The assistant panel is the assistant's own (tested there): here only what the screen asks it for.
vi.mock('../assistant/AssistantRoot', () => ({ default: () => null }))

const STATUS: AssistantStatus = {
  available: true, enabled: true, reason: '', provider: 'anthropic', provider_label: 'Anthropic', model: 'm', consented: true,
  disclosure_version: 1, fields: [], allow_member_keys: false, own_key_set: false, operator_key_set: true,
}

beforeEach(async () => {
  await db.delete()
  await db.open()
  resetDeviceId()
  resetAssistantStatus()
  hideBulkToast()
  localStorage.clear()
  history.replaceState(null, '', '/simple')
  window.dispatchEvent(new PopStateEvent('popstate'))
  // The assistant chunk may ask the server for skills or status once it opens: answer nothing.
  vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 404 })))
})
afterEach(() => { vi.unstubAllGlobals() })

const columnNames = (c: HTMLElement) => [...c.querySelectorAll('[data-simple-column] h2')].map((h) => h.textContent)
const titles = (c: HTMLElement, col: string) => [...c.querySelectorAll(`[data-simple-column="${col}"] > ul [data-simple-row] [data-simple-title]`)].map((b) => b.textContent)
const row = (c: HTMLElement, id: string) => c.querySelector<HTMLElement>(`[data-simple-row="${id}"]`)!
const field = (c: HTMLElement) => c.querySelector<HTMLInputElement>('[data-simple-field]')!

async function board() {
  const admin = await createProject({ name: 'Admin' })
  const home = await createProject({ name: 'Home' })
  const car = await createProject({ name: 'Car' })
  await createTask({ title: 'Buy paint' })
  await createTask({ title: 'Print diploma' })
  return { admin, home, car }
}

describe('lists as columns', () => {
  it('shows My tasks first, then every list in sidebar order, sections flattened without headers', async () => {
    const { home } = await board()
    const kitchen = await createSection(home, 'Kitchen')
    const garage = await createSection(home, 'Garage')
    await createTask({ title: 'Fix tap', project_id: home, section_id: kitchen })
    await createTask({ title: 'Sweep', project_id: home, section_id: garage })
    await createTask({ title: 'Paint cupboard', project_id: home, section_id: kitchen })
    const r = await render(<SimpleScreen />)
    // The sections arrive in their own query: wait for the order they give.
    await waitFor(() => titles(r.container, home).join() === 'Fix tap,Paint cupboard,Sweep', 'section order')
    expect(columnNames(r.container)).toEqual(['My tasks', 'Admin', 'Home', 'Car'])
    expect(titles(r.container, 'none')).toEqual(['Buy paint', 'Print diploma'])
    expect(titles(r.container, home)).toEqual(['Fix tap', 'Paint cupboard', 'Sweep'])
    expect(r.container.textContent).not.toContain('Kitchen')
    await r.unmount()
  })

  it('follows a rename from another device without a reload', async () => {
    const { car } = await board()
    const id = await createTask({ title: 'Call the garage', project_id: car })
    const r = await render(<SimpleScreen />)
    await waitFor(() => titles(r.container, car).includes('Call the garage'))
    await applyOps([{ id: 'remote-1', entity: 'task', entityId: id, field: 'title', value: 'Call the dealer', ts: Date.now() + 1000, device: 'phone' }] as never)
    await waitFor(() => titles(r.container, car).includes('Call the dealer'), 'remote rename')
    await r.unmount()
  })

  it('hides a list from the menu by writing only the preference', async () => {
    const { car } = await board()
    const before = await db.projects.get(car)
    const r = await render(<SimpleScreen />)
    await waitFor(() => columnNames(r.container).includes('Car'))
    await click(r.container.querySelector('[data-simple-menu]')!)
    await waitFor(() => !!document.querySelector('[data-menu-label="Car"]'))
    await click(document.querySelector('[data-menu-label="Car"]')!)
    await waitFor(() => !columnNames(r.container).includes('Car'), 'Car hidden')
    expect((await db.userPrefs.get(USER_PREFS_ID))?.simple_hidden).toEqual([car])
    expect(await db.projects.get(car)).toEqual(before)
    await r.unmount()
  })
})

describe('task rows', () => {
  it('completes a task into the completed row with an undo toast, and reopens it from there', async () => {
    const { car } = await board()
    const id = await createTask({ title: 'Call the garage', project_id: car })
    const r = await render(<SimpleScreen />)
    await waitFor(() => !!r.container.querySelector(`[data-simple-row="${id}"]`))
    await click(row(r.container, id).querySelector('[role="checkbox"]')!)
    await waitFor(() => !!r.container.querySelector(`[data-simple-completed="${car}"]`), 'completed row')
    expect(titles(r.container, car)).toEqual([])
    expect(r.container.querySelector(`[data-simple-completed="${car}"]`)!.textContent).toBe('Completed (1)')
    await waitFor(() => !!bulkToast()?.undoId, 'undo toast')
    await click(r.container.querySelector(`[data-simple-completed="${car}"]`)!)
    expect(localStorage.getItem(`ot:simple:completed:${car}`)).toBe('false')
    await click(row(r.container, id).querySelector('[role="checkbox"]')!)
    await waitFor(() => titles(r.container, car).includes('Call the garage'), 'reopened')
    await r.unmount()
  })

  it('stars to priority 1 and unstars to 4, and leaves priority 2 alone until starred', async () => {
    await board()
    const plain = await createTask({ title: 'Close the bank account' })
    const two = await createTask({ title: 'From the full app', priority: 2 })
    const r = await render(<SimpleScreen />)
    await waitFor(() => !!r.container.querySelector(`[data-simple-row="${two}"]`))
    const star = (id: string) => row(r.container, id).querySelector<HTMLElement>('button[aria-label$="tarred"]')!
    expect(star(two).getAttribute('aria-label')).toBe('Not starred')
    expect((await db.tasks.get(two))?.priority).toBe(2)
    await click(star(plain))
    await waitFor(async () => (await db.tasks.get(plain))?.priority === 1)
    await waitFor(() => star(plain).getAttribute('aria-label') === 'Starred')
    await click(star(plain))
    await waitFor(async () => (await db.tasks.get(plain))?.priority === 4)
    await click(star(two))
    await waitFor(async () => (await db.tasks.get(two))?.priority === 1)
    await r.unmount()
  })

  it('shows direct subtasks indented, with the count of a deeper level', async () => {
    await board()
    const parent = await createTask({ title: 'Close bank account' })
    const a = await createSubtask(parent, 'Download statements')
    await createSubtask(parent, 'Move standing orders')
    await createSubtask(a, 'Last year')
    const r = await render(<SimpleScreen />)
    await waitFor(() => !!r.container.querySelector(`[data-simple-row="${a}"]`))
    expect(titles(r.container, 'none')).toEqual(['Buy paint', 'Print diploma', 'Close bank account', 'Download statements', 'Move standing orders'])
    expect(row(r.container, a).textContent).toContain('1 subtask')
    expect(r.container.textContent).not.toContain('Last year')
    await r.unmount()
  })
})

describe('the field', () => {
  it('adds to the selected column, and a list token wins', async () => {
    const { car, home } = await board()
    const r = await render(<SimpleScreen />)
    await waitFor(() => columnNames(r.container).includes('Car'))
    const addCar = r.container.querySelector<HTMLInputElement>(`[data-simple-add="${car}"]`)!
    addCar.focus()
    await type(field(r.container), 'BMW wheel alignment')
    await key(field(r.container), 'Enter')
    await waitFor(async () => (await db.tasks.filter((tk) => tk.title === 'BMW wheel alignment').first())?.project_id === car, 'added to Car')
    await type(field(r.container), 'Hang shelves #Home')
    await key(field(r.container), 'Enter')
    await waitFor(async () => (await db.tasks.filter((tk) => tk.title === 'Hang shelves').first())?.project_id === home, 'added to Home')
    await r.unmount()
  })

  it('has no Ask without the assistant, and Ctrl+Enter adds like Enter', async () => {
    await board()
    const r = await render(<SimpleScreen />)
    await waitFor(() => columnNames(r.container).includes('Car'))
    expect(r.container.querySelector('[data-simple-ask]')).toBeNull()
    await type(field(r.container), 'what is still open?')
    await key(field(r.container), 'Enter', { ctrlKey: true })
    await waitFor(async () => !!(await db.tasks.filter((tk) => tk.title === 'what is still open?').first()), 'added')
    expect(takeAssistantPrefill()).toBeNull()
    await r.unmount()
  })

  it('sends Ctrl+Enter to the assistant without adding a task', async () => {
    await board()
    setAssistantStatus(STATUS)
    const r = await render(<SimpleScreen />)
    await waitFor(() => !!r.container.querySelector('[data-simple-ask]'))
    await type(field(r.container), 'what is still open for the move?')
    await key(field(r.container), 'Enter', { ctrlKey: true })
    expect(takeAssistantPrefill()).toMatchObject({ text: 'what is still open for the move?', send: true })
    expect(field(r.container).value).toBe('')
    expect(await db.tasks.filter((tk) => tk.title.startsWith('what is')).count()).toBe(0)
    await r.unmount()
  })

  it('says the assistant needs a connection when offline, and keeps the text', async () => {
    await board()
    setAssistantStatus(STATUS)
    const online = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    window.dispatchEvent(new Event('offline'))
    const r = await render(<SimpleScreen />)
    await waitFor(() => !!r.container.querySelector('[data-simple-ask]'))
    await type(field(r.container), 'plan my move')
    await click(r.container.querySelector('[data-simple-ask]')!)
    expect(r.container.querySelector('[data-simple-notice]')!.textContent).toBe('The assistant needs a connection.')
    expect(field(r.container).value).toBe('plan my move')
    expect(takeAssistantPrefill()).toBeNull()
    online.mockRestore()
    window.dispatchEvent(new Event('online'))
    await r.unmount()
  })
})

describe('AI actions and the editor', () => {
  it('shows no Ask and no AI actions on an encrypted account without the on-device assistant, or on the demo', async () => {
    await board()
    for (const reason of ['encryption_enabled', 'demo'] as const) {
      setAssistantStatus({ ...STATUS, available: false, reason })
      const r = await render(<SimpleScreen />)
      await waitFor(() => columnNames(r.container).includes('Car'))
      expect(r.container.querySelector('[data-simple-ask]'), reason).toBeNull()
      expect(r.container.querySelector('button[aria-label="AI actions"]'), reason).toBeNull()
      await r.unmount()
    }
    // With the on-device assistant the encrypted account asks like any other.
    setAssistantStatus({ ...STATUS, mode: 'device' })
    const r = await render(<SimpleScreen />)
    await waitFor(() => !!r.container.querySelector('[data-simple-ask]'))
    await r.unmount()
  })

  it('runs Plan my day and Tidy up as reviewed skills, and Break this down on the selected task', async () => {
    await board()
    setAssistantStatus(STATUS)
    const paint = (await db.tasks.filter((tk) => tk.title === 'Buy paint').first())!.id
    const r = await render(<SimpleScreen />)
    await waitFor(() => !!r.container.querySelector('[data-simple-ask]'))
    const choose = async (label: string) => {
      await click(r.container.querySelector('button[aria-label="AI actions"]')!)
      await waitFor(() => !!document.querySelector(`[data-menu-label="${label}"]`), label)
      await click(document.querySelector(`[data-menu-label="${label}"]`)!)
    }
    await choose('Plan my day')
    expect(takeAssistantPrefill()).toMatchObject({ skill: 'plan-day', send: true, review: true })
    await choose('Tidy up')
    expect(takeAssistantPrefill()).toMatchObject({ skill: 'tidy-up', send: true, review: true })
    await key(document.body, 'j')
    await waitFor(() => row(r.container, paint).dataset.selected !== undefined, 'selected')
    await choose('Break this down')
    expect(takeAssistantPrefill()).toMatchObject({ skill: 'break-down', selected: [paint], send: true })
    expect(await db.tasks.count()).toBe(2)
    await r.unmount()
  })

  it('deletes from the editor with an undo toast, and opens the full app without leaving Simple mode', async () => {
    const { car } = await board()
    await setSimpleMode(true)
    const id = await createTask({ title: 'Order tyres', project_id: car })
    const keep = await createTask({ title: 'Renew insurance', project_id: car })
    const r = await render(<SimpleScreen />)
    await waitFor(() => !!r.container.querySelector(`[data-simple-row="${id}"]`))
    const menu = async (label: string) => {
      await click(document.querySelector('[data-testid="simple-editor"] button[aria-label="More actions"]')!)
      await waitFor(() => !!document.querySelector(`[data-menu-label="${label}"]`), label)
      await click(document.querySelector(`[data-menu-label="${label}"]`)!)
    }
    await click(row(r.container, id).querySelector('[data-simple-title]')!)
    await waitFor(() => !!document.querySelector('[data-testid="simple-editor"]'), 'editor')
    await menu('Delete')
    await waitFor(async () => !!(await db.tasks.get(id))?.deleted_at, 'tombstone')
    await waitFor(() => !!bulkToast()?.undoId, 'undo toast')
    await click(row(r.container, keep).querySelector('[data-simple-title]')!)
    await waitFor(() => !!document.querySelector('[data-testid="simple-editor"]'), 'editor')
    await menu('Open in full app')
    await waitFor(() => location.pathname.includes(keep), 'task page')
    expect((await db.userPrefs.get(USER_PREFS_ID))?.simple_mode).toBe('on')
    await r.unmount()
  })
})

describe('moves and keys', () => {
  it('stars and moves the selected task with s and Alt+Right, as two undo steps', async () => {
    const { admin } = await board()
    const paint = (await db.tasks.filter((tk) => tk.title === 'Buy paint').first())!.id
    const r = await render(<SimpleScreen />)
    await waitFor(() => !!r.container.querySelector(`[data-simple-row="${paint}"]`))
    await key(document.body, 'j')
    await waitFor(() => row(r.container, paint).dataset.selected !== undefined, 'selected')
    await key(document.body, 's')
    await waitFor(async () => (await db.tasks.get(paint))?.priority === 1, 'starred')
    await key(document.body, 'ArrowRight', { altKey: true })
    await waitFor(async () => (await db.tasks.get(paint))?.project_id === admin, 'moved')
    expect((await db.tasks.get(paint))?.section_id ?? null).toBeNull()
    expect(await db.assistantUndo.count()).toBe(2)
    await r.unmount()
  })

  it('reorders from the editor menu without dragging (accessibility-aa D3)', async () => {
    const { car } = await board()
    await setSimpleMode(true)
    const first = await createTask({ title: 'Order tyres', project_id: car })
    await createTask({ title: 'Renew insurance', project_id: car })
    await createTask({ title: 'Wash the car', project_id: car })
    const r = await render(<SimpleScreen />)
    await waitFor(() => !!r.container.querySelector(`[data-simple-row="${first}"]`))
    const before = titles(r.container, car)
    expect(before[0]).toBe('Order tyres')
    await click(row(r.container, first).querySelector('[data-simple-title]')!)
    await waitFor(() => !!document.querySelector('[data-testid="simple-editor"]'), 'editor')
    await click(document.querySelector('[data-testid="simple-editor"] button[aria-label="More actions"]')!)
    await waitFor(() => !!document.querySelector('[data-menu-label="Move to bottom"]'), 'menu')
    await click(document.querySelector('[data-menu-label="Move to bottom"]')!)
    await waitFor(() => titles(r.container, car).at(-1) === 'Order tyres', 'moved to bottom')
    expect(titles(r.container, car)).toEqual([...before.slice(1), 'Order tyres'])
    await r.unmount()
  })

  it('leaves with All features: the preference is off and nothing else changes', async () => {
    await board()
    await setSimpleMode(true)
    const tasks = await db.tasks.toArray()
    const r = await render(<SimpleScreen />)
    await waitFor(() => columnNames(r.container).includes('Car'))
    await click(r.container.querySelector('[data-simple-menu]')!)
    await waitFor(() => !!document.querySelector('[data-menu-label="All features"]'))
    await click(document.querySelector('[data-menu-label="All features"]')!)
    await waitFor(async () => (await db.userPrefs.get(USER_PREFS_ID))?.simple_mode === '', 'off')
    await waitFor(() => location.pathname === '/', 'start view')
    expect(await db.tasks.toArray()).toEqual(tasks)
    await r.unmount()
  })
})

describe('launch (simple-mode "Simple mode preference")', () => {
  const launch = async () => {
    history.replaceState(null, '', '/')
    window.dispatchEvent(new PopStateEvent('popstate'))
    return render(<Shell user={user} onLogout={() => {}} />)
  }

  it('opens /simple from the root while the preference is on', async () => {
    await setSimpleMode(true)
    const r = await launch()
    await waitFor(() => location.pathname === '/simple', 'redirect to /simple')
    await r.unmount()
  })

  it('keeps the usual start view while it is off', async () => {
    await board()
    const r = await launch()
    await waitFor(() => r.container.querySelectorAll('[data-task-id]').length > 0, 'the Inbox')
    expect(location.pathname).toBe('/')
    await r.unmount()
  })
})
