// Simple mode's preferences and columns (OpenSpec change simple-mode).
import { describe, expect, it } from 'vitest'
import { dropPlacement, simpleColumns } from './simpleBoard'
import { hiddenLists, isStarred, MY_TASKS, simpleModeOn, starPriority } from './simpleMode'
import type { Project, Section, Task } from './types'

let n = 0
function task(over: Partial<Task> = {}): Task {
  n++
  return {
    id: over.id ?? `t${n}`, title: over.title ?? `Task ${n}`, description: '', project_id: null, section_id: null, parent_id: null, position: n,
    priority: 4, due: null, labels: [], completed_at: null, deleted_at: null, created_at: n, estimate_minutes: null, ...over,
  } as Task
}
function project(id: string, name: string, position: number, over: Partial<Project> = {}): Project {
  return { id, name, color: '#000', position, archived: false, parent_id: null, created_at: 0, deleted_at: null, ...over } as Project
}
const section = (id: string, project_id: string, position: number): Section => ({ id, name: id, project_id, position, created_at: 0, deleted_at: null }) as Section

describe('simple mode preference', () => {
  it('reads only "on" as on and keeps anything else as off', () => {
    expect(simpleModeOn(undefined)).toBe(false)
    expect(simpleModeOn({ simple_mode: '' })).toBe(false)
    expect(simpleModeOn({ simple_mode: 'later-value' })).toBe(false)
    expect(simpleModeOn({ simple_mode: 'on' })).toBe(true)
  })

  it('reads hidden lists as strings only and never hides My tasks', () => {
    expect(hiddenLists(undefined)).toEqual([])
    expect(hiddenLists({ simple_hidden: 'p1' as unknown as string[] })).toEqual([])
    expect(hiddenLists({ simple_hidden: ['p1', 3 as unknown as string, MY_TASKS, 'p2'] })).toEqual(['p1', 'p2'])
  })
})

describe('the star', () => {
  it('is priority 1 only, and writes 1 or 4', () => {
    expect(isStarred({ priority: 1 })).toBe(true)
    expect(isStarred({ priority: 2 })).toBe(false)
    expect(isStarred({ priority: 4 })).toBe(false)
    expect(starPriority(true)).toBe(1)
    expect(starPriority(false)).toBe(4)
  })
})

describe('simpleColumns', () => {
  const admin = project('admin', 'Admin', 1)
  const home = project('home', 'Home', 2)
  const car = project('car', 'Car', 3)
  const archived = project('old', 'Old', 4, { archived: true })
  const child = project('garage', 'Garage', 1, { parent_id: 'home' })
  const projects = [car, home, admin, archived, child]

  it('puts My tasks first, then lists in sidebar order, leaving out archived and hidden ones', () => {
    const cols = simpleColumns([task(), task({ project_id: 'car' })], projects, [], ['admin', 'unknown'], 'My tasks')
    expect(cols.map((c) => c.name)).toEqual(['My tasks', 'Home', 'Garage', 'Car'])
    expect(cols[0].rows).toHaveLength(1)
    expect(cols[3].rows).toHaveLength(1)
  })

  it('flattens sections in section order without dropping tasks outside a section', () => {
    const kitchen = section('kitchen', 'home', 1)
    const garage = section('garageSec', 'home', 2)
    const tasks = [
      task({ title: 'G1', project_id: 'home', section_id: 'garageSec', position: 1 }),
      task({ title: 'K2', project_id: 'home', section_id: 'kitchen', position: 5 }),
      task({ title: 'Loose', project_id: 'home', position: 9 }),
      task({ title: 'K1', project_id: 'home', section_id: 'kitchen', position: 2 }),
    ]
    const home = simpleColumns(tasks, projects, [garage, kitchen], [], 'My tasks').find((c) => c.id === 'home')!
    expect(home.rows.map((r) => r.task.title)).toEqual(['Loose', 'K1', 'K2', 'G1'])
  })

  it('shows direct open subtasks with the count of their own children', () => {
    const parent = task({ id: 'close', title: 'Close bank account', project_id: 'admin' })
    const a = task({ id: 'a', title: 'Open new account', parent_id: 'close', position: 1 })
    const b = task({ id: 'b', title: 'Update IBAN', parent_id: 'close', position: 2 })
    const done = task({ id: 'c', parent_id: 'close', completed_at: 5 })
    const deep = task({ id: 'd', parent_id: 'b' })
    const row = simpleColumns([parent, a, b, done, deep], projects, [], [], 'My tasks').find((c) => c.id === 'admin')!.rows[0]
    expect(row.subtasks.map((s) => [s.task.title, s.childCount])).toEqual([['Open new account', 0], ['Update IBAN', 1]])
  })

  it('lists completed top-level tasks most recent first, and skips deleted rows', () => {
    const tasks = [
      task({ title: 'Old', project_id: 'car', completed_at: 10 }),
      task({ title: 'New', project_id: 'car', completed_at: 20 }),
      task({ title: 'Gone', project_id: 'car', deleted_at: 30 }),
    ]
    const col = simpleColumns(tasks, projects, [], [], 'My tasks').find((c) => c.id === 'car')!
    expect(col.completed.map((t) => t.title)).toEqual(['New', 'Old'])
    expect(col.rows).toEqual([])
  })
})

describe('dropPlacement', () => {
  const rows = [
    task({ id: 'a', position: 100 }), task({ id: 'b', position: 200 }),
    task({ id: 'k1', position: 50, section_id: 'kitchen' }), task({ id: 'k2', position: 80, section_id: 'kitchen' }),
  ]
  it('keeps the screen order in its own column by taking the section of the row above', () => {
    expect(dropPlacement(rows, 'k2', 0, true)).toEqual({ sectionId: null, position: -900 })
    expect(dropPlacement(rows, 'a', 1, true)).toEqual({ sectionId: null, position: 1200 })
    expect(dropPlacement(rows, 'a', 2, true)).toEqual({ sectionId: 'kitchen', position: 65 })
  })
  it('clears the section in another column and lands among the tasks without one', () => {
    expect(dropPlacement(rows, 'x', 0, false)).toEqual({ sectionId: null, position: -900 })
    expect(dropPlacement(rows, 'x', 1, false)).toEqual({ sectionId: null, position: 150 })
    expect(dropPlacement(rows, 'x', 9, false)).toEqual({ sectionId: null, position: 1200 })
  })
})
