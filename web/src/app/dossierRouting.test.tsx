// @vitest-environment happy-dom
// Dossier destinations (OpenSpec change resume-dossiers, app-shell "Dossier
// destinations"): /resume and /dossier/<id> parse and print back, the sidebar
// offers Pick up the thread in every mode and keeps it active on a dossier page,
// and the shell opens the lazy screens, including the missing-dossier page.
import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../lib/db'
import { createDossier, offerDossierLink, setDossierWaiting } from '../lib/dossiers'
import { setMethodMode } from '../lib/method/mode'
import { createTask, mutate, resetDeviceId } from '../lib/ops'
import type { User } from '../lib/types'
import { render, waitFor } from '../ui/test-utils'
import { resetPanel } from './panel'
import { navigate, parseRoute, routePath } from './router'
import { Shell } from './Shell'
import { Sidebar } from './Sidebar'

const user = { id: 'u1', email: 'a@example.com', name: 'Ada', role: 'owner', created_at: 0 } as unknown as User

beforeEach(async () => {
  await db.delete()
  await db.open()
  resetDeviceId()
  resetPanel()
  vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 404 })))
  history.replaceState(null, '', '/')
})

afterEach(() => {
  vi.unstubAllGlobals()
  resetPanel()
})

const primaryDestinations = (root: ParentNode) =>
  [...root.querySelectorAll('nav[data-sidebar-primary] [data-sidebar-item]')].map((el) => el.getAttribute('data-destination'))

describe('dossier addresses', () => {
  it('parses and prints /resume and /dossier/<id>', () => {
    expect(parseRoute('/resume')).toEqual({ view: 'resume' })
    expect(parseRoute('/dossier/d-1')).toEqual({ view: 'dossier', id: 'd-1' })
    expect(parseRoute('/dossier/a%20b')).toEqual({ view: 'dossier', id: 'a b' })
    expect(parseRoute('/dossier')).toEqual({ view: 'resume' })
    expect(routePath({ view: 'resume' })).toBe('/resume')
    expect(routePath({ view: 'dossier', id: 'd-1' })).toBe('/dossier/d-1')
    expect(routePath({ view: 'dossier', id: 'a b' })).toBe('/dossier/a%20b')
    expect(parseRoute(routePath({ view: 'dossier', id: 'a b' }))).toEqual({ view: 'dossier', id: 'a b' })
  })
})

describe('dossier navigation', () => {
  it('offers Pick up the thread as a primary destination, active on a dossier page', async () => {
    const r = await render(<Sidebar route={{ view: 'dossier', id: 'd-1' }} user={user} />)
    await waitFor(() => primaryDestinations(r.container).includes('resume'), 'the resume destination')
    const resume = r.container.querySelector('[data-destination="resume"]')!
    expect(resume.getAttribute('aria-current')).toBe('page')
    expect(resume.textContent).toContain('Pick up the thread')
    await r.unmount()
  })

  it('keeps Pick up the thread beside the Open Loops destinations, and Waiting in the primary items', async () => {
    await setMethodMode('first')
    const r = await render(<Sidebar route={{ view: 'resume' }} user={user} />)
    await waitFor(() => primaryDestinations(r.container).includes('waiting'), 'the Waiting destination')
    expect(primaryDestinations(r.container)).toEqual(['resume', 'loop', 'inbox', 'today', 'next', 'waiting', 'review'])
    expect(r.container.querySelector('[data-destination="resume"]')!.getAttribute('aria-current')).toBe('page')
    await r.unmount()
  })
})

describe('the shell opens the lazy dossier screens', () => {
  it('opens Pick up the thread at /resume', async () => {
    await createDossier('Pneus avant')
    navigate({ view: 'resume' })
    const r = await render(<Shell user={user} onLogout={() => {}} />)
    await waitFor(() => !!r.container.querySelector('[data-resume-capture]') && r.container.textContent!.includes('Pick up the thread'), 'Pick up the thread')
    await r.unmount()
  })

  it('opens a dossier page, then says when a dossier is gone', async () => {
    const { id } = await createDossier('Pneus avant')
    navigate({ view: 'dossier', id })
    const r = await render(<Shell user={user} onLogout={() => {}} />)
    await waitFor(() => !!r.container.querySelector('[data-page-title]') && r.container.textContent!.includes('Pneus avant'), 'the dossier page')
    expect(r.container.querySelector('[data-page-back]')?.textContent).toContain('Pick up the thread')

    navigate({ view: 'dossier', id: 'missing-dossier' })
    await waitFor(() => r.container.textContent!.includes('This dossier is no longer there.'), 'the missing-dossier page')
    expect(r.container.textContent).toContain('Pick up the thread')
    await r.unmount()
  })

  it('shows the dossiers on hold above Waiting, and a dossier-only wait is not "nothing"', async () => {
    const { id } = await createDossier('Pneus avant')
    await setDossierWaiting(id, 'the delivery', '2099-11-02')
    const blocker = await createTask({ title: 'Get the quote' })
    const blocked = await createTask({ title: 'Book the fitter' })
    await mutate('task', blocked, { blocked_by: [blocker] })
    navigate({ view: 'waiting' })
    const r = await render(<Shell user={user} onLogout={() => {}} />)
    await waitFor(() => !!r.container.querySelector('[data-waiting-dossiers]'), 'the threads on hold')
    const holds = r.container.querySelector('[data-waiting-dossiers]')!
    expect(holds.textContent).toContain('Pneus avant')
    expect(holds.textContent).toContain('the delivery')
    expect(r.container.textContent).not.toContain('Nothing is waiting on anyone.')
    await waitFor(() => !!r.container.querySelector('[data-group="blocked"]'), 'the blocked task group')
    expect(holds.compareDocumentPosition(r.container.querySelector('[data-group="blocked"]')!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    await r.unmount()
  })

  it('keeps a capture\'s dossier offer on screen when the person moves to another view', async () => {
    const { id: dossierId } = await createDossier('Voiture')
    const dossier = (await db.dossiers.get(dossierId))!
    const task = await createTask({ title: 'Contrôle technique de la voiture' })
    offerDossierLink(task, 'Contrôle technique de la voiture', [dossier], await db.tasks.toArray())
    navigate({ view: 'inbox' })
    const r = await render(<Shell user={user} onLogout={() => {}} />)
    await waitFor(() => !!r.container.querySelector('[data-dossier-link-card]'), 'the global dossier offer')
    navigate({ view: 'upcoming' })
    await waitFor(() => location.pathname === '/upcoming' && !!r.container.querySelector('[data-dossier-link-card]'), 'the offer after navigation')
    await r.unmount()
  })
})
