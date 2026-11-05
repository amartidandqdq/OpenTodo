// One list of the Simple screen (OpenSpec change simple-mode, "Lists as columns",
// "Subtasks", "Completed row"): its name, an "Add a task" line, the open top-level
// tasks with their direct subtasks, and the folded completed row. Dropping a dragged
// row reports the index it lands at; the screen plans the write.
import { useState } from 'react'
import { Icon } from '../../ui'
import { t } from '../../lib/i18n'
import { setSimpleLocal, simpleLocal, type SimpleColumn as Column } from '../../lib/simpleBoard'
import type { Task } from '../../lib/types'
import { SimpleRow } from './SimpleRow'

export interface ColumnActions {
  toggle: (task: Task) => void
  star: (task: Task) => void
  open: (task: Task) => void
  select: (columnId: string, taskId: string | null) => void
  add: (columnId: string, line: string) => Promise<void>
  /** A row dropped at `index` (counted without the dragged row). */
  drop: (columnId: string, taskId: string, index: number) => void
  canEdit: (task: Task) => boolean
}

export function SimpleColumnView({ column, selectedId, active, actions, dragging, setDragging, wide = true }: {
  column: Column
  selectedId: string | null
  /** The column holds the selection (the field adds here). */
  active: boolean
  actions: ColumnActions
  dragging: string | null
  setDragging: (id: string | null) => void
  /** A fixed-width column on the board; the phone shows one list at full width. */
  wide?: boolean
}) {
  const [folded, setFolded] = useState(() => simpleLocal(`completed:${column.id}`, true))
  const [over, setOver] = useState<number | null>(null)
  const [draft, setDraft] = useState('')
  const headingId = `simple-col-${column.id}`
  const fold = (next: boolean) => { setFolded(next); setSimpleLocal(`completed:${column.id}`, next) }

  // The index a drop lands at: before the row under the pointer's upper half, after its lower half.
  const indexAt = (e: React.DragEvent, i: number) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const own = column.rows.findIndex((row) => row.task.id === dragging)
    const at = e.clientY > r.top + r.height / 2 ? i + 1 : i
    return own >= 0 && own < at ? at - 1 : at
  }
  const dropHere = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    const id = dragging ?? e.dataTransfer.getData('text/x-opentodo-task')
    setOver(null)
    setDragging(null)
    if (id) actions.drop(column.id, id, index)
  }

  return (
    <section aria-labelledby={headingId} data-simple-column={column.id} data-active={active || undefined}
      className={`flex shrink-0 flex-col self-start rounded-card border bg-surface p-2 ${wide ? 'w-80' : 'w-full'} ${active ? 'border-strong' : 'border-soft'}`}
      onDragOver={(e) => { if (dragging) { e.preventDefault(); if (over === null) setOver(column.rows.length) } }}
      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(null) }}
      onDrop={(e) => dropHere(e, over ?? column.rows.length)}>
      <h2 id={headingId} className="truncate px-2 pt-1 pb-2 text-h3 text-strong">{column.name}</h2>
      <form className="flex min-h-11 items-center gap-2 rounded-control px-2 text-accent focus-within:bg-hover"
        onSubmit={(e) => { e.preventDefault(); const line = draft.trim(); if (!line) return; setDraft(''); void actions.add(column.id, line) }}>
        <Icon name="plus" />
        <input value={draft} onChange={(e) => setDraft(e.target.value)} onFocus={() => actions.select(column.id, null)} placeholder={t('Add a task')} aria-label={t('Add a task to {list}', { list: column.name })}
          data-simple-add={column.id} className="min-w-0 flex-1 bg-transparent py-2 text-body text-default outline-none placeholder:text-accent" />
      </form>
      <ul aria-label={column.name} className="flex flex-col">
        {column.rows.map((row, i) => (
          <li key={row.task.id} className="list-none"
            onDragOver={(e) => { if (!dragging) return; e.preventDefault(); e.stopPropagation(); setOver(indexAt(e, i)) }}
            onDrop={(e) => { e.stopPropagation(); dropHere(e, over ?? i) }}>
            {over === i && dragging !== row.task.id && <div aria-hidden className="mx-2 h-0.5 rounded-full bg-accent" />}
            <ul className="flex flex-col" data-dragging={dragging === row.task.id || undefined}>
              <SimpleRow task={row.task} selected={selectedId === row.task.id} readOnly={!actions.canEdit(row.task)}
                onToggle={() => actions.toggle(row.task)} onStar={() => actions.star(row.task)} onOpen={() => actions.open(row.task)}
                onSelect={() => actions.select(column.id, row.task.id)}
                drag={{
                  onDragStart: (e) => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/x-opentodo-task', row.task.id); setDragging(row.task.id) },
                  onDragEnd: () => { setDragging(null); setOver(null) },
                }} />
              {row.subtasks.map((s) => (
                <SimpleRow key={s.task.id} task={s.task} sub childCount={s.childCount} selected={selectedId === s.task.id} readOnly={!actions.canEdit(s.task)}
                  onToggle={() => actions.toggle(s.task)} onStar={() => actions.star(s.task)} onOpen={() => actions.open(s.task)}
                  onSelect={() => actions.select(column.id, s.task.id)} />
              ))}
            </ul>
          </li>
        ))}
        {over === column.rows.length && dragging && <li aria-hidden className="mx-2 h-0.5 list-none rounded-full bg-accent" />}
      </ul>
      {column.completed.length > 0 && (
        <div className="mt-1 border-t border-soft pt-1">
          <button type="button" aria-expanded={!folded} onClick={() => fold(!folded)} data-simple-completed={column.id}
            className="flex min-h-11 w-full items-center gap-2 rounded-control px-2 text-start text-body text-muted hover:bg-hover focus-visible:outline-2 focus-visible:outline-focus">
            <Icon name={folded ? 'chevron-right' : 'chevron-down'} />
            {t('Completed ({n})', { n: column.completed.length })}
          </button>
          {!folded && (
            <ul aria-label={t('Completed')} className="flex flex-col">
              {column.completed.map((task) => (
                <SimpleRow key={task.id} task={task} readOnly={!actions.canEdit(task)} selected={selectedId === task.id}
                  onToggle={() => actions.toggle(task)} onStar={() => actions.star(task)} onOpen={() => actions.open(task)} />
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  )
}
