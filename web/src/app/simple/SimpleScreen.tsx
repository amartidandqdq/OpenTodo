// The Simple screen (OpenSpec change simple-mode): lists side by side, one-line tasks
// with a star, and one field that adds a task or asks the assistant. It replaces the
// shell like the display does (design D1), reads only local rows (so it works offline
// and follows other devices as they sync) and writes through the same ops and undo
// helpers as the full app. Below 768 px it shows one list at a time under tabs.
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Tabs, useMediaQuery } from '../../ui'
import { openAssistantWith, useAssistantOpen, useAssistantStatus, type AssistantStatus } from '../../lib/assistantStatus'
import { t } from '../../lib/i18n'
import { useLiveTasks } from '../../lib/liveTasks'
import { useLabels, useLiveSections, useMemberships, useProjects, useUserPrefsRow } from '../../lib/localData'
import { createTask } from '../../lib/ops'
import { useOnline } from '../../lib/online'
import { canEditTask } from '../../lib/sharing'
import { dropPlacement, setSimpleLocal, simpleColumns, simpleLocal } from '../../lib/simpleBoard'
import { hiddenLists, isStarred, MY_TASKS } from '../../lib/simpleMode'
import type { Task } from '../../lib/types'
import { placeUndoable, starUndoable } from '../../lib/simpleActions'
import { ActionToasts } from '../ActionToasts'
import { act } from '../actionError'
import { showUndoToast } from '../bulk/toastStore'
import { PanelBoundary } from '../PanelBoundary'
import { lineToInput } from '../palette/lineInput'
import { navigate, routePath } from '../router'
import { openTaskPage } from '../taskTrail'
import { completeWithUndo } from '../undoable'
import { SimpleColumnView, type ColumnActions } from './SimpleColumn'
import { SimpleEditor } from './SimpleEditor'
import { SimpleField, type FieldAssistant } from './SimpleField'
import { SimpleMenu } from './SimpleMenu'
import { useSimpleKeys } from './simpleKeys'

const AssistantRoot = lazy(() => import('../assistant/AssistantRoot'))

/** The assistant may take requests here (simple-mode "The single field"; encrypted accounts only on the device). */
export function askable(s: AssistantStatus | null): boolean {
  return !!s && s.available && s.reason !== 'demo'
}

async function withUndo(p: Promise<{ entry: { id: string } | null; label: string }>): Promise<void> {
  const r = await p
  if (r.entry) showUndoToast(r.label, r.entry.id)
}

export function SimpleScreen({ name = '' }: { name?: string }) {
  const tasks = useLiveTasks()
  const projects = useProjects()
  const labels = useLabels()
  const sections = useLiveSections()
  const prefs = useUserPrefsRow()
  const memberships = useMemberships()
  const memberMap = useMemo(() => new Map(memberships.map((m) => [m.projectId, m])), [memberships])
  const hidden = useMemo(() => hiddenLists(prefs), [prefs])
  const columns = useMemo(() => (tasks ? simpleColumns(tasks, projects, sections, hidden, t('My tasks')) : []), [tasks, projects, sections, hidden])
  const wide = useMediaQuery('(min-width: 48rem)')
  const online = useOnline()
  const status = useAssistantStatus()
  const assistantOpen = useAssistantOpen()
  const [assistantLoaded, setAssistantLoaded] = useState(false)
  useEffect(() => { if (assistantOpen) setAssistantLoaded(true) }, [assistantOpen])

  const [columnId, setColumnId] = useState<string>(() => simpleLocal('tab', MY_TASKS))
  const [taskId, setTaskId] = useState<string | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const [dragging, setDragging] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const field = useRef<HTMLInputElement>(null)
  const column = columns.find((c) => c.id === columnId) ?? columns[0]
  const byId = useMemo(() => new Map((tasks ?? []).map((tk) => [tk.id, tk])), [tasks])
  const selected = taskId ? byId.get(taskId) ?? null : null

  const selectColumn = useCallback((id: string, task: string | null = null) => {
    setColumnId(id)
    setTaskId(task)
    setSimpleLocal('tab', id)
  }, [])

  const add = useCallback(async (target: string, line: string) => {
    const input = await lineToInput(line, projects, labels)
    // A list token wins; else the column the line was typed for (simple-mode "The single field").
    const project = input.project_id ?? (target === MY_TASKS ? null : target)
    await createTask({ ...input, project_id: project })
  }, [projects, labels])

  const drop = useCallback((target: string, id: string, index: number) => {
    const col = columns.find((c) => c.id === target)
    const task = byId.get(id)
    if (!col || !task || task.parent_id) return
    const same = (task.project_id ?? MY_TASKS) === target
    const place = dropPlacement(col.rows.map((r) => r.task), id, index, same)
    act(withUndo(placeUndoable(id, { projectId: target === MY_TASKS ? null : target, ...place }, col.name)))
  }, [columns, byId])

  const actions: ColumnActions = useMemo(() => ({
    toggle: (task: Task) => act(completeWithUndo(task.id, !task.completed_at)),
    star: (task: Task) => act(withUndo(starUndoable(task.id, !isStarred(task)))),
    open: (task: Task) => setEditing(task.id),
    select: selectColumn,
    add,
    drop,
    canEdit: (task: Task) => canEditTask(task, memberMap),
  }), [selectColumn, add, drop, memberMap])

  // Asking needs a connection unless the assistant runs on this device (simple-mode "Ask while offline").
  const reach = (): boolean => {
    if (!online && status?.mode !== 'device') { setNotice(t('The assistant needs a connection.')); return false }
    setNotice(null)
    return true
  }
  const breakDown = (task: Task) => { if (reach()) openAssistantWith({ skill: 'break-down', text: t('Break down “{title}”', { title: task.title }), selected: [task.id], send: true, review: true }) }
  const assistant: FieldAssistant | null = askable(status) ? {
    ask: (text) => { if (!reach()) return false; openAssistantWith({ text, send: true }); return true },
    run: (skill, text) => {
      if (skill === 'break-down' && selected) { breakDown(selected); return true }
      if (!reach()) return false
      const prompt = skill === 'plan-day' ? t('Plan my day') : skill === 'tidy-up' ? t('Tidy up my tasks') : text
      openAssistantWith({ skill, text: prompt, send: true, review: true })
      return true
    },
    selectedTitle: selected?.title ?? null,
  } : null

  const openFull = (task: Task) => {
    setEditing(null)
    openTaskPage(task.id, { from: routePath(task.project_id ? { view: 'project', id: task.project_id } : { view: 'inbox' }) })
  }

  useSimpleKeys({ columns, column, taskId, field, paused: editing !== null, select: selectColumn, actions, open: setEditing })

  if (!tasks || !column) return <main className="h-dvh bg-canvas" aria-busy="true" />
  const editingTask = editing ? byId.get(editing) : undefined
  return (
    <main className="flex h-dvh flex-col bg-canvas" data-simple-screen>
      <header className="flex shrink-0 items-start gap-2 px-4 pt-3 pb-2">
        <SimpleField inputRef={field} listName={column.name} onAdd={(line) => add(column.id, line)} assistant={assistant} notice={notice} />
        <SimpleMenu projects={projects} hidden={hidden} onLeave={() => navigate({ view: 'inbox' })} onCreated={(id) => selectColumn(id)} />
      </header>
      <div className="min-h-0 flex-1 overflow-auto" data-simple-board>
        {wide ? (
          <div className="flex min-w-max items-start gap-3 px-4 pb-6">
            {columns.map((c) => (
              <SimpleColumnView key={c.id} column={c} selectedId={taskId} active={c.id === column.id} actions={actions} dragging={dragging} setDragging={setDragging} />
            ))}
          </div>
        ) : (
          // The tabs stay above the list while it scrolls (one scroll region, simple-mode D7).
          <Tabs label={t('Lists')} tabs={columns.map((c) => ({ id: c.id, label: c.name }))} value={column.id} onChange={(id) => selectColumn(id)}
            rowClassName="sticky top-0 z-1 bg-canvas px-4">
            <SwipeArea onSwipe={(dir) => {
              const i = columns.findIndex((c) => c.id === column.id)
              const next = columns[i + dir]
              if (next) selectColumn(next.id)
            }}>
              <SimpleColumnView key={column.id} column={column} selectedId={taskId} active actions={actions} dragging={dragging} setDragging={setDragging} wide={false} />
            </SwipeArea>
          </Tabs>
        )}
      </div>
      {editing && editingTask !== undefined && (
        <SimpleEditor id={editing} projects={projects} readOnly={!canEditTask(editingTask, memberMap)} onClose={() => setEditing(null)}
          onStar={actions.star} onBreakDown={assistant ? (task) => { setEditing(null); breakDown(task) } : undefined} onOpenFull={openFull} onOpenTask={setEditing} />
      )}
      {assistantLoaded && <PanelBoundary><Suspense fallback={null}><AssistantRoot name={name} context={() => ({ view: 'simple', projectId: column.id === MY_TASKS ? undefined : column.id, selected: taskId ? [taskId] : undefined })} /></Suspense></PanelBoundary>}
      <ActionToasts />
    </main>
  )
}

/** A horizontal swipe on the list moves to the next or previous tab (simple-mode "Phone layout"). */
function SwipeArea({ onSwipe, children }: { onSwipe: (dir: 1 | -1) => void; children: React.ReactNode }) {
  const start = useRef<{ x: number; y: number } | null>(null)
  return (
    <div className="px-4 pb-6" data-simple-swipe
      onTouchStart={(e) => { const p = e.touches[0]; start.current = p ? { x: p.clientX, y: p.clientY } : null }}
      onTouchEnd={(e) => {
        const s = start.current
        const p = e.changedTouches[0]
        start.current = null
        if (!s || !p) return
        const dx = p.clientX - s.x
        // A clear sideways stroke only; vertical scrolling stays scrolling.
        if (Math.abs(dx) > 60 && Math.abs(dx) > 2 * Math.abs(p.clientY - s.y)) onSwipe(dx < 0 ? 1 : -1)
      }}>
      {children}
    </div>
  )
}
