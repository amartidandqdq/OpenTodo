// The Simple screen's keys (OpenSpec change simple-mode, "Keyboard operation of the
// Simple screen"), through the shortcut registry's `simple` view entries: one
// selection, a task in a list, moved with j/k and h/l; x, s and Enter act on it;
// Alt+arrows move it. The shell is not mounted here, so its keys do nothing.
import type { RefObject } from 'react'
import { useOverlayDepth } from '../../ui'
import type { SimpleColumn } from '../../lib/simpleBoard'
import type { Task } from '../../lib/types'
import { useShortcutScope } from '../shortcuts'
import { isActivationTarget } from '../shortcuts/dispatch'
import type { ColumnActions } from './SimpleColumn'

/** A column's rows in screen order: each top-level task, then its subtasks. */
export function rowOrder(column: SimpleColumn): Task[] {
  return column.rows.flatMap((r) => [r.task, ...r.subtasks.map((s) => s.task)])
}

export function useSimpleKeys({ columns, column, taskId, field, paused, select, actions, open }: {
  columns: readonly SimpleColumn[]
  column: SimpleColumn | undefined
  taskId: string | null
  field: RefObject<HTMLInputElement | null>
  paused: boolean
  select: (columnId: string, taskId: string | null) => void
  actions: ColumnActions
  open: (id: string) => void
}): void {
  const overlays = useOverlayDepth()
  const rows = column ? rowOrder(column) : []
  const index = rows.findIndex((r) => r.id === taskId)
  const task = index >= 0 ? rows[index] : null
  const colIndex = column ? columns.findIndex((c) => c.id === column.id) : -1
  const focusRow = (id: string) => requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-simple-row="${CSS.escape(id)}"] [data-simple-title]`)?.focus())
  const pick = (to: number): false | void => {
    const row = rows[Math.max(0, Math.min(rows.length - 1, to))]
    if (!column || !row) return false
    select(column.id, row.id)
    focusRow(row.id)
  }
  const pickColumn = (dir: 1 | -1): false | void => {
    const next = columns[colIndex + dir]
    if (!next) return false
    const first = rowOrder(next)[0]
    select(next.id, first?.id ?? null)
    if (first) focusRow(first.id)
  }
  // Alt+arrows move a top-level task (subtasks stay with their parent).
  const moveTo = (target: SimpleColumn, at: number): false | void => {
    if (!task || task.parent_id || !actions.canEdit(task)) return false
    actions.drop(target.id, task.id, at)
    if (target.id !== column?.id) select(target.id, task.id)
  }
  const top = column ? column.rows.findIndex((r) => r.task.id === task?.id) : -1
  useShortcutScope('view', {
    'simple.field': () => { field.current?.focus() },
    'simple.down': () => pick(index < 0 ? 0 : index + 1),
    'simple.up': () => pick(index < 0 ? 0 : index - 1),
    'simple.left': () => pickColumn(-1),
    'simple.right': () => pickColumn(1),
    'simple.complete': () => { if (!task || !actions.canEdit(task)) return false; actions.toggle(task) },
    'simple.star': () => { if (!task || !actions.canEdit(task)) return false; actions.star(task) },
    'simple.open': (e) => {
      // Enter on a control (a checkbox, the star, a menu) belongs to the control.
      if (!task || isActivationTarget(e.target as HTMLElement | null)) return false
      open(task.id)
    },
    'simple.add': () => { if (!column) return false; document.querySelector<HTMLInputElement>(`[data-simple-add="${CSS.escape(column.id)}"]`)?.focus() },
    'simple.move-up': () => (column && top > 0 ? moveTo(column, top - 1) : false),
    'simple.move-down': () => (column && top >= 0 && top < column.rows.length - 1 ? moveTo(column, top + 1) : false),
    'simple.move-left': () => (columns[colIndex - 1] ? moveTo(columns[colIndex - 1], 0) : false),
    'simple.move-right': () => (columns[colIndex + 1] ? moveTo(columns[colIndex + 1], 0) : false),
  }, { view: 'simple', paused: paused || overlays > 0 })
}
