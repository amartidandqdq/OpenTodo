// The Today summary line (OpenSpec change `today-home`): the counts it reports come
// from the same rows the list shows, and an empty part is left out by the caller.
import { describe, expect, it } from 'vitest'
import { todaySummary } from './todaySummary'
import type { Project, Task } from './types'

const TODAY = '2026-10-14'
let n = 0
function task(over: Partial<Task> = {}): Task {
  n++
  return {
    id: over.id ?? `t${n}`, title: over.title ?? `Task ${n}`, notes: '', project_id: null, section_id: null, parent_id: null, position: n,
    priority: 4, due: null, deadline: null, start: null, labels: [], completed_at: null, deleted_at: null, created_at: n, updated_at: n,
    assignee_id: null, ...over,
  } as Task
}
const projects: Pick<Project, 'id' | 'archived'>[] = [{ id: 'p-live', archived: false }, { id: 'p-old', archived: true }]
const summary = (tasks: Task[], chosen: Task[] = [], now = '12:00') => todaySummary({ today: TODAY, now, tasks, projects, chosen })

describe('todaySummary', () => {
  it('counts what is chosen, the next timed task still ahead, and nothing earlier', () => {
    const dentist = task({ title: 'Dentist', due: { date: TODAY, time: '14:30' } })
    const early = task({ title: 'Early', due: { date: TODAY, time: '09:00' } })
    const s = summary([dentist, early], [task(), task()], '12:00')
    expect(s).toEqual({ chosen: 2, next: { time: '14:30', title: 'Dentist' }, earlier: 0 })
  })

  it('leaves out a timed task whose time has passed, a completed one and one in an archived project', () => {
    const past = task({ title: 'Past', due: { date: TODAY, time: '09:00' } })
    const done = task({ title: 'Done', due: { date: TODAY, time: '13:00' }, completed_at: 1 })
    const archived = task({ title: 'Archived', due: { date: TODAY, time: '13:30' }, project_id: 'p-old' })
    const ahead = task({ title: 'Ahead', due: { date: TODAY, time: '15:00' } })
    expect(summary([past, done, archived, ahead]).next).toEqual({ time: '15:00', title: 'Ahead' })
    expect(summary([past, done, archived]).next).toBeNull()
  })

  it('does not take a zoned time as the viewer’s appointment', () => {
    const zoned = task({ title: 'Zoned', due: { date: TODAY, time: '13:00', tz: 'Europe/Paris' } })
    expect(summary([zoned]).next).toBeNull()
  })

  it('counts open tasks in the Earlier group, which excludes completed and deleted ones', () => {
    const late = task({ due: { date: '2026-10-10' } })
    const lateToo = task({ due: { date: '2026-10-12' } })
    const gone = task({ due: { date: '2026-10-11' }, deleted_at: 1 })
    const finished = task({ due: { date: '2026-10-11' }, completed_at: 1 })
    expect(summary([late, lateToo, gone, finished]).earlier).toBe(2)
    expect(summary([task({ due: { date: TODAY } })]).earlier).toBe(0)
  })

  it('reports nothing when the day is empty', () => {
    expect(summary([])).toEqual({ chosen: 0, next: null, earlier: 0 })
  })
})
