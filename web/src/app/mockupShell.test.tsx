// @vitest-environment happy-dom
// The original mockup A shell (openspec/changes/original-mockup-a, spec
// "Original mockup shell"): the desktop application bar above the columns, the
// narrow 12 rem sidebar with its stored width, the compact sidebar header under
// the bar and the continuous content surface. The phone keeps its own bar.
import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../lib/db'
import { createTask, resetDeviceId } from '../lib/ops'
import type { User } from '../lib/types'
import { click, render, spokenText, waitFor } from '../ui/test-utils'
import { resetPanel } from './panel'
import { navigate } from './router'
import { MockupTopBar } from './MockupTopBar'
import { Shell } from './Shell'
import { resetSidebarLayout, setSidebarWidth, sidebarLayout } from './sidebarLayout'

const user = { id: 'u1', email: 'a@example.com', name: 'Ada', role: 'owner', created_at: 0 } as unknown as User

beforeEach(async () => {
  await db.delete()
  await db.open()
  resetDeviceId()
  resetPanel()
  resetSidebarLayout()
  vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 404 })))
  history.replaceState(null, '', '/')
})
afterEach(() => {
  vi.unstubAllGlobals()
  resetPanel()
})

/** A desktop matchMedia: happy-dom answers 1024 px without help. */
const phone = () => {
  const original = window.matchMedia
  window.matchMedia = ((q: string) => ({ matches: false, media: q, onchange: null, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent: () => false })) as typeof window.matchMedia
  return () => { window.matchMedia = original }
}

describe('the narrow sidebar (original-mockup-a)', () => {
  it('defaults to 12 rem a device that never stored a width (Desktop launch)', () => {
    expect(sidebarLayout()).toEqual({ width: 12, collapsed: false })
  })
  it('keeps a stored choice inside the 10.5–22.5 rem limits (Existing device)', () => {
    setSidebarWidth(20)
    expect(sidebarLayout().width).toBe(20)
    setSidebarWidth(10.5)
    expect(sidebarLayout().width).toBe(10.5)
    setSidebarWidth(30)
    expect(sidebarLayout().width).toBe(22.5)
  })
})

describe('the application bar (original-mockup-a)', () => {
  it('carries the brand, the workspace context, search, the Assistant and the account menu', async () => {
    const onSearch = vi.fn()
    const r = await render(<MockupTopBar user={user} onSearch={onSearch} onAssistant={() => {}} onShortcuts={() => {}} onSignOut={() => {}} />)
    expect(r.container.querySelector('[data-mockup-brand]')).not.toBeNull()
    const workspace = r.container.querySelector('[data-mockup-workspace]')!
    expect(spokenText(workspace as HTMLElement)).toContain('Personal')
    const search = r.container.querySelector<HTMLButtonElement>('[data-mockup-search]')!
    search.click()
    expect(onSearch).toHaveBeenCalled()
    expect(r.container.querySelector('[data-mockup-assistant]')).not.toBeNull()
    // The account access opens the same menu items as the sidebar's account control.
    await click(r.container.querySelector<HTMLButtonElement>('[data-mockup-account]')!)
    await waitFor(() => document.querySelectorAll('[role="menuitem"]').length > 0)
    const labels = [...document.querySelectorAll<HTMLElement>('[role="menuitem"]')].map((b) => b.getAttribute('data-menu-label'))
    expect(labels).toEqual(['Settings', 'Help', 'Keyboard shortcuts', 'Sign out'])
    await r.unmount()
  })

  it('shows no Assistant chip while the assistant is unavailable', async () => {
    const r = await render(<MockupTopBar user={user} />)
    expect(r.container.querySelector('[data-mockup-assistant]')).toBeNull()
    await r.unmount()
  })

  it('renders nothing on a phone, where the page bar is the header', async () => {
    const restore = phone()
    const r = await render(<MockupTopBar user={user} onSearch={() => {}} />)
    expect(r.container.querySelector('[data-mockup-topbar]')).toBeNull()
    await r.unmount()
    restore()
  })
})

describe('the desktop shell composition (original-mockup-a)', () => {
  it('puts the app bar above the columns, a continuous content surface and a compact sidebar header', async () => {
    await createTask({ title: 'Write the report', priority: 1 })
    navigate({ view: 'inbox' })
    const r = await render(<Shell user={user} onLogout={() => {}} />)
    await waitFor(() => !!r.container.querySelector('[data-mockup-topbar]') && r.container.textContent!.includes('Write the report'))
    // No duplicate desktop header: only the app bar and the columns, no phone bar.
    expect(document.querySelector('[data-phone-bar]')).toBeNull()
    // One continuous surface: no inset card frame on the content.
    const main = r.container.querySelector('[data-app-frame]')!
    expect(main.className).not.toContain('md:rounded-surface')
    expect(main.className).not.toContain('md:border-default')
    expect(main.className).not.toContain('md:my-2')
    // The compact sidebar: the workspace control keeps switching but never names the app again.
    const trigger = r.container.querySelector('[data-workspace-trigger]')!
    expect(trigger.querySelector('[data-workspace-lines]')).toBeNull()
    expect(spokenText(trigger as HTMLElement)).not.toContain('OpenTodo')
    const header = r.container.querySelector('[data-sidebar-header]')!
    expect(header.querySelector('[data-palette-button]')).toBeNull()
    await r.unmount()
  })

  it("a phone keeps the page bar and the drawer's header, without the app bar", async () => {
    await createTask({ title: 'Phone chore', priority: 1 })
    const restore = phone()
    try {
      const r = await render(<Shell user={user} onLogout={() => {}} />)
      await waitFor(() => r.container.textContent!.includes('Phone chore'))
      expect(document.querySelector('[data-mockup-topbar]')).toBeNull()
      expect(document.querySelector('[data-phone-bar]')).not.toBeNull()
      await r.unmount()
    } finally {
      restore()
    }
  })
})
