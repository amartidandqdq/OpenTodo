// Close the day from Today (OpenSpec change close-day): the planner's changes for each
// choice and tomorrow's preview. Pure, no database.
import { beforeEach, describe, expect, it } from 'vitest'
import { closeToday, planCloseToday, tomorrowPreview } from './closeToday'
import { carryOverOf, reopenDay } from './review'
import { db, useDatabase } from './db'
import { createTask, mutate, resetDeviceId } from './ops'
import type { CarryDecision, CarryTask } from './review'
import type { Change } from './ops'
import type { Project, Task } from './types'

const TODAY = '2026-10-14'
const TOMORROW = '2026-10-15'
const NOW = Date.UTC(2026, 9, 14, 17, 0)

const task = (id: string, extra: Partial<Task> = {}): Task => ({ id, title: `Task ${id}`, due: { date: TODAY }, ...extra }) as Task
const row = (t: Task): CarryTask => ({ task: t, editable: true })
const reviewOf = (c: Change[]) => c.find((x) => x.entity === 'review')!
const taskOf = (c: Change[], id: string) => c.find((x) => x.entity === 'task' && x.entityId === id)

describe('planCloseToday', () => {
  const a = task('a', { due: { date: TODAY, time: '09:30' } })
  const b = task('b')
  const c = task('c')
  const rows = [row(a), row(b), row(c)]
  const review = { focus: 'a,b,c,z', focus_date: TODAY }

  it('Tomorrow moves the due date and keeps the time', () => {
    const decisions = new Map<string, CarryDecision>([['a', { kind: 'tomorrow' }], ['b', { kind: 'keep' }], ['c', { kind: 'day', date: '2026-10-20' }]])
    const changes = planCloseToday({ decisions, rows, review, today: TODAY, now: NOW })
    expect(taskOf(changes, 'a')?.patch.due).toEqual({ date: TOMORROW, time: '09:30' })
    expect(taskOf(changes, 'c')?.patch.due).toEqual({ date: '2026-10-20' })
  })

  it('Not now writes nothing to its task: the due date stays', () => {
    const decisions = new Map<string, CarryDecision>([['a', { kind: 'keep' }], ['b', { kind: 'keep' }], ['c', { kind: 'keep' }]])
    const changes = planCloseToday({ decisions, rows, review, today: TODAY, now: NOW })
    expect(changes.filter((x) => x.entity === 'task')).toEqual([])
  })

  it('every choice takes the decided task out of My day and keeps the rest, then stamps the day closed', () => {
    const decisions = new Map<string, CarryDecision>([['a', { kind: 'tomorrow' }], ['b', { kind: 'keep' }], ['c', { kind: 'keep' }]])
    const review1 = reviewOf(planCloseToday({ decisions, rows, review, today: TODAY, now: NOW }))
    expect(review1.patch).toEqual({ focus: 'z', focus_date: TODAY, focus_dossiers: [], closed_at: NOW, closed_day: TODAY, tomorrow_note: '' })
    expect(review1.entityId).toBe('me')
  })

  it('a task outside My day is not touched by the focus list', () => {
    const review2 = reviewOf(planCloseToday({ decisions: new Map(), rows: [], review, today: TODAY, now: NOW }))
    expect(review2.patch.focus).toBe('a,b,c,z')
  })

  it('one batch: at most one change per entity', () => {
    const decisions = new Map<string, CarryDecision>([['a', { kind: 'tomorrow' }], ['b', { kind: 'tomorrow' }]])
    const changes = planCloseToday({ decisions, rows, review, today: TODAY, now: NOW })
    const keys = changes.map((x) => `${x.entity}:${x.entityId}`)
    expect(new Set(keys).size).toBe(keys.length)
  })
})

describe('tomorrowPreview', () => {
  const projects: Pick<Project, 'id' | 'archived'>[] = [{ id: 'p1', archived: true }, { id: 'p2', archived: false }]
  const tasks = [
    task('t1', { due: { date: TOMORROW, time: '14:00' } }),
    task('t2', { due: { date: TOMORROW, time: '09:15' } }),
    task('t3', { due: { date: TOMORROW } }),
    task('t4', { due: { date: TODAY } }),
    task('t5', { due: { date: TOMORROW }, completed_at: 1 }),
    task('t6', { due: { date: TOMORROW }, deleted_at: 1 }),
    task('t7', { due: { date: TOMORROW, time: '07:00', tz: 'Europe/Paris' } }),
    task('t8', { due: { date: TOMORROW }, project_id: 'p1' }),
  ]

  it('counts the open things due tomorrow and names the first timed appointment', () => {
    expect(tomorrowPreview({ tasks, projects, tomorrow: TOMORROW })).toEqual({ things: 4, next: { time: '09:15', title: 'Task t2' } })
  })

  it('reads the choices made so far: a task moved to tomorrow counts, one moved away does not', () => {
    const moves = new Map([['t4', TOMORROW], ['t2', '2026-10-20']])
    expect(tomorrowPreview({ tasks, projects, tomorrow: TOMORROW, moves })).toEqual({ things: 4, next: { time: '14:00', title: 'Task t1' } })
  })

  it('nothing due tomorrow: no things and no appointment', () => {
    expect(tomorrowPreview({ tasks: [], projects, tomorrow: TOMORROW })).toEqual({ things: 0, next: null })
  })
})

let database = 0
beforeEach(() => { useDatabase(`close-today-${database++}`); resetDeviceId() })

it('clears yesterday’s focus and note without resurrecting its dossiers', () => {
  const review = { focus: 'old', focus_date: '2026-10-13', focus_dossiers: ['old-thread'], closed_day: '2026-10-13', tomorrow_note: 'Old note' }
  const patch = reviewOf(planCloseToday({ decisions: new Map(), rows: [], review, today: TODAY, now: NOW })).patch
  expect(patch).toMatchObject({ focus: '', focus_date: TODAY, focus_dossiers: [], tomorrow_note: '' })
})

it('preserves a note from a previous close of the same day', () => {
  const review = { focus: '', focus_date: TODAY, closed_day: TODAY, tomorrow_note: 'Keep this' }
  expect(reviewOf(planCloseToday({ decisions: new Map(), rows: [], review, today: TODAY })).patch).not.toHaveProperty('tomorrow_note')
})

it.each([TOMORROW, '2026-10-20'])('reopens repeated closes to %s with the original due date', async (destination) => {
  const id = await createTask({ title: 'Carry twice', due: { date: TODAY, time: '09:30' } })
  for (const date of [TOMORROW, destination]) {
    await mutate('review', 'me', { focus: id, focus_date: TODAY })
    const task = (await db.tasks.get(id))!
    await closeToday({ decisions: new Map([[id, { kind: 'day', date }]]), rows: [row(task)], review: await db.review.get('me'), today: TODAY, now: NOW })
  }
  const record = carryOverOf(await db.review.get('me'))!
  expect(record.items.filter((x) => x.id === id && x.field === 'due')).toHaveLength(1)
  const result = await reopenDay(TODAY)
  expect(result.restored).toBe(1)
  expect(result.skipped).toEqual([])
  expect((await db.tasks.get(id))?.due).toEqual({ date: TODAY, time: '09:30' })
})
