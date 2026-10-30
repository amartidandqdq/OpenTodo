// @vitest-environment happy-dom
// The horizon switch (declutter, method-views "Horizon switch"): four buttons over the
// horizon views, the open one marked as the current page, and a click navigates.
import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { click, render, waitFor } from '../ui/test-utils'
import { HorizonSwitch } from './HorizonSwitch'

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

  it('is one navigation landmark with a name', async () => {
    const r = await render(<HorizonSwitch view="next" />)
    expect(r.container.querySelector('nav[data-horizon-switch]')?.getAttribute('aria-label')).toBe('Horizon')
    expect(r.container.querySelector('[data-horizon="next"]')?.getAttribute('aria-current')).toBe('page')
    await r.unmount()
  })
})
