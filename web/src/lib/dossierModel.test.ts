// Dossier reads (OpenSpec change resume-dossiers, task 2.4): the step derived
// from real task rows, progress through completed members, unavailable ids,
// today's focus by date, waiting order and the deterministic local capture
// match. Everything here is pure: no IndexedDB write and no network call.
import { describe, expect, it, vi } from 'vitest'
import {
  DOSSIER_FOCUS_MAX, DOSSIER_TASK_MAX, contextChips, contextName, dossierState, dossierTasks, featuredDossier,
  focusDossierIds, focusDossierTasks, focusDossiers, suggestDossiers, waitingDossiers,
} from './dossierModel'
import type { Dossier, Label, Project, Task } from './types'

const TODAY = '2026-10-29'
const YESTERDAY = '2026-10-28'

function task(id: string, extra: Partial<Task> = {}): Task {
  return {
    id, title: id, description: '', project_id: null, parent_id: null, priority: 4, due: null, labels: [],
    position: 0, created_at: 1, completed_at: null, deleted_at: null, estimate_minutes: null,
    recurrence: null, series_id: null, assignee_id: null, section_id: null, ical_extra: null, _clock: {}, ...extra,
  }
}

function dossier(id: string, extra: Partial<Dossier> = {}): Dossier {
  return {
    id, title: id, note: '', task_ids: [], waiting: false, waiting_for: '', follow_up: null,
    position: 0, created_at: 1, deleted_at: null, _clock: {}, ...extra,
  }
}

function label(id: string, name: string, deleted_at: number | null = null): Label {
  return { id, name, color: '#000000', position: 0, created_at: 1, deleted_at, _clock: {} }
}

function project(id: string, extra: Partial<Project> = {}): Project {
  return {
    id, name: id, color: '#000000', position: 0, archived: false, parent_id: null, created_at: 1, deleted_at: null, _clock: {}, ...extra,
  }
}

describe('the current step is derived from the ordered live tasks', () => {
  it('keeps dossier order, resolves only live members and reports deleted or unknown ids', () => {
    const a = task('a', { completed_at: 10 })
    const b = task('b')
    const deleted = task('deleted', { deleted_at: 11 })
    const unrelated = task('other')
    const tasks = [unrelated, deleted, b, a]
    const before = JSON.parse(JSON.stringify(tasks)) as Task[]
    const d = dossier('d', { task_ids: ['a', 'b', 'missing', 'deleted', 'a', ''] })

    const resolved = dossierTasks(d, tasks)
    expect(resolved.tasks.map((x) => x.id)).toEqual(['a', 'b'])
    expect(resolved.unavailable).toEqual(['missing', 'deleted'])
    // Grouping reads the rows; it never reorders, copies into, or writes the list.
    expect(tasks).toEqual(before)
    expect(tasks.map((x) => x.id)).toEqual(['other', 'deleted', 'b', 'a'])
  })

  it('derives progress and the next open task, then advances on a completion and moves back on a reopen', () => {
    const a = task('a', { completed_at: 100 })
    const b = task('b')
    const c = task('c')
    const members = [a, b, c]
    const d = dossier('d', { task_ids: ['a', 'b', 'c'] })

    expect(dossierState(d, members)).toMatchObject({ done: 1, total: 3, empty: false, complete: false })
    expect(dossierState(d, members).next?.id).toBe('b')
    // Completing the current step in a list changes only the task row.
    const afterB = members.map((x) => (x.id === 'b' ? { ...x, completed_at: 200 } : x))
    expect(dossierState(d, afterB).next?.id).toBe('c')
    expect(dossierState(d, afterB)).toMatchObject({ done: 2, total: 3, complete: false })
    // Reopening an earlier step moves the current step back.
    const reopened = afterB.map((x) => (x.id === 'a' ? { ...x, completed_at: null } : x))
    expect(dossierState(d, reopened).next?.id).toBe('a')
    expect(dossierState(d, reopened)).toMatchObject({ done: 1, total: 3, complete: false })
    // Every live member completed: finished, not empty.
    const allDone = members.map((x) => ({ ...x, completed_at: 300 }))
    expect(dossierState(d, allDone)).toMatchObject({ done: 3, total: 3, empty: false, complete: true })
    expect(dossierState(d, allDone).next).toBeNull()
  })

  it('skips a deleted first step without rewriting the order, and never counts unavailable ids as members', () => {
    const done = task('done', { completed_at: 100 })
    const open = task('open')
    const nextOpen = task('next-open')
    const deletedFirst = task('deleted-first', { deleted_at: 200 })
    const d = dossier('d', { task_ids: ['deleted-first', 'done', 'open', 'next-open', 'gone'] })
    const before = JSON.parse(JSON.stringify(d)) as Dossier

    const state = dossierState(d, [nextOpen, deletedFirst, done, open])
    expect(state.tasks.map((x) => x.id)).toEqual(['done', 'open', 'next-open'])
    expect(state.unavailable).toEqual(['deleted-first', 'gone'])
    expect(state).toMatchObject({ done: 1, total: 3, empty: false, complete: false })
    expect(state.next?.id).toBe('open')
    // A deleted member stays in task_ids until the person removes it explicitly.
    expect(d).toEqual(before)
    expect(d.task_ids).toEqual(['deleted-first', 'done', 'open', 'next-open', 'gone'])

    // An untouched empty dossier invites an attachment and is not "finished".
    expect(dossierState(dossier('empty'), [])).toMatchObject({ done: 0, total: 0, empty: true, complete: false, next: null })
    // A dossier whose members all vanished reads empty too, never finished by implication.
    expect(dossierState(dossier('gone', { task_ids: ['x', 'y'] }), [])).toMatchObject({ empty: true, complete: false, total: 0 })
  })

  it('treats a task of a deleted project as unavailable when the project rows are supplied', () => {
    const taskId = task('in-deleted-project', { project_id: 'old-list' })
    const d = dossier('d', { task_ids: ['in-deleted-project', 'live'] })
    const live = task('live')
    const state = dossierState(d, [taskId, live], [project('old-list', { deleted_at: 7 })])
    expect(state.tasks.map((x) => x.id)).toEqual(['live'])
    expect(state.unavailable).toEqual(['in-deleted-project'])
    expect(state.next?.id).toBe('live')
    // Without the project rows the raw task still resolves; the caller decides.
    expect(dossierState(d, [taskId, live]).tasks.map((x) => x.id)).toEqual(['in-deleted-project', 'live'])
  })

  it('exposes the same two caps the op schema enforces', () => {
    expect(DOSSIER_FOCUS_MAX).toBe(3)
    expect(DOSSIER_TASK_MAX).toBe(50)
  })
})

describe("today's focus is dated and keeps dossier order", () => {
  it('shows nothing from another day and resolves only live dossiers in the stored order', () => {
    const kept = dossier('kept', { position: 2 })
    const chosen = dossier('chosen', { position: 1 })
    const deleted = dossier('deleted', { deleted_at: 5, position: 0 })
    const review = { focus_date: TODAY, focus_dossiers: ['kept', 'gone', 'chosen'] }

    expect(focusDossierIds(review, TODAY)).toEqual(['kept', 'gone', 'chosen'])
    expect(focusDossiers(review, TODAY, [deleted, chosen, kept]).map((d) => d.id)).toEqual(['kept', 'chosen'])
    // A stretched row cannot show more than the cap, and repeated ids are one choice.
    expect(focusDossierIds({ focus_date: TODAY, focus_dossiers: ['chosen', 'chosen', 'kept', 'gone', 'extra'] }, TODAY))
      .toEqual(['chosen', 'kept', 'gone'])
    expect(focusDossierIds(review, '2026-10-30')).toEqual([])
    expect(focusDossiers(review, '2026-10-30', [chosen])).toEqual([])
    expect(focusDossierIds({ focus_date: YESTERDAY, focus_dossiers: ['kept'] }, TODAY)).toEqual([])
    expect(focusDossierIds(undefined, TODAY)).toEqual([])
    expect(focusDossierIds(null, TODAY)).toEqual([])
  })

  it("returns each chosen dossier's next open task once, for My day and the briefing", () => {
    const a = task('a')
    const b = task('b', { completed_at: 10 })
    const c = task('c')
    const d1 = dossier('d1', { task_ids: ['a', 'b'] })
    const d2 = dossier('d2', { task_ids: ['b', 'c'] })
    const finished = dossier('finished', { task_ids: ['b'] })
    const review = { focus_date: TODAY, focus_dossiers: ['d1', 'finished', 'd2'] }

    // d1's next is a; finished has a completed member only; d2's next is c.
    expect(focusDossierTasks(review, TODAY, [d1, d2, finished], [a, b, c]).map((x) => x.id)).toEqual(['a', 'c'])
    // Two dossiers pointing at the same next task produce one row.
    const shared = dossier('shared', { task_ids: ['a'] })
    expect(focusDossierTasks({ focus_date: TODAY, focus_dossiers: ['d1', 'shared'] }, TODAY, [d1, shared], [a, b]).map((x) => x.id)).toEqual(['a'])
    expect(focusDossierTasks(review, YESTERDAY, [d1, d2, finished], [a, b, c])).toEqual([])
  })
})

describe("waiting and the featured dossier follow the person's data", () => {
  const held = (id: string, followUp: string | null, position: number, extra: Partial<Dossier> = {}) =>
    dossier(id, { waiting: true, waiting_for: 'the delivery', follow_up: followUp, position, ...extra })

  it('lists live dossiers on hold with the nearest follow-up first and undated ones last', () => {
    const early = held('early', '2026-11-02', 4)
    const late = held('late', '2026-11-05', 1)
    const undated = held('undated', null, 0)
    const sameDay = held('same-day', '2026-11-02', 2)
    const deleted = held('deleted', '2026-11-01', 0, { deleted_at: 9 })
    const open = dossier('open', { position: 0 })
    const input = [late, undated, deleted, early, open, sameDay]
    const before = input.map((d) => d.id)

    expect(waitingDossiers(input).map((d) => d.id)).toEqual(['same-day', 'early', 'late', 'undated'])
    expect(input.map((d) => d.id)).toEqual(before)
    expect(waitingDossiers([])).toEqual([])
  })

  it('never treats a due date as the wait: an overdue member stays the next step meanwhile', () => {
    const overdue = task('overdue', { due: { date: YESTERDAY } })
    const d = held('d', '2026-11-02', 0, { task_ids: ['overdue'] })
    const state = dossierState(d, [overdue])
    expect(state.waiting).toBe(true)
    expect(state.next?.id).toBe('overdue')
    expect(overdue.due).toEqual({ date: YESTERDAY })
    // A follow-up date that has arrived is still the same quiet hold, not a late task.
    const passed = held('passed', '2026-10-01', 0, { task_ids: ['overdue'] })
    expect(waitingDossiers([passed]).map((x) => x.id)).toEqual(['passed'])
    expect(passed.follow_up).toBe('2026-10-01')
  })

  it('features a chosen dossier first, then one to advance, then one on hold, then the first live one', () => {
    const empty = dossier('empty', { position: 0 })
    const complete = dossier('complete', { task_ids: ['done'], position: 1 })
    const waiting = held('waiting', '2026-11-02', 2, { task_ids: ['b'] })
    const advance = dossier('advance', { task_ids: ['a'], position: 3 })
    const deleted = dossier('deleted', { deleted_at: 1, position: 4 })
    const b = task('b')
    const tasks = [task('done', { completed_at: 1 }), b, task('a')]

    expect(featuredDossier([], tasks, null, TODAY)).toBeNull()
    expect(featuredDossier([deleted], tasks, null, TODAY)).toBeNull()
    expect(featuredDossier([empty, complete, waiting, advance, deleted], tasks, null, TODAY)?.id).toBe('advance')
    expect(featuredDossier([empty, complete, waiting], tasks, null, TODAY)?.id).toBe('waiting')
    expect(featuredDossier([empty, complete], tasks, null, TODAY)?.id).toBe('empty')
    // A chosen dossier wins even when it is finished: it is what the person picked.
    expect(featuredDossier([empty, complete, advance], tasks, { focus_date: TODAY, focus_dossiers: ['complete'] }, TODAY)?.id).toBe('complete')
    // Yesterday's choice does not win today.
    expect(featuredDossier([empty, complete, advance], tasks, { focus_date: YESTERDAY, focus_dossiers: ['complete'] }, TODAY)?.id).toBe('advance')
  })
})

describe('context chips read the labels already on open tasks', () => {
  it('counts open tasks, hides deleted labels and sorts by use then name', () => {
    const calls = label('calls', 'Appels')
    const home = label('home', '@Maison')
    const old = label('old', 'Ancien', 5)
    const tasks = [
      task('a', { labels: ['calls', 'home'] }),
      task('b', { labels: ['calls', 'old'] }),
      task('c', { labels: ['home'], completed_at: 4 }),
      task('d', { labels: ['calls'], deleted_at: 5 }),
    ]

    const chips = contextChips(tasks, [old, home, calls])
    expect(chips.map((chip) => [chip.label.id, chip.count])).toEqual([['calls', 2], ['home', 1]])
    expect(contextName({ name: '@Maison' })).toBe('Maison')
    expect(contextName({ name: 'Appels' })).toBe('Appels')
  })
})

describe('the capture offer is a local deterministic match', () => {
  it('scores title, note and live member titles, orders deterministically and caps the card candidates', () => {
    const garageMember = task('garage-member', { title: 'Garage booking' })
    const a = dossier('a', { title: 'Tyres', task_ids: ['garage-member'], position: 1 })
    const b = dossier('b', { title: 'Invoices', note: 'BMW garage invoice', position: 2 })
    const c = dossier('c', { title: 'Garage', position: 3 })
    const d = dossier('d', { title: 'Tyres delivery', position: 4 })
    const deleted = dossier('deleted', { title: 'BMW garage', deleted_at: 1, position: 0 })
    const all = [deleted, d, c, b, a]

    const first = suggestDossiers('BMW garage tyres', all, [garageMember])
    expect(first.map((x) => x.id)).toEqual(['a', 'b', 'c'])
    expect(suggestDossiers('BMW garage tyres', all, [garageMember]).map((x) => x.id)).toEqual(first.map((x) => x.id))
    expect(suggestDossiers('BMW garage tyres', all, [garageMember], 1).map((x) => x.id)).toEqual(['a'])
    // The deleted dossier and a deleted member's title are not evidence.
    expect(suggestDossiers('nightmare', [dossier('f', { title: 'Other', task_ids: ['gone'] })], [task('gone', { title: 'nightmare', deleted_at: 1 })])).toEqual([])
    // Empty, stop-word-only and unknown titles offer nothing.
    expect(suggestDossiers('', all, [garageMember])).toEqual([])
    expect(suggestDossiers('the and for', all, [garageMember])).toEqual([])
    expect(suggestDossiers('unrelated words', all, [garageMember])).toEqual([])
  })

  it('matches accents and case without a model or a request', () => {
    const spy = vi.spyOn(globalThis, 'fetch')
    const d = dossier('d', { title: 'Pneus avant' })
    expect(suggestDossiers('DÉJÀ les PNEUS', [d], []).map((x) => x.id)).toEqual(['d'])
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })
})

describe('a finished thread is not offered a new capture', () => {
  it('skips a dossier whose every step is complete', () => {
    const done = task('t1', { title: 'Order tyres', completed_at: 5 })
    const finished = dossier('finished', { title: 'Tyres BMW', task_ids: ['t1'] })
    const open = dossier('open', { title: 'Tyres BMW', task_ids: [] })
    expect(suggestDossiers('tyres quote', [finished, open], [done]).map((x) => x.id)).toEqual(['open'])
  })
})
