// @vitest-environment happy-dom
// The horizon switch (declutter, method-views "Horizon switch"): four buttons over the
// horizon views, the open one marked as the current page, and a click navigates.
import 'fake-indexeddb/auto'
import { act } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { click, render, waitFor } from '../ui/test-utils'
import { HorizonSwitch, HORIZON_VIEWS } from './HorizonSwitch'
import { registerShortcutScope } from './shortcuts/dispatch'

describe('horizon switch (declutter)', () => {
  it('lists the four horizons in order, marks the open one as the current page, and navigates on a click', async () => {
    window.history.replaceState(null, '', '/waiting')
    const r = await render(<HorizonSwitch view="waiting" />)
    const buttons = [...r.container.querySelectorAll<HTMLButtonElement>('[data-horizon-switch] button')]
    expect(buttons.map((b) => b.textContent)).toEqual(['Next', 'Waiting', 'Anytime', 'Someday'])
    expect(buttons.map((b) => b.getAttribute('aria-current'))).toEqual([null, 'page', null, null])
    await click(r.container.querySelector<HTMLButtonElement>('[data-horizon="anytime"]')!)
    await waitFor(() => window.location.pathname === '/anytime')
    await r.unmount()
  })

  it.each(HORIZON_VIEWS)('leaves Space activation native on %s while a list has a selected task', async (view) => {
    const toggleSelection = vi.fn()
    // Both list implementations expose bulk selection through this registry id.
    const release = registerShortcutScope({ scope: 'list', handlers: { 'list.tick': toggleSelection } })
    const r = await render(<HorizonSwitch view={view} />)
    try {
      for (const destination of HORIZON_VIEWS) {
        const button = r.container.querySelector<HTMLButtonElement>(`[data-horizon="${destination}"]`)!
        button.focus()
        const event = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true })
        await act(async () => { button.dispatchEvent(event) })
        expect(event.defaultPrevented).toBe(false)
        expect(toggleSelection).not.toHaveBeenCalled()
        // happy-dom does not synthesize a button's native keyboard click.
        await click(button)
        expect(window.location.pathname).toBe(`/${destination}`)
      }
      // Space on the list itself still ticks the selected task.
      const event = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true })
      document.body.dispatchEvent(event)
      expect(toggleSelection).toHaveBeenCalledOnce()
      expect(event.defaultPrevented).toBe(true)
    } finally { release(); await r.unmount() }
  })

  it('is one navigation landmark with a name', async () => {
    const r = await render(<HorizonSwitch view="next" />)
    expect(r.container.querySelector('nav[data-horizon-switch]')?.getAttribute('aria-label')).toBe('Horizon')
    expect(r.container.querySelector('[data-horizon="next"]')?.getAttribute('aria-current')).toBe('page')
    await r.unmount()
  })
})
