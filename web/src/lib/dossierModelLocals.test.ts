// Dossier reads that are not the two shared model test files: the workspace-aware
// resolution, the focus lists, the capture match and the waiting order (OpenSpec
// change resume-dossiers, design D1-D6). Pure: no database, no model call.
import { describe, expect, it } from 'vitest'
import {
  DOSSIER_FOCUS_MAX, contextChips, contextName, dossierState, dossierTasks, featuredDossier,
  focusDossierIds, focusDossierTasks, focusDossiers, suggestDossiers, waitingDossiers,
} from './dossierModel'
import type { Dossier, Label, Project, Review, Task } from './types'

function task(id: string, extra: Partial<Task> = {}): Task {
  return {
    id, title: id, description: '', project_id: null, parent_id: null, priority: 4, due: null, labels: [],
    position: 0, created_at: 1, completed_at: null, deleted_at: null, estimate_minutes: null, recurrence: null,
    series_id: null, assignee_id: null, section_id: null, ical_extra: null, _clock: {}, ...extra,
  }
}

function dossier(id: string, extra: Partial<Dossier> = {}): Dossier {
  return {
    id, title: id, note: '', task_ids: [], waiting: false, waiting_for: '', follow_up: null,
    position: 1, created_at: 1, deleted_at: null, _clock: {}, ...extra,
  }
}

function project(id: string, extra: Partial<Project> = {}): Project {
  return { id, name: id, color: '', position: 0, archived: false, parent_id: null, created_at: 1, deleted_at: null, _clock: {}, ...extra }
}

function review(extra: Partial<Review> = {}): Review {
  return {
    id: 'me', completed_at: 0, daily_at: 0, monthly_at: 0, focus_date: '', focus: '', closed_at: 0,
    tomorrow_note: '', closed_day: '', carry_over: '', focus_dossiers: [], _clock: {}, ...extra,
  }
}

const label = (id: string, name = id): Label => ({ id, name, color: '', position: 0, created_at: 1, deleted_at: null, _clock: {} })

describe('dossier step resolution', () => {
  it('keeps the order and skips deleted, duplicate and unavailable ids', () => {
    const tasks = [task('c'), task('b', { deleted_at: 5 }), task('a')]
    const got = dossierTasks({ task_ids: ['a', 'b', 'a', '', 'c', 'gone'] }, tasks)
    expect(got.tasks.map((t) => t.id)).toEqual(['a', 'c'])
    expect(got.unavailable).toEqual(['b', 'gone'])
  })

  it('shows a task of a deleted project as unavailable, never removes it', () => {
    const projects = [project('p'), project('gone', { deleted_at: 4 })]
    const got = dossierTasks({ task_ids: ['a', 'b'] }, [task('a', { project_id: 'p' }), task('b', { project_id: 'gone' })], projects)
    expect(got.tasks.map((t) => t.id)).toEqual(['a'])
    expect(got.unavailable).toEqual(['b'])
  })

  it('derives progress and the first open step from the live members', () => {
    const one = task('one', { completed_at: 10 })
    const two = task('two')
    const three = task('three')
    const s = dossierState(dossier('d', { task_ids: ['one', 'two', 'three'] }), [three, one, two])
    expect(s.tasks.map((t) => t.id)).toEqual(['one', 'two', 'three'])
    expect([s.done, s.total, s.next?.id, s.empty, s.complete]).toEqual([1, 3, 'two', false, false])
  })

  it('reopens an earlier step by deriving the step again, without a stored stage', () => {
    const one = task('one', { completed_at: 10 })
    const two = task('two')
    const d = dossier('d', { task_ids: ['one', 'two'] })
    expect(dossierState(d, [one, two]).next?.id).toBe('two')
    expect(dossierState(d, [{ ...one, completed_at: null }, two]).next?.id).toBe('one')
  })

  it('is complete only with live members, and empty when none resolve', () => {
    const done = task('done', { completed_at: 10 })
    const complete = dossierState(dossier('d', { task_ids: ['done'] }), [done])
    expect([complete.complete, complete.empty, complete.next]).toEqual([true, false, null])
    const empty = dossierState(dossier('d', { task_ids: ['gone'] }), [])
    expect([empty.complete, empty.empty, empty.next]).toEqual([false, true, null])
  })

  it('keeps waiting independent of the tasks and of their due dates', () => {
    const open = task('open', { due: { date: '2026-11-02' } })
    const s = dossierState(dossier('d', { task_ids: ['open'], waiting: true, waiting_for: 'the delivery' }), [open])
    expect(s.waiting).toBe(true)
    expect(s.next?.id).toBe('open')
    expect(open.due).toEqual({ date: '2026-11-02' })
  })

  it('keeps the first open member as the step, without inferring a blocked or deferred state', () => {
    const first = task('first', { blocked_by: ['other'], start: '2026-12-01' })
    const later = task('later')
    expect(dossierState(dossier('d', { task_ids: ['first', 'later'] }), [first, later]).next?.id).toBe('first')
  })

  it('keeps a hold independent of an empty or finished thread', () => {
    const empty = dossierState(dossier('empty', { task_ids: [], waiting: true, waiting_for: 'the delivery' }), [])
    expect(empty).toMatchObject({ waiting: true, empty: true, complete: false, next: null })
    const done = dossierState(dossier('done', { task_ids: ['a'], waiting: true }), [task('a', { completed_at: 3 })])
    expect(done).toMatchObject({ waiting: true, empty: false, complete: true, next: null })
  })
})

describe('today focus dossiers', () => {
  const today = '2026-10-29'

  it('reads no selection from another day and removes duplicates', () => {
    expect(focusDossierIds(review({ focus_date: '2026-10-28', focus_dossiers: ['a'] }), today)).toEqual([])
    expect(focusDossierIds(review({ focus_date: today, focus_dossiers: ['a', 'a', '', 'b'] }), today)).toEqual(['a', 'b'])
  })

  it('never trusts a stored list longer than the cap', () => {
    const ids = ['a', 'b', 'c', 'd']
    expect(focusDossierIds(review({ focus_date: today, focus_dossiers: ids }), today)).toEqual(ids.slice(0, DOSSIER_FOCUS_MAX))
  })

  it('does not let a deleted slot hide the third live choice', () => {
    const rows = [dossier('gone', { deleted_at: 4 }), dossier('a'), dossier('b'), dossier('c')]
    expect(focusDossierIds(review({ focus_date: today, focus_dossiers: ['gone', 'a', 'b', 'c'] }), today, rows)).toEqual(['a', 'b', 'c'])
  })

  it('lists the chosen dossiers in their stored order, without deleted ones', () => {
    const a = dossier('a')
    const b = dossier('b', { deleted_at: 3 })
    const c = dossier('c')
    const got = focusDossiers(review({ focus_date: today, focus_dossiers: ['c', 'b', 'a'] }), today, [a, b, c])
    expect(got.map((d) => d.id)).toEqual(['c', 'a'])
  })

  it('counts each next task once, even when two chosen dossiers share it', () => {
    const shared = task('shared')
    const a = dossier('a', { task_ids: ['shared'] })
    const b = dossier('b', { task_ids: ['shared', 'other'] })
    const got = focusDossierTasks(review({ focus_date: today, focus_dossiers: ['a', 'b'] }), today, [a, b], [shared, task('other')])
    expect(got.map((t) => t.id)).toEqual(['shared'])
  })

  it('leaves a chosen dossier on hold out of the planned next tasks', () => {
    const a = dossier('a', { task_ids: ['open'] })
    const held = dossier('held', { task_ids: ['other'], waiting: true, waiting_for: 'the delivery' })
    const got = focusDossierTasks(review({ focus_date: today, focus_dossiers: ['held', 'a'] }), today, [held, a], [task('open'), task('other')])
    expect(got.map((t) => t.id)).toEqual(['open'])
  })
})

describe('waiting, featured and capture', () => {
  it('orders waiting threads by follow-up, undated last, without inventing a date', () => {
    const late = dossier('late', { waiting: true, waiting_for: 'x', follow_up: '2026-11-20', position: 1 })
    const soon = dossier('soon', { waiting: true, waiting_for: 'y', follow_up: '2026-11-02', position: 2 })
    const none = dossier('none', { waiting: true, waiting_for: 'z', follow_up: null, position: 0 })
    expect(waitingDossiers([late, none, soon]).map((d) => d.id)).toEqual(['soon', 'late', 'none'])
    expect(waitingDossiers([none]).map((d) => d.id)).toEqual(['none'])
  })

  it('features the chosen dossier, else the first one to advance, else the first on hold', () => {
    const today = '2026-10-29'
    const waiting = dossier('waiting', { waiting: true, waiting_for: 'delivery', position: 1 })
    const active = dossier('active', { task_ids: ['open'], position: 2 })
    const open = task('open')
    expect(featuredDossier([waiting, active], [open], review({ focus_date: today, focus_dossiers: ['waiting'] }), today)?.id).toBe('waiting')
    expect(featuredDossier([waiting, active], [open], review(), today)?.id).toBe('active')
    expect(featuredDossier([waiting], [], review(), today)?.id).toBe('waiting')
  })

  it('suggests a dossier from its title, note or member titles, deterministically', () => {
    const byTitle = dossier('pneus', { title: 'Pneus avant', position: 2 })
    const byNote = dossier('garage', { title: 'Voiture', note: 'Appeler le garage BMW', position: 1 })
    const byTask = dossier('montage', { title: 'Montage', task_ids: ['t1'], position: 3 })
    const tasks = [task('t1', { title: 'Prendre rendez-vous pour les pneus' })]
    expect(suggestDossiers('BMW garage confirmé', [byTitle, byNote, byTask], tasks).map((d) => d.id)).toEqual(['garage'])
    expect(suggestDossiers('rendez-vous pneus', [byTitle, byNote, byTask], tasks)[0]?.id).toBe('montage')
    expect(suggestDossiers('', [byTitle], tasks)).toEqual([])
    expect(suggestDossiers('courses', [byTitle], tasks)).toEqual([])
  })

  it('ignores a deleted dossier in the capture match', () => {
    const gone = dossier('gone', { title: 'Pneus', deleted_at: 3 })
    expect(suggestDossiers('Pneus', [gone], [])).toEqual([])
  })
})

describe('context chips', () => {
  it('reads the labels already on open tasks, most used first, and creates none', () => {
    const calls = label('calls', '@Appels')
    const home = label('home', 'Maison')
    const gone = label('gone', 'Ancien')
    const tasks = [
      task('a', { labels: ['calls', 'home'] }),
      task('b', { labels: ['calls'] }),
      task('c', { labels: ['gone'], completed_at: 2 }),
      task('d', { labels: ['home'], deleted_at: 2 }),
    ]
    expect(contextChips(tasks, [calls, home, gone]).map((c) => [c.label.id, c.count])).toEqual([['calls', 2], ['home', 1]])
    expect(contextName(calls)).toBe('Appels')
  })
})
