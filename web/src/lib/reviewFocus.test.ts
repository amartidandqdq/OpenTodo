// Today's focus with dossiers (OpenSpec change resume-dossiers D5): the two kinds
// share `focus_date`, a chosen thread shows its next real step, and a wait or a
// yesterday selection never poses as today's work.
import { beforeEach, describe, expect, it } from 'vitest'
import { db, useDatabase } from './db'
import { mutate, resetDeviceId } from './ops'
import { todayFocusOf, toggleFocus } from './review'
import type { Dossier, Review, Task } from './types'

let n = 0
beforeEach(() => {
  useDatabase(`review-focus-${Date.now()}-${n++}`)
  resetDeviceId()
})

const TODAY = '2026-10-14'

function task(id: string, extra: Partial<Task> = {}): Task {
  return {
    id, title: id, description: '', project_id: null, parent_id: null, priority: 4, due: null, labels: [],
    position: 0, created_at: 1, completed_at: null, deleted_at: null, estimate_minutes: null, recurrence: null,
    series_id: null, assignee_id: null, section_id: null, ical_extra: null, _clock: {}, ...extra,
  }
}

function dossier(id: string, taskIds: string[], extra: Partial<Dossier> = {}): Dossier {
  return {
    id, title: id, note: '', task_ids: taskIds, waiting: false, waiting_for: '', follow_up: null,
    workspace_id: null, position: 0, created_at: 1, deleted_at: null, _clock: {}, ...extra,
  }
}

const focusRow = (focus: string, dossiers: string[], date = TODAY): Pick<Review, 'focus' | 'focus_date' | 'focus_dossiers'> =>
  ({ focus, focus_date: date, focus_dossiers: dossiers })

describe('My day with dossiers', () => {
  it('shows a chosen dossier’s next step once, keeps the chosen task rows, and counts a task both ways once', () => {
    const tasks = [task('a'), task('b'), task('c')]
    const thread = dossier('thread', ['a', 'b'])
    const second = dossier('second', ['a'])
    const focus = todayFocusOf(focusRow('a,c', ['thread', 'second']), TODAY, tasks, [thread, second])
    expect(focus.dossiers.map((d) => d.id)).toEqual(['thread', 'second'])
    expect(focus.steps.map((x) => x.id)).toEqual(['a'])
    // A chosen task keeps its My day row (task-list-presentation); the card is not a row.
    expect(focus.tasks.map((x) => x.id)).toEqual(['a', 'c'])
    expect(focus.all.map((x) => x.id)).toEqual(['a', 'c'])
    expect([...focus.ids].sort()).toEqual(['a', 'c'])
  })

  it('a thread on hold shows no step of its own', () => {
    const tasks = [task('a')]
    const held = dossier('held', ['a'], { waiting: true, waiting_for: 'the delivery' })
    const focus = todayFocusOf(focusRow('', ['held']), TODAY, tasks, [held])
    expect(focus.dossiers.map((d) => d.id)).toEqual(['held'])
    expect(focus.steps).toEqual([])
    expect(focus.all).toEqual([])
    expect(focus.ids.size).toBe(0)
  })

  it('a selection from yesterday is empty for both kinds', () => {
    const tasks = [task('a')]
    const thread = dossier('thread', ['a'])
    const focus = todayFocusOf(focusRow('a', ['thread'], '2026-10-13'), TODAY, tasks, [thread])
    expect(focus.dossiers).toEqual([])
    expect(focus.all).toEqual([])
    expect(focus.ids.size).toBe(0)
  })

  it('a deleted dossier leaves no card, and a completed step is not the next one', () => {
    const tasks = [task('a', { completed_at: 5 }), task('b')]
    const focus = todayFocusOf(focusRow('', ['gone', 'thread']), TODAY, tasks, [dossier('gone', ['b'], { deleted_at: 9 }), dossier('thread', ['a', 'b'])])
    expect(focus.dossiers.map((d) => d.id)).toEqual(['thread'])
    expect(focus.steps.map((x) => x.id)).toEqual(['b'])
  })
})

describe('the shared focus date', () => {
  it('choosing a task today keeps the dossiers chosen today', async () => {
    const tasks = [task('a'), task('b')]
    await mutate('review', 'me', { focus_date: TODAY, focus: 'a', focus_dossiers: ['thread'] })
    expect(await toggleFocus(await db.review.get('me'), TODAY, tasks, 'b')).toBe('added')
    const row = await db.review.get('me')
    expect(row?.focus).toBe('a,b')
    expect(row?.focus_dossiers).toEqual(['thread'])
  })

  it('choosing a task after the day rolled over clears yesterday’s dossiers in the same write', async () => {
    const tasks = [task('a'), task('b')]
    await mutate('review', 'me', { focus_date: '2026-10-13', focus: 'a', focus_dossiers: ['thread'] })
    expect(await toggleFocus(await db.review.get('me'), TODAY, tasks, 'b')).toBe('added')
    const row = await db.review.get('me')
    expect(row?.focus).toBe('b')
    expect(row?.focus_dossiers).toEqual([])
  })

  it('a click while the review row is still loading keeps today’s dossiers', async () => {
    const tasks = [task('a')]
    await mutate('review', 'me', { focus_date: TODAY, focus: '', focus_dossiers: ['thread'] })
    expect(await toggleFocus(undefined, TODAY, tasks, 'a')).toBe('added')
    const row = await db.review.get('me')
    expect(row?.focus).toBe('a')
    expect(row?.focus_dossiers).toEqual(['thread'])
  })
})
