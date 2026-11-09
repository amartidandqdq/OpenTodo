// One task row of the Simple screen (OpenSpec change simple-mode, "Task rows", "The
// star"): the checkbox, the title on one line, the due chip when set and the star.
// Nothing else; every other property stays in the full app. The row is a plain
// presentational piece: the column owns selection and dragging, the screen owns
// what an action writes.
import { Icon } from '../../ui'
import { describeDue } from '../../lib/dates'
import { t } from '../../lib/i18n'
import { isStarred } from '../../lib/simpleMode'
import type { Task } from '../../lib/types'

const DUE_TONE: Record<string, string> = { overdue: 'text-danger', today: 'text-accent', soon: 'text-default', later: 'text-muted' }

export interface SimpleRowProps {
  task: Task
  /** A direct subtask (indented). */
  sub?: boolean
  /** Open subtasks of a subtask, shown as a count (deeper levels are not on the screen). */
  childCount?: number
  selected?: boolean
  /** Rows of a list the user may not edit show no controls. */
  readOnly?: boolean
  onToggle: () => void
  onStar: () => void
  onOpen: () => void
  onSelect?: () => void
  /** Pointer dragging; absent for subtasks and completed rows. */
  drag?: { onDragStart: (e: React.DragEvent) => void; onDragEnd: () => void }
}

export function SimpleRow({ task, sub, childCount = 0, selected, readOnly, onToggle, onStar, onOpen, onSelect, drag }: SimpleRowProps) {
  const title = task.title || t('Untitled')
  const done = task.completed_at !== null
  const starred = isStarred(task)
  const due = !done && task.due ? describeDue(task.due) : null
  return (
    <li data-simple-row={task.id} data-task-id={task.id} data-drag-id="simple-row" data-selected={selected || undefined} aria-current={selected || undefined}
      draggable={!!drag && !readOnly} onDragStart={drag?.onDragStart} onDragEnd={drag?.onDragEnd}
      onFocus={onSelect} onPointerDown={onSelect}
      className={`group flex min-h-11 items-center gap-2 rounded-control pe-1 ${sub ? 'ps-7' : 'ps-1'} ${selected ? 'bg-selected-row' : 'hover:bg-hover'}`}>
      <button type="button" role="checkbox" aria-checked={done} disabled={readOnly}
        aria-label={done ? t('Reopen {title}', { title }) : t('Complete {title}', { title })}
        onClick={onToggle} className="group/check touch-target inline-flex size-8 shrink-0 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-focus">
        <span data-check-mark className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${done ? 'border-input bg-faint text-on-accent' : 'border-input group-hover/check:bg-success-soft'}`}>
          {done && <Icon name="check" size="xs" />}
        </span>
      </button>
      <button type="button" onClick={onOpen} data-simple-title
        className="flex min-w-0 flex-1 flex-col items-start gap-1 rounded-control py-2 text-start focus-visible:outline-2 focus-visible:outline-focus">
        <span className={`w-full truncate text-body ${done ? 'text-muted line-through' : 'text-default'}`}>{title}</span>
        {due && <span className={`rounded-chip border border-soft px-1.5 text-meta ${DUE_TONE[due.tone]}`} data-simple-due>{due.label}</span>}
      </button>
      {childCount > 0 && <span className="shrink-0 text-meta text-muted"><span aria-hidden>{childCount}</span><span className="sr-only">{t('{n, plural, one {# subtask} other {# subtasks}}', { n: childCount })}</span></span>}
      {!done && (
        <button type="button" disabled={readOnly} onClick={onStar} aria-label={starred ? t('Starred') : t('Not starred')}
          className={`touch-target inline-flex size-8 shrink-0 items-center justify-center rounded-control focus-visible:outline-2 focus-visible:outline-focus ${starred ? 'text-accent' : 'text-faint hover:text-default'}`}>
          <Icon name="star" className={starred ? 'fill-current' : undefined} />
        </button>
      )}
    </li>
  )
}
