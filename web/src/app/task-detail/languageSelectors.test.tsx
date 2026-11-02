// @vitest-environment happy-dom
// The panel's own lookups do not depend on the interface language (OpenSpec change
// ui-correctness): Vim `i` finds the title in French, and focus returns to the Add
// control whatever its translated name holds.
import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it } from 'vitest'
import { applyCatalog, loadLanguage } from '../../lib/i18n/catalog'
import { createTask } from '../../lib/ops'
import { click, key } from '../../ui/test-utils'
import { focusTitle } from '../vim/VimLayer'
import { open, setupTaskDetailTests, waitFor } from './taskDetail.testkit'

setupTaskDetailTests()
afterEach(() => applyCatalog('en', 'en', {}))

describe('language-independent lookups (UI-5)', () => {
  it('Vim i focuses the title in French', async () => {
    await loadLanguage('fr')
    const id = await createTask({ title: 'Rapport' })
    const { unmount } = await open(id)
    focusTitle(id, 0)
    expect((document.activeElement as HTMLInputElement | null)?.value).toBe('Rapport')
    await unmount()
  })

  it('cancelling a revealed property returns focus to Add when its name holds quotes', async () => {
    applyCatalog('fr', 'fr', { 'Add a property': 'Ajouter une "propriété"', Estimate: 'Estimation' })
    const id = await createTask({ title: 'Vide' })
    const { row, unmount, container } = await open(id)
    const addButton = () => container.querySelector('[data-add-property] button[aria-haspopup="menu"][aria-label^="Ajouter"]') as HTMLButtonElement
    await click(addButton())
    await waitFor(() => document.querySelectorAll('[role="menu"] [role="menuitem"]').length > 0, 'the property menu')
    await click([...document.querySelectorAll('[role="menu"] [role="menuitem"]')].find((i) => i.textContent?.includes('Estimation'))!)
    await waitFor(() => !!row('estimate'), 'the estimate chip')
    expect(row('estimate')).toBeTruthy()
    await key(document.activeElement!, 'Escape')
    await waitFor(() => row('estimate') === null, 'the revealed chip leaving')
    await waitFor(() => document.activeElement === addButton(), 'focus back on Add')
    expect(document.activeElement).toBe(addButton())
    await unmount()
  })
})
