// @vitest-environment happy-dom
// The local dossier offer after a capture (OpenSpec change resume-dossiers,
// design D6): a deterministic match on this device, nothing written before the
// person confirms, the same captured task kept on dismissal, and no model call.
import 'fake-indexeddb/auto'
import { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../lib/db'
import { createDossier } from '../lib/dossiers'
import { createTaskThenSuggest } from '../lib/assistantSuggest'
import { classifyOffer } from '../lib/classifyAfterAdd'
import * as status from '../lib/assistantStatus'
import { api } from '../lib/api'
import { resetDeviceId } from '../lib/ops'
import { undoBatch } from '../lib/undo'
import { click, render, type, waitFor } from '../ui/test-utils'
import { DossierLinkCard } from './resume/DossierLinkCard'
import { QuickAdd } from './QuickAdd'

beforeEach(async () => {
  await db.delete()
  await db.open()
  resetDeviceId()
  vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 404 })))
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

/** The capture line and the card, as the shell mounts them after a quick add. */
function Harness() {
  return (
    <div>
      <QuickAdd placeholder="Add a task" onAdd={async (input) => { await createTaskThenSuggest(input) }} />
      <DossierLinkCard />
    </div>
  )
}

async function capture(title: string) {
  const input = document.querySelector<HTMLInputElement>('form input')!
  await type(input, title)
  await act(async () => { document.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })) })
}

const card = () => document.querySelector<HTMLElement>('[data-dossier-link-card]')

describe('a local dossier offer after a capture', () => {
  it('offers the matching dossier, attaches only on confirm, and Undo detaches it', async () => {
    const { id } = await createDossier('Pneus avant · BMW')
    const r = await render(<Harness />)
    await capture('Commander les pneus avant')
    await waitFor(() => !!card(), 'the local dossier card')
    expect(card()!.textContent).toContain('Local suggestion, no model.')
    expect(card()!.textContent).toContain('Pneus avant · BMW')
    // Nothing is attached while the card is only shown.
    expect((await db.dossiers.get(id))!.task_ids).toEqual([])
    const task = (await db.tasks.toArray())[0]
    expect(task.title).toBe('Commander les pneus avant')

    await click(card()!.querySelector('[data-dossier-link-confirm]')!)
    await waitFor(async () => (await db.dossiers.get(id))!.task_ids.length === 1, 'the attachment')
    expect((await db.dossiers.get(id))!.task_ids).toEqual([task.id])
    const entries = await db.assistantUndo.orderBy('created_at').reverse().toArray()
    expect(entries[0]?.label).toContain('added to')
    await undoBatch(entries[0].id)
    expect((await db.dossiers.get(id))!.task_ids).toEqual([])
    expect(await db.tasks.get(task.id)).toBeTruthy()
    await r.unmount()
  })

  it('keeps the captured task when the card is dismissed, and writes nothing', async () => {
    const { id } = await createDossier('Maison')
    const r = await render(<Harness />)
    await capture('Peindre la maison')
    await waitFor(() => !!card(), 'the local dossier card')
    const task = (await db.tasks.toArray())[0]
    await click(card()!.querySelector('[data-dossier-link-keep]')!)
    await waitFor(() => !card(), 'the card closed')
    expect((await db.dossiers.get(id))!.task_ids).toEqual([])
    expect((await db.tasks.get(task.id))?.title).toBe('Peindre la maison')
    expect(task.deleted_at).toBeNull()
    expect((await db.assistantUndo.toArray()).filter((entry) => entry.label?.includes('added to')).length).toBe(0)
    await r.unmount()
  })

  it('lets the person confirm another dossier with the Combobox', async () => {
    const pneus = await createDossier('Pneus avant · BMW')
    const garage = await createDossier('Garage')
    const r = await render(<Harness />)
    await capture('Commander les pneus avant')
    await waitFor(() => !!card(), 'the local dossier card')
    expect(card()!.textContent).toContain('Pneus avant · BMW')
    const field = card()!.querySelector<HTMLInputElement>('input[role="combobox"]')!
    await act(async () => { field.focus(); field.dispatchEvent(new FocusEvent('focus')); field.dispatchEvent(new FocusEvent('focusin', { bubbles: true })) })
    await type(field, 'Garage')
    await waitFor(() => [...document.querySelectorAll<HTMLElement>('[role="option"]')].some((o) => o.textContent?.includes('Garage')), 'the Garage option')
    const option = [...document.querySelectorAll<HTMLElement>('[role="option"]')].find((o) => o.textContent?.includes('Garage'))!
    await click(option)
    await click(card()!.querySelector('[data-dossier-link-confirm]')!)
    await waitFor(async () => (await db.dossiers.get(garage.id))!.task_ids.length === 1, 'the chosen dossier')
    expect((await db.dossiers.get(pneus.id))!.task_ids).toEqual([])
    await r.unmount()
  })

  it('works offline with no assistant and calls no model', async () => {
    const { id } = await createDossier('Voiture')
    vi.spyOn(status, 'assistantStatus').mockReturnValue(null)
    const classify = vi.spyOn(api, 'assistantClassify')
    const open = vi.spyOn(status, 'openAssistantWith').mockImplementation(() => {})
    const r = await render(<Harness />)
    await capture('Contrôle technique de la voiture')
    await waitFor(() => !!card(), 'the local dossier card')
    expect(classify).not.toHaveBeenCalled()
    expect(open).not.toHaveBeenCalled()
    expect(classifyOffer()).toBeNull()
    await click(card()!.querySelector('[data-dossier-link-confirm]')!)
    await waitFor(async () => (await db.dossiers.get(id))!.task_ids.length === 1, 'the attachment without a model')
    await r.unmount()
  })
})
