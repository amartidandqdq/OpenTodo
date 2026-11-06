// The Simple screen's task editor (OpenSpec change simple-mode, "Task editor"): a
// sheet over the board with the title, notes, due date, star, list and subtasks, and
// a menu with Break this down, Delete and Open in full app. It uses the full app's
// notes editor (its own lazy chunk), date and time fields, list picker and undo
// helpers, so an edit here is the same op as an edit there. It leaves out the full
// panel's pieces (zone control, subtask paste) so the screen's chunk shares nothing
// new with the first load. Opening the full app leaves the Simple preference alone.
import { lazy, Suspense, useEffect, useState } from 'react'
import { Dialog, Icon, IconButton, Menu, MenuItem, MenuSeparator } from '../../ui'
import { dueFromView, localDueOf } from '../../lib/dates'
import { t } from '../../lib/i18n'
import { useSubtasks, useTask } from '../../lib/localData'
import { createSubtask, updateTask } from '../../lib/ops'
import { isStarred } from '../../lib/simpleMode'
import type { Project, Task } from '../../lib/types'
import { useResetOnChange } from '../../lib/useResetOnChange'
import { act } from '../actionError'
import { DateField } from '../datetime/DateField'
import { TimeField } from '../datetime/TimeField'
import { PanelBoundary } from '../PanelBoundary'
import { ProjectPickerField } from '../ProjectPickerField'
import { completeWithUndo, deleteWithUndo, moveWithUndo, setDueWithUndo } from '../undoable'
import { useViewerZone } from '../useViews'
import { SimpleRow } from './SimpleRow'

const NotesEditor = lazy(() => import('../NotesEditor'))

/** One-click alternatives to dragging a row (accessibility-aa D3); a step is absent where it cannot move. */
export interface SimpleReorder { up?: () => void; down?: () => void; top?: () => void; bottom?: () => void }

export function SimpleEditor({ id, projects, readOnly, onClose, onStar, onBreakDown, onOpenFull, onOpenTask, reorder }: {
  id: string
  projects: readonly Project[]
  readOnly: boolean
  onClose: () => void
  onStar: (task: Task) => void
  /** Absent while the assistant is not available. */
  onBreakDown?: (task: Task) => void
  onOpenFull: (task: Task) => void
  /** Edits another task (a subtask) in the same sheet. */
  onOpenTask: (id: string) => void
  /** Absent for a subtask, a completed task or a read-only one. */
  reorder?: SimpleReorder
}) {
  const task = useTask(id)
  const subtasks = useSubtasks(id)
  const [title, setTitle] = useState(task?.title ?? '')
  useResetOnChange([task?.title], () => setTitle(task?.title ?? ''))
  const gone = task === null || !!task?.deleted_at
  // Deleted here or on another device: the sheet closes.
  useEffect(() => { if (gone) onClose() }, [gone, onClose])
  if (!task || gone) return null
  const commitTitle = () => {
    const next = title.trim()
    if (next && next !== task.title) act(updateTask(task.id, { title: next }))
    else setTitle(task.title)
  }
  const starred = isStarred(task)
  const listName = (pid: string | null) => (pid ? projects.find((p) => p.id === pid)?.name ?? '' : t('My tasks'))
  return (
    <Dialog label={task.title || t('Untitled')} onClose={onClose} size="md" placement="sheet" testId="simple-editor" title={
      <span className="flex items-center gap-1">
        <input value={title} disabled={readOnly} onChange={(e) => setTitle(e.target.value)} onBlur={commitTitle} aria-label={t('Title')}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commitTitle() } }}
          className="min-w-0 flex-1 rounded-control bg-transparent px-1 py-1 text-h3 text-strong focus-visible:outline-2 focus-visible:outline-focus" />
        <button type="button" disabled={readOnly} onClick={() => onStar(task)} aria-label={starred ? t('Starred') : t('Not starred')}
          className={`touch-target inline-flex size-11 shrink-0 items-center justify-center rounded-control focus-visible:outline-2 focus-visible:outline-focus ${starred ? 'text-accent' : 'text-faint hover:text-default'}`}>
          <Icon name="star" size="md" className={starred ? 'fill-current' : undefined} />
        </button>
        <Menu label={t('More actions')} align="end" kind="menu" triggerClassName="touch-target inline-flex size-11 shrink-0 items-center justify-center rounded-control text-muted hover:bg-hover"
          trigger={<Icon name="ellipsis" />}>
          {onBreakDown && <MenuItem icon="sparkles" label={t('Break this down')} disabled={readOnly} onSelect={() => onBreakDown(task)} />}
          <MenuItem icon="external-link" label={t('Open in full app')} onSelect={() => onOpenFull(task)} />
          {reorder && !readOnly && (
            <>
              <MenuSeparator />
              <MenuItem data-reorder="up" label={t('Move up')} disabled={!reorder.up} onSelect={() => reorder.up?.()} />
              <MenuItem data-reorder="down" label={t('Move down')} disabled={!reorder.down} onSelect={() => reorder.down?.()} />
              <MenuItem data-reorder="top" label={t('Move to top')} disabled={!reorder.top} onSelect={() => reorder.top?.()} />
              <MenuItem data-reorder="bottom" label={t('Move to bottom')} disabled={!reorder.bottom} onSelect={() => reorder.bottom?.()} />
            </>
          )}
          <MenuSeparator />
          <MenuItem icon="trash-2" label={t('Delete')} danger disabled={readOnly} onSelect={() => { onClose(); act(deleteWithUndo(task.id)) }} />
        </Menu>
      </span>
    }>
      {/* Opening lands here, not on the title: no keyboard on a phone, no ring or tooltip. */}
      <div className="flex flex-col gap-4 outline-none" tabIndex={-1} data-autofocus>
        <PanelBoundary>
          <Suspense fallback={<p className="text-body text-muted">{task.description || t('Add notes…')}</p>}>
            <NotesEditor key={task.id} note={{ ...task, entity: 'task' }} readOnly={readOnly} />
          </Suspense>
        </PanelBoundary>
        <SimpleDue task={task} readOnly={readOnly} />
        {!task.parent_id && (
          <ProjectPickerField label={t('List')} projects={projects} value={task.project_id} inbox={false} noneLabel={t('My tasks')} rankContext="simple.list" disabled={readOnly}
            onChange={(pid) => act(moveWithUndo(task.id, pid, listName(pid)))} />
        )}
        <SimpleSubtasks task={task} items={subtasks} readOnly={readOnly} onStar={onStar} onOpen={onOpenTask} />
      </div>
    </Dialog>
  )
}

/** The due date and optional time in the viewer's zone; a zoned due keeps its zone (dueFromView). */
function SimpleDue({ task, readOnly }: { task: Task; readOnly: boolean }) {
  const zone = useViewerZone()
  const view = localDueOf(task.due, zone)
  const set = (next: { date: string; time?: string } | null) => act(setDueWithUndo(task.id, dueFromView(task.due, next, zone)))
  return (
    <div className="flex flex-wrap items-start gap-2">
      <DateField label={t('Due date')} hideLabel className="min-w-44 flex-1" value={view?.date ?? null} disabled={readOnly}
        onChange={(date) => set(date ? { date, ...(view?.time ? { time: view.time } : {}) } : null)} />
      <TimeField label={t('Due time')} hideLabel placeholder={t('Add time')} value={view?.time ?? null} disabled={readOnly || !view}
        onChange={(time) => view && set(time ? { date: view.date, time } : { date: view.date })} />
      {task.due && !readOnly && <IconButton icon="x" label={t('Clear due date')} onClick={() => act(setDueWithUndo(task.id, null))} />}
    </div>
  )
}

/** The task's subtasks as Simple rows, with an "Add subtask" line. */
function SimpleSubtasks({ task, items, readOnly, onStar, onOpen }: { task: Task; items: Task[]; readOnly: boolean; onStar: (task: Task) => void; onOpen: (id: string) => void }) {
  const [draft, setDraft] = useState('')
  return (
    <section aria-label={t('Subtasks')}>
      <ul className="flex flex-col">
        {items.map((s) => (
          <SimpleRow key={s.id} task={s} readOnly={readOnly} onToggle={() => act(completeWithUndo(s.id, !s.completed_at))} onStar={() => onStar(s)} onOpen={() => onOpen(s.id)} />
        ))}
      </ul>
      {!readOnly && (
        <form className="flex min-h-11 items-center gap-2 rounded-control px-2 text-accent focus-within:bg-hover focus-within:outline-2 focus-within:outline-focus"
          onSubmit={(e) => { e.preventDefault(); const title = draft.trim(); if (!title) return; setDraft(''); act(createSubtask(task.id, title)) }}>
          <Icon name="plus" />
          <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={t('Add subtask')} aria-label={t('Add subtask')}
            className="min-w-0 flex-1 bg-transparent py-2 text-body text-default outline-none placeholder:text-accent" />
        </form>
      )}
    </section>
  )
}
