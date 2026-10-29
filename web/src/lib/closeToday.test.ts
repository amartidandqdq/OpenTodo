// Close the day from Today (OpenSpec change close-day): the planner's changes for each
// choice and tomorrow's preview. Pure, no database.
import { describe, expect, it } from 'vitest'
import { planCloseToday, tomorrowPreview } from './closeToday'
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
    expect(review1.patch).toEqual({ focus: 'z', focus_date: TODAY, closed_at: NOW, closed_day: TODAY })
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
