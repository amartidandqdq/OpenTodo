// The Simple screen's board (OpenSpec change simple-mode, "Lists as columns"): the pure
// derivation of its columns from local rows, where a dropped row lands, and the
// device-local view state. Loaded with the lazy Simple screen only.
import { readJSON, writeJSON } from './deviceStorage'
import { positionBetween } from './ordering'
import { buildProjectTree } from './projects'
import { MY_TASKS } from './simpleMode'
import { flattenTree } from './tree'
import type { Project, Section, Task } from './types'

/** One top-level task of a column with its direct open subtasks. */
export interface SimpleRow {
  task: Task
  subtasks: { task: Task; childCount: number }[]
}

/** One column of the Simple screen. */
export interface SimpleColumn {
  /** The project id, or MY_TASKS. */
  id: string
  name: string
  rows: SimpleRow[]
  /** Completed top-level tasks, most recently completed first. */
  completed: Task[]
}

/** The lists in sidebar order: live, non-archived projects, depth first by position. */
export function simpleLists(projects: readonly Project[]): Project[] {
  return flattenTree(buildProjectTree(projects).roots).map((n) => n.item)
}

/**
 * The columns (simple-mode "Lists as columns"): My tasks first, then every list in
 * sidebar order without the hidden ones. A column holds its open top-level tasks in
 * section order then position, each with its direct open subtasks, and its completed
 * top-level tasks. `tasks` is the current workspace's visible tasks.
 */
export function simpleColumns(
  tasks: readonly Task[], projects: readonly Project[], sections: readonly Section[], hidden: readonly string[], myTasksName: string,
): SimpleColumn[] {
  const lists = simpleLists(projects).filter((p) => !hidden.includes(p.id))
  const sectionPos = new Map(sections.filter((s) => !s.deleted_at).map((s) => [s.id, s.position]))
  const children = new Map<string, Task[]>()
  for (const tk of tasks) {
    if (tk.deleted_at || !tk.parent_id) continue
    const list = children.get(tk.parent_id)
    if (list) list.push(tk)
    else children.set(tk.parent_id, [tk])
  }
  const openChildren = (id: string) => (children.get(id) ?? []).filter((c) => !c.completed_at).sort((a, b) => a.position - b.position)
  const columns: SimpleColumn[] = [{ id: MY_TASKS, name: myTasksName, rows: [], completed: [] }, ...lists.map((p) => ({ id: p.id, name: p.name, rows: [], completed: [] }))]
  const byId = new Map(columns.map((c) => [c.id, c]))
  const open = new Map<string, Task[]>()
  for (const tk of tasks) {
    if (tk.deleted_at || tk.parent_id) continue
    const col = byId.get(tk.project_id ?? MY_TASKS)
    if (!col) continue
    if (tk.completed_at) col.completed.push(tk)
    else {
      const list = open.get(col.id)
      if (list) list.push(tk)
      else open.set(col.id, [tk])
    }
  }
  // Tasks outside a section come first, then each section in its order (no headers).
  const secKey = (tk: Task) => (tk.section_id ? sectionPos.get(tk.section_id) ?? -Infinity : -Infinity)
  for (const col of columns) {
    col.rows = (open.get(col.id) ?? [])
      .sort((a, b) => secKey(a) - secKey(b) || a.position - b.position)
      .map((task) => ({ task, subtasks: openChildren(task.id).map((sub) => ({ task: sub, childCount: openChildren(sub.id).length })) }))
    col.completed.sort((a, b) => (b.completed_at ?? 0) - (a.completed_at ?? 0))
  }
  return columns
}

/**
 * Where a top-level task dropped at `index` of a column lands (simple-mode "Task
 * rows"). `rows` is the column's open tasks in screen order and `index` counts them
 * without the moving task. In its own column the task takes the section of the row
 * above it (or below it at the top), so the screen order is kept; in another column
 * its section is cleared and it goes among the tasks without a section, which come
 * first.
 */
export function dropPlacement(rows: readonly Task[], movingId: string, index: number, sameColumn: boolean): { sectionId: string | null; position: number } {
  const others = rows.filter((r) => r.id !== movingId)
  if (!sameColumn) {
    const loose = others.filter((r) => !r.section_id)
    const k = Math.max(0, Math.min(index, loose.length))
    return { sectionId: null, position: positionBetween(loose[k - 1]?.position ?? null, loose[k]?.position ?? null) }
  }
  const k = Math.max(0, Math.min(index, others.length))
  const before = others[k - 1]
  const after = others[k]
  const sectionId = (before ?? after)?.section_id ?? null
  const next = after && (after.section_id ?? null) === sectionId ? after.position : null
  return { sectionId, position: before ? positionBetween(before.position, next) : positionBetween(null, after?.position ?? null) }
}

/** Device-local view state of the Simple screen (folded rows, the phone tab). */
export const simpleLocal = <T,>(key: string, fallback: T): T => readJSON(`ot:simple:${key}`, fallback)
export const setSimpleLocal = (key: string, value: unknown): void => { writeJSON(`ot:simple:${key}`, value) }
