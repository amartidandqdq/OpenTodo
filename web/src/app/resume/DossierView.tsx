// One dossier (OpenSpec change resume-dossiers): the real steps in order, the
// next open task, the hold, attach/detach/reorder and the edit dialogs. The task
// rows keep their own list and are completed through the ordinary path.
import { useMemo, useRef, useState } from 'react'
import { compareDueThenPriority } from '../../lib/ordering'
import { localDueOf } from '../../lib/dates'
import { dossierState } from '../../lib/dossierModel'
import {
  attachTaskToDossier, createTaskInDossier, deleteDossier, detachTaskFromDossier, moveDossierTask,
  removeUnavailableDossierTasks, resumeDossier, setDossierWaiting, updateDossier,
} from '../../lib/dossiers'
import { t } from '../../lib/i18n'
import { useTasksById } from '../../lib/localData'
import type { Dossier, Task } from '../../lib/types'
import { Button, Combobox, ConfirmDialog, Dialog, EmptyState, Field, Icon, Input, Menu, MenuItem, Notice, PageBody, PageHeader, Skeleton, Textarea } from '../../ui'
import { messageOf } from '../../lib/errorText'
import { act, reportActionError } from '../actionError'
import { showUndoToast } from '../bulk/toastStore'
import { DateField } from '../datetime/DateField'
import { useDateTimeFormat } from '../DateTimePrefsProvider'
import { navigate } from '../router'
import { completeWithUndo } from '../undoable'
import { DossierCard, ReasonTip, dossierLists, dossierText, dossierTextLocked } from './DossierCard'
import { useDossierData } from './useDossierData'

const NO_IDS: string[] = []

interface UndoLike { id: string; label?: string }

export function DossierView({ id }: { id: string }) {
  const { tasks, dossiers, projectMap, canEdit, loaded } = useDossierData()
  const dossier = dossiers.find((d) => d.id === id)
  const [editing, setEditing] = useState(false)
  const [holding, setHolding] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [newTask, setNewTask] = useState(false)
  const picker = useRef<HTMLDivElement>(null)
  const state = useMemo(() => (dossier ? dossierState(dossier, tasks) : null), [dossier, tasks])
  const missingIds = state?.unavailable ?? NO_IDS
  const missingRows = useTasksById(missingIds)
  const unavailableNames = useMemo(() => {
    const byId = new Map(missingRows.map((task) => [task.id, task]))
    return missingIds.map((taskId) => dossierText(byId.get(taskId)?.title)).filter(Boolean)
  }, [missingIds, missingRows])
  const members = useMemo(() => new Set(dossier?.task_ids ?? []), [dossier])
  const candidates = useMemo(() => tasks
    .filter((task) => !task.completed_at && !task.deleted_at && !members.has(task.id) && canEdit(task))
    .filter((task) => !task.project_id || !projectMap.get(task.project_id)?.archived)
    .sort(compareDueThenPriority), [tasks, canEdit, projectMap, members])

  const toast = (entry: UndoLike | null | undefined, fallback: string) => {
    if (!entry) return
    // Library labels name the dossier and the task; keep them out of the toast when
    // either content field is an envelope this device cannot read.
    const label = entry.label ?? fallback
    const lockedLabel = (dossier && (dossierTextLocked(dossier.title) || dossierTextLocked(dossier.waiting_for))) || label.includes('enc:v')
    showUndoToast(lockedLabel ? fallback : label, entry.id)
  }
  const resume = async () => {
    if (!dossier) return
    try {
      toast(await resumeDossier(dossier.id), t('Dossier resumed'))
    } catch (err) {
      reportActionError(err)
    }
  }
  const complete = (task: Task) => act(completeWithUndo(task.id, true))
  const reopen = (task: Task) => act(completeWithUndo(task.id, false))
  const attach = async (task: Task) => {
    if (!dossier) return
    toast(await attachTaskToDossier(dossier.id, task.id), t('Task added to the dossier'))
  }
  const detach = async (task: Task) => {
    if (!dossier) return
    toast(await detachTaskFromDossier(dossier.id, task.id), t('Task removed from the dossier'))
  }
  const move = async (task: Task, delta: -1 | 1) => {
    if (!dossier || !state) return
    toast(await moveDossierTask(dossier.id, task.id, delta), t('Dossier order changed'))
  }
  const clean = async () => {
    if (!dossier || !state) return
    toast(await removeUnavailableDossierTasks(dossier.id, state.unavailable), t('Unavailable tasks removed'))
  }

  if (!loaded) {
    return <PageBody width="list"><PageHeader title={t('Dossier')} icon="compass" back={{ label: t('Pick up the thread'), onClick: () => navigate({ view: 'resume' }) }} /><Skeleton shape="row" count={4} /></PageBody>
  }
  if (!dossier || !state) {
    return (
      <PageBody width="list">
        <PageHeader title={t('Dossier')} icon="compass" back={{ label: t('Pick up the thread'), onClick: () => navigate({ view: 'resume' }) }} />
        <EmptyState title={t('This dossier is no longer there.')} body={t('It may have been deleted. Pick up the thread to see your other dossiers.')}
          action={{ label: t('Pick up the thread'), onClick: () => navigate({ view: 'resume' }) }} />
      </PageBody>
    )
  }
  const lists = dossierLists(dossier, tasks, projectMap)
  const lastDone = [...state.tasks].reverse().find((task) => task.completed_at)
  const nextEditable = state.next ? canEdit(state.next) : false
  const locked = dossierTextLocked(dossier.title) || dossierTextLocked(dossier.note) || dossierTextLocked(dossier.waiting_for)
  const actions = state.waiting
    ? <Button size="sm" variant="primary" icon="check" onClick={resume} data-dossier-resume>{t('The wait is resolved')}</Button>
    : state.next
      ? <>
          <ReasonTip reason={nextEditable ? undefined : t('This task is read-only')}>
            <Button size="sm" variant="primary" icon="check" disabled={!nextEditable}
              onClick={() => complete(state.next!)} data-dossier-complete>{t('Finish the step')}</Button>
          </ReasonTip>
          <ReasonTip reason={locked ? t('This text cannot be decrypted on this device.') : undefined}>
            <Button size="sm" variant="secondary" icon="hourglass" disabled={locked}
              onClick={() => setHolding(true)}>{t('Put on hold')}</Button>
          </ReasonTip>
        </>
      : state.complete && lastDone
        ? <Button size="sm" variant="secondary" icon="rotate-ccw" onClick={() => reopen(lastDone)} data-dossier-reopen>{t('Reopen the last step')}</Button>
        : <Button size="sm" variant="secondary" icon="plus" onClick={() => picker.current?.scrollIntoView?.({ block: 'center' })}>{t('Add a first task')}</Button>

  return (
    <PageBody width="list">
      <PageHeader title={dossierText(dossier.title) || t('Untitled dossier')} icon="compass" titleInPage
        eyebrow={lists.length ? lists.join(' · ') : t('No list')}
        meta={state.total > 0 ? t('{done} of {total} steps completed', { done: state.done, total: state.total }) : t('No task yet')}
        back={{ label: t('Pick up the thread'), onClick: () => navigate({ view: 'resume' }) }}
        actions={<>
          <ReasonTip reason={locked ? t('This text cannot be decrypted on this device.') : undefined}>
            <Button size="sm" variant="secondary" icon="pencil" disabled={locked}
              onClick={() => setEditing(true)} data-dossier-edit>{t('Edit')}</Button>
          </ReasonTip>
          <Button size="sm" variant="ghost" icon="trash-2" onClick={() => setDeleting(true)} data-dossier-delete>{t('Delete')}</Button>
        </>} />
      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,1fr)]">
        <div className="min-w-0">
          <DossierCard dossier={dossier} tasks={tasks} projects={projectMap} actions={actions} unavailableNames={unavailableNames} canEdit={canEdit} />
          {locked && (
            <div className="mt-3" data-dossier-locked-notice>
              <Notice tone="warning">{t('Some words in this dossier cannot be decrypted on this device. Renaming, the note and the hold are paused here; its steps are unchanged.')}</Notice>
            </div>
          )}
          {dossierText(dossier.note) && !dossierTextLocked(dossier.note) && (
            <section className="mt-3 rounded-control border border-default bg-surface px-3 py-2" aria-labelledby="dossier-note" data-dossier-note>
              <h2 id="dossier-note" className="text-hint font-semibold uppercase tracking-wide text-faint">{t('Note')}</h2>
              <p className="mt-1 whitespace-pre-wrap break-words text-prose text-default">{dossierText(dossier.note)}</p>
            </section>
          )}
          {state.waiting && (
            <div className="mt-3 rounded-control border border-default bg-surface px-3 py-2 text-meta" data-dossier-hold>
              <div className="flex flex-wrap items-center gap-2">
                <Icon name="hourglass" size="xs" className="shrink-0 text-warning" />
                <span className="min-w-0 flex-1 break-words font-medium text-strong">{dossierText(dossier.waiting_for) || t('On hold')}</span>
                <ReasonTip reason={locked ? t('This text cannot be decrypted on this device.') : undefined}>
                  <Button size="sm" variant="ghost" disabled={locked}
                    onClick={() => setHolding(true)}>{t('Change the hold')}</Button>
                </ReasonTip>
              </div>
            </div>
          )}
          {state.unavailable.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-control border border-warning bg-warning-soft px-3 py-2 text-meta text-on-warning-soft" data-dossier-unavailable>
              <Icon name="circle-alert" size="xs" className="shrink-0" />
              <span className="min-w-0 flex-1">{t('{n, plural, one {# task in this thread is no longer available} other {# tasks in this thread are no longer available}}', { n: state.unavailable.length })}</span>
              <Button size="sm" variant="secondary" onClick={() => act(clean())}>{t('Remove them')}</Button>
            </div>
          )}
          <div ref={picker} className="mt-4" data-dossier-attach>
            <Field label={t('Add an existing task')} description={t('Only open tasks you can edit, from this workspace.')}>
              <Combobox<Task> label={t('Add an existing task')} placeholder={t('Find an open task…')} emptyText={t('No open task matches.')}
                source={candidates} getKey={(task) => task.id} getLabel={(task) => dossierText(task.title) || t('Untitled')}
                getSecondary={(task) => task.project_id ? dossierText(projectMap.get(task.project_id)?.name) || t('List removed') : t('Inbox')}
                rankContext="dossier.task" onPick={(task) => act(attach(task))} />
            </Field>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-meta text-faint">{candidates.length === 0 ? t('Every open task you can edit is already here, or there is none.') : t('{n, plural, one {# open task can join this thread} other {# open tasks can join this thread}}', { n: candidates.length })}</p>
              <Button size="sm" variant="secondary" icon="plus" onClick={() => setNewTask(true)} data-dossier-new-task>{t('New task')}</Button>
            </div>
          </div>
        </div>
        <section className="min-w-0 border-t border-soft pt-5 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0" aria-labelledby="dossier-steps">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <h2 id="dossier-steps" className="text-meta font-semibold uppercase tracking-wide text-faint">{t('The thread')}</h2>
            <span className="ml-auto text-meta text-muted tabular-nums">{state.done}/{state.total}</span>
          </div>
          {state.tasks.length === 0 ? (
            <EmptyState compact icon="compass" title={t('No task yet.')} body={t('Add an existing task above, or create the first one here.')}
              action={{ label: t('New task'), onClick: () => setNewTask(true) }} />
          ) : (
            <ol className="space-y-1" data-dossier-steps>
              {state.tasks.map((task, index) => (
                <StepRow key={task.id} task={task} index={index} total={state.tasks.length} current={!state.waiting && state.next?.id === task.id}
                  readOnly={!canEdit(task)} projectName={task.project_id ? dossierText(projectMap.get(task.project_id)?.name) || t('List removed') : t('Inbox')}
                  onComplete={() => (task.completed_at ? reopen(task) : complete(task))}
                  onOpen={() => navigate({ view: 'task', id: task.id })}
                  onMove={(delta) => act(move(task, delta))} onDetach={() => act(detach(task))} />
              ))}
            </ol>
          )}
          {state.unavailable.length > 0 && <p className="mt-2 text-meta text-warning">{t('{n, plural, one {# unavailable task} other {# unavailable tasks}}', { n: state.unavailable.length })}</p>}
        </section>
      </div>
      {editing && !locked && <EditDossierDialog dossier={dossier} onClose={() => setEditing(false)} />}
      {holding && !locked && <HoldDossierDialog dossier={dossier} onClose={() => setHolding(false)} />}
      {newTask && <NewDossierTaskDialog dossier={dossier} onClose={() => setNewTask(false)} />}
      {deleting && (
        <ConfirmDialog title={t('Delete “{name}”?', { name: dossierText(dossier.title) || t('Untitled dossier') })} confirmLabel={t('Delete dossier')}
          consequence={t('The tasks stay in their lists. The dossier disappears from your dossiers; Undo can bring it back.')}
          onCancel={() => setDeleting(false)}
          onConfirm={async () => {
            const entry = await deleteDossier(dossier.id)
            if (entry) showUndoToast(entry.label ?? t('Dossier deleted'), entry.id)
            navigate({ view: 'resume' })
          }} />
      )}
    </PageBody>
  )
}

function StepRow({ task, index, total, current, readOnly, projectName, onComplete, onOpen, onMove, onDetach }: {
  task: Task
  index: number
  total: number
  current: boolean
  readOnly: boolean
  projectName: string
  onComplete: () => void
  onOpen: () => void
  onMove: (delta: -1 | 1) => void
  onDetach: () => void
}) {
  const dt = useDateTimeFormat()
  const done = !!task.completed_at
  const due = task.due ? localDueOf(task.due) : null
  return (
    <li data-dossier-step={task.id} data-done={done || undefined} data-current={current || undefined}
      className={`flex min-w-0 items-start gap-2 rounded-control px-2 py-2 ${current ? 'bg-accent-soft' : 'hover:bg-sunken'}`}>
      <ReasonTip reason={readOnly ? t('This task is read-only') : undefined}>
      <button type="button" aria-label={`${t('Step {n} of {count}', { n: index + 1, count: total })}: ${done ? t('Reopen {title}', { title: dossierText(task.title) }) : t('Complete {title}', { title: dossierText(task.title) })}`}
        aria-pressed={done} disabled={readOnly} onClick={onComplete}
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-hint ${done ? 'border-transparent bg-sunken text-muted' : current ? 'border-accent text-on-accent-soft' : 'border-default text-muted'} disabled:opacity-50`}>
        {done ? <Icon name="check" size="xs" /> : <span aria-hidden="true">{index + 1}</span>}
      </button>
      </ReasonTip>
      <div className="min-w-0 flex-1">
        <button type="button" onClick={onOpen} className={`block max-w-full break-words text-left text-body ${done ? 'text-muted line-through decoration-1' : 'text-strong'}`}>
          {dossierText(task.title) || t('Untitled')}
        </button>
        <p className="mt-0.5 text-meta text-muted">
          {projectName}
          {due && <> · {dt.formatDate(due.date, 'compact')}{due.time ? ` ${dt.formatTime(due.time)}` : ''}</>}
          {done && <> · {t('Done')}</>}
          {readOnly && <> · {t('read-only')}</>}
        </p>
      </div>
      <Menu kind="menu" label={t('Actions for {title}', { title: dossierText(task.title) })} title={t('Step')} width="sm:w-56"
        trigger={<Icon name="ellipsis" size="sm" />} triggerClassName="ui-btn ui-btn--icon ui-btn--ghost ui-btn--sm shrink-0">
        <MenuItem label={t('Move up')} icon="arrow-up" disabled={index === 0} onSelect={() => onMove(-1)} />
        <MenuItem label={t('Move down')} icon="arrow-down" disabled={index === total - 1} onSelect={() => onMove(1)} />
        <MenuItem label={t('Remove from the dossier')} icon="x" danger onSelect={onDetach} />
      </Menu>
    </li>
  )
}

function EditDossierDialog({ dossier, onClose }: { dossier: Dossier; onClose: () => void }) {
  const [title, setTitle] = useState(dossier.title)
  const [note, setNote] = useState(dossier.note)
  const [error, setError] = useState<string | null>(null)
  const save = async () => {
    try {
      const entry = await updateDossier(dossier.id, { title, note })
      if (entry) showUndoToast(entry.label ?? t('Dossier updated'), entry.id)
      onClose()
    } catch (err) {
      setError(messageOf(err))
    }
  }
  return (
    <Dialog title={t('Edit dossier')} label={t('Edit dossier')} onClose={onClose}>
      <div className="space-y-3">
        <Field label={t('Name')}><Input autoFocus value={title} onChange={(e) => { setTitle(e.target.value); setError(null) }} /></Field>
        <Field label={t('Note')} description={t('Context for this thread, not a task.')}><Textarea value={note} onChange={(e) => setNote(e.target.value)} /></Field>
        {error && <p role="alert" className="text-meta text-danger">{error}</p>}
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>{t('Cancel')}</Button>
          <Button variant="primary" onClick={save} data-dossier-save>{t('Save')}</Button>
        </div>
      </div>
    </Dialog>
  )
}

function HoldDossierDialog({ dossier, onClose }: { dossier: Dossier; onClose: () => void }) {
  const [waitingFor, setWaitingFor] = useState(dossier.waiting_for)
  const [followUp, setFollowUp] = useState<string | null>(dossier.follow_up)
  const [error, setError] = useState<string | null>(null)
  const save = async () => {
    try {
      const entry = await setDossierWaiting(dossier.id, waitingFor, followUp)
      if (entry) showUndoToast(entry.label ?? t('Dossier on hold'), entry.id)
      onClose()
    } catch (err) {
      setError(messageOf(err))
    }
  }
  return (
    <Dialog title={t('Put the thread on hold')} label={t('Put the thread on hold')} onClose={onClose}>
      <div className="space-y-3">
        <Field label={t('What are you waiting for?')} description={t('For example: the delivery, an answer, a quote.')}>
          <Input autoFocus value={waitingFor} onChange={(e) => { setWaitingFor(e.target.value); setError(null) }} placeholder={t('The delivery')} />
        </Field>
        <div className="space-y-1.5">
          <p className="text-body font-medium text-default">{t('Follow-up date (optional)')}</p>
          <DateField label={t('Follow-up date (optional)')} hideLabel value={followUp} onChange={setFollowUp} />
          <p className="text-meta text-muted">{t('This date is not a task due date. It only brings the thread back into view.')}</p>
        </div>
        {error && <p role="alert" className="text-meta text-danger">{error}</p>}
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>{t('Cancel')}</Button>
          <Button variant="primary" icon="hourglass" onClick={save} data-dossier-hold-save>{t('Put on hold')}</Button>
        </div>
      </div>
    </Dialog>
  )
}

function NewDossierTaskDialog({ dossier, onClose }: { dossier: Dossier; onClose: () => void }) {
  const [title, setTitle] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const add = async () => {
    const name = title.trim()
    if (!name) {
      setError(t('Please enter a title'))
      return
    }
    if (busy) return
    setBusy(true)
    try {
      const entry = await createTaskInDossier(dossier.id, name)
      onClose()
      if (entry) showUndoToast(entry.label ?? t('Task added to the dossier'), entry.id)
    } catch (err) {
      setError(messageOf(err))
    } finally {
      setBusy(false)
    }
  }
  return (
    <Dialog title={t('New task in {dossier}', { dossier: dossierText(dossier.title) || t('Untitled dossier') })} label={t('New task')} onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); void add() }} className="space-y-3">
        <Field label={t('Task title')}><Input autoFocus value={title} onChange={(e) => { setTitle(e.target.value); setError(null) }} placeholder={t('A first step')} /></Field>
        <p className="text-meta text-muted">{t('It is created in your Inbox and only joins this dossier; it does not change any other task.')}</p>
        {error && <p role="alert" className="text-meta text-danger">{error}</p>}
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>{t('Cancel')}</Button>
          <Button variant="primary" icon="plus" type="submit" disabled={busy} data-dossier-new-save>{t('Add task')}</Button>
        </div>
      </form>
    </Dialog>
  )
}
