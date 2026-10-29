// Pick up the thread (OpenSpec change resume-dossiers): a bordered capture, the
// local dossier offer, one thread to advance and the context chips of the labels
// already on open tasks. Everything is read from the local rows; the page never
// invents a dossier, a context, a date or progress.
import { useEffect, useMemo, useState } from 'react'
import { addDaysISO } from '../../lib/dates'
import { compareDueThenPriority } from '../../lib/ordering'
import { resolveLabels } from '../../lib/labels'
import { hasTimeColumn } from '../../lib/rowTime'
import { contextChips, contextName, dossierState, featuredDossier } from '../../lib/dossierModel'
import { createDossier, resumeDossier, setDossierWaiting } from '../../lib/dossiers'
import { createTaskThenSuggest } from '../../lib/assistantSuggest'
import { t } from '../../lib/i18n'
import { readString, writeString } from '../../lib/deviceStorage'
import type { Dossier, Task } from '../../lib/types'
import { Button, Icon, PageBody, PageHeader, Skeleton } from '../../ui'
import { act, reportActionError } from '../actionError'
import { showUndoToast } from '../bulk/toastStore'
import { useDateTimeFormat } from '../DateTimePrefsProvider'
import { NamePrompt } from '../NamePrompt'
import { QuickAdd, type QuickAddInput } from '../QuickAdd'
import { navigate } from '../router'
import { TaskRow } from '../TaskRow'
import { completeWithUndo } from '../undoable'
import { useWorkspaceName } from '../workspaceNav'
import { ContextLabelsDialog } from './ContextLabelsDialog'
import { DossierCard, DossierFocusButton, ReasonTip, dossierStatusText, dossierText, dossierTextLocked } from './DossierCard'
import { DossierLinkCard } from './DossierLinkCard'
import { useDossierData } from './useDossierData'

/** Device-only flag: the first-use note was dismissed on this device (never synced). */
export const DOSSIER_NOTE_KEY = 'ot.resume.dossierNote'

/** One sentence on what a dossier is, under "New dossier", until it is dismissed once. */
function DossierNote() {
  const [hidden, setHidden] = useState(() => readString(DOSSIER_NOTE_KEY) === '1')
  if (hidden) return null
  const dismiss = () => {
    writeString(DOSSIER_NOTE_KEY, '1')
    setHidden(true)
  }
  return (
    <div className="flex max-w-[30ch] items-start gap-2 rounded-control border border-soft bg-sunken px-2.5 py-2 text-meta text-default" data-dossier-note>
      <p className="min-w-0 flex-1">{t('A dossier links existing tasks in one order. The tasks stay in their lists.')}</p>
      <button type="button" className="ui-btn ui-btn--ghost ui-btn--sm touch-target -my-1 -mr-1 px-1.5 py-1 text-muted" aria-label={t('Dismiss')} onClick={dismiss} data-dossier-note-dismiss>
        <Icon name="x" size="xs" />
      </button>
    </div>
  )
}

export function ResumeView() {
  const data = useDossierData()
  const canEdit = data.canEdit
  const dt = useDateTimeFormat()
  const workspace = useWorkspaceName()
  const [labelId, setLabelId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [editingLabels, setEditingLabels] = useState(false)
  const featured = useMemo(() => featuredDossier(data.dossiers, data.tasks, data.review, data.today), [data.dossiers, data.tasks, data.review, data.today])
  const featuredState = useMemo(() => (featured ? dossierState(featured, data.tasks) : null), [featured, data.tasks])
  const openTasks = useMemo(() => data.tasks
    .filter((task) => !task.completed_at && !task.deleted_at)
    .sort(compareDueThenPriority), [data.tasks])
  // Only a thread's current step is possible. Later steps and waiting threads
  // stay in their dossiers; the featured card already presents its current step.
  const possible = useMemo(() => {
    const hidden = new Set<string>()
    for (const dossier of data.dossiers) {
      const state = dossierState(dossier, data.tasks)
      for (const task of state.tasks) if (state.waiting || task.id !== state.next?.id || dossier.id === featured?.id) hidden.add(task.id)
    }
    return openTasks.filter((task) => !hidden.has(task.id))
  }, [openTasks, data.dossiers, data.tasks, featured])
  const editableOpen = useMemo(() => openTasks.filter((task) => canEdit(task)), [openTasks, canEdit])
  // Chips count what the column can actually show: the featured card already owns
  // its next action, so a label carried only by that row is not offered as a filter.
  const chips = useMemo(() => contextChips(possible, data.labels).slice(0, 8), [possible, data.labels])
  const shown = labelId ? possible.filter((task) => task.labels.includes(labelId)) : possible
  const timeColumn = useMemo(() => hasTimeColumn(shown), [shown])

  // A label removed or moved elsewhere stops being a context chip; do not keep a
  // filter that no longer names anything.
  useEffect(() => {
    if (labelId && !chips.some(({ label }) => label.id === labelId)) setLabelId(null)
  }, [chips, labelId])

  const add = async (input: QuickAddInput) => {
    const title = input.title.trim()
    if (!title) return
    try {
      await createTaskThenSuggest(input)
    } catch (err) {
      reportActionError(err)
    }
  }

  const create = async (name: string) => {
    const { id, entry } = await createDossier(name)
    setCreating(false)
    if (entry) showUndoToast(entry.label ?? t('Dossier created'), entry.id)
    navigate({ view: 'dossier', id })
  }

  const resumeFeatured = async () => {
    if (!featured) return
    try {
      const entry = await resumeDossier(featured.id)
      if (entry) {
        const fallback = t('Dossier resumed')
        const locked = dossierTextLocked(featured.title) || dossierTextLocked(featured.waiting_for)
        showUndoToast(locked ? fallback : entry.label ?? fallback, entry.id)
      }
    } catch (err) {
      reportActionError(err)
    }
  }

  // "Not now" puts the featured thread on hold until tomorrow, so the next thread
  // takes its place; the hold is the dossier's own, nothing on a task changes.
  const postponeFeatured = async () => {
    if (!featured) return
    try {
      const entry = await setDossierWaiting(featured.id, t('Not now'), addDaysISO(data.today, 1))
      if (entry) {
        const locked = dossierTextLocked(featured.title)
        showUndoToast(locked ? t('Dossier on hold') : entry.label ?? t('Dossier on hold'), entry.id)
      }
    } catch (err) {
      reportActionError(err)
    }
  }

  const featuredNext = featuredState?.next ?? null
  const featuredHeading = !featuredState ? t('A thread of your own')
    : featuredState.waiting ? t('A thread on hold')
      : featuredState.complete ? t('A finished thread')
        : featuredState.empty ? t('A thread of your own') : t('A thread to advance')
  return (
    <PageBody width="list">
      <PageHeader title={t('Pick up the thread')} icon="compass" step="display" titleInPage
        eyebrow={<span className="uppercase tracking-wide">{workspace || t('Personal')} · {dt.formatDate(data.today, 'heading')}</span>}
        actions={<div className="flex flex-col items-end gap-2">
          <Button variant="secondary" size="sm" icon="plus" onClick={() => setCreating(true)} data-new-dossier>{t('New dossier')}</Button>
          <DossierNote />
        </div>} />
      <p className="mb-5 max-w-[65ch] text-meta text-muted">{t('One clear next action. Everything else stays where it is.')}</p>
      <div className="mb-5 rounded-control border border-default bg-surface px-3 py-1.5" data-resume-capture>
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1"><QuickAdd placeholder={t('A thought, a task…')} label={t('Add a task')} projects={data.projects} labels={data.labels}
            formId="resume-capture" hideHint voiceShortcut onAdd={add} /></div>
          <button type="submit" form="resume-capture" className="ui-btn ui-btn--ghost ui-btn--sm touch-target px-1.5 text-muted" aria-label={t('Add')}><Icon name="corner-down-right" /></button>
        </div>
      </div>
      <DossierLinkCard />
      {!data.loaded ? <Skeleton shape="row" count={4} /> : (
        <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,1fr)]">
          <section className="min-w-0" aria-labelledby="resume-thread">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <h2 id="resume-thread" className="text-meta font-semibold uppercase tracking-wide text-faint">{featuredHeading}</h2>
              <span className="ml-auto text-meta text-muted">{t('{n, plural, one {# dossier} other {# dossiers}}', { n: data.dossiers.length })}</span>
            </div>
            {featured ? (
              <DossierCard dossier={featured} tasks={data.tasks} projects={data.projectMap} canEdit={canEdit} onOpen={() => navigate({ view: 'dossier', id: featured.id })}
                actions={featuredState?.waiting
                  ? <>
                      <Button size="sm" variant="primary" icon="check" onClick={() => act(resumeFeatured())} data-resume-waiting>{t('The wait is resolved')}</Button>
                      <Button size="sm" variant="secondary" onClick={() => navigate({ view: 'dossier', id: featured.id })}>{t('Open the thread')}</Button>
                    </>
                  : <>
                      {featuredNext && (
                        <ReasonTip reason={canEdit(featuredNext) ? undefined : t('This task is read-only')}>
                          <Button size="sm" variant="primary" icon="check" disabled={!canEdit(featuredNext)}
                            onClick={() => act(completeWithUndo(featuredNext.id, true))} data-resume-step>{t('Finish the step')}</Button>
                        </ReasonTip>
                      )}
                      <Button size="sm" variant="secondary" onClick={() => navigate({ view: 'dossier', id: featured.id })}>{t('Open the thread')}</Button>
                      <Button size="sm" variant="ghost" onClick={() => act(postponeFeatured())} data-resume-later>{t('Not now')}</Button>
                    </>} />
            ) : (
              <div className="surface-card p-5" data-resume-empty>
                <h2 className="text-body font-medium text-strong">{t('A dossier links the steps of one thread.')}</h2>
                <p className="mt-1 max-w-[55ch] text-meta text-muted">{t('Create one from existing tasks. Nothing moves, and no date changes.')}</p>
                <Button className="mt-3" size="sm" variant="primary" icon="plus" onClick={() => setCreating(true)}>{t('Create a dossier')}</Button>
              </div>
            )}
            <DossiersList dossiers={data.dossiers} tasks={data.tasks} featured={featured?.id ?? null} />
          </section>
          <section className="min-w-0 border-t border-soft pt-5 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0" aria-labelledby="resume-contexts">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <h2 id="resume-contexts" className="text-meta font-semibold uppercase tracking-wide text-faint">{t('What is possible now?')}</h2>
              {editableOpen.length > 0 && (
                <Button variant="ghost" size="sm" icon="tag" className="ml-auto" onClick={() => setEditingLabels(true)} data-resume-edit-labels>
                  {chips.length > 0 ? t('Edit labels') : t('Add a label')}
                </Button>
              )}
            </div>
            {chips.length > 0 ? (
              <div className="flex flex-wrap gap-1.5" data-resume-contexts>
                <button type="button" className={`rounded-chip border px-2.5 py-1 text-meta ${labelId === null ? 'border-accent bg-accent-soft text-on-accent-soft' : 'border-default text-muted hover:bg-sunken'}`}
                  aria-pressed={labelId === null} onClick={() => setLabelId(null)}>{t('All')} <span className="tabular-nums text-faint">{possible.length}</span></button>
                {chips.map(({ label, count }) => (
                  <button key={label.id} type="button"
                    className={`rounded-chip border px-2.5 py-1 text-meta ${labelId === label.id ? 'border-accent bg-accent-soft text-on-accent-soft' : 'border-default text-muted hover:bg-sunken'}`}
                    aria-pressed={labelId === label.id} onClick={() => setLabelId(label.id)}>
                    {contextName(label)} <span className="tabular-nums text-faint">{count}</span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-meta text-muted" data-resume-no-labels>
                {openTasks.length > 0 ? t('No other open task has a label yet.') : t('Add a task above, then give it a label.')}
              </p>
            )}
            {shown.length === 0 ? (
              <p className="mt-4 text-meta text-muted" data-resume-no-task>
                {labelId ? t('No other open task carries this label.') : t('No other open task now.')}
              </p>
            ) : (
              <ul className="mt-3" data-resume-tasks>
                {shown.map((task) => (
                  <TaskRow key={task.id} task={task} project={task.project_id ? data.projectMap.get(task.project_id) : undefined}
                    labels={resolveLabels(task.labels, data.labelMap)} showProject selected={false} timeColumn={timeColumn}
                    readOnly={!canEdit(task)}
                    onToggle={() => act(completeWithUndo(task.id, !task.completed_at))}
                    onOpen={() => navigate({ view: 'task', id: task.id })} />
                ))}
              </ul>
            )}
            {openTasks.length > 0 && editableOpen.length === 0 && (
              <p className="mt-2 text-meta text-muted">{t('Labels on tasks in read-only projects are changed where the task lives.')}</p>
            )}
            <p className="mt-3 text-hint text-faint">{t('Contexts are the labels already on your open tasks.')}</p>
          </section>
        </div>
      )}
      {creating && <NamePrompt title={t('New dossier')} label={t('Name')} confirm={t('Create')} onSubmit={create} onCancel={() => setCreating(false)} />}
      {editingLabels && editableOpen.length > 0 && <ContextLabelsDialog tasks={editableOpen} projects={data.projectMap} onClose={() => setEditingLabels(false)} />}
    </PageBody>
  )
}

function DossiersList({ dossiers, tasks, featured }: { dossiers: readonly Dossier[]; tasks: readonly Task[]; featured: string | null }) {
  // The featured dossier already has its card above; the list holds the others.
  const others = dossiers.filter((dossier) => dossier.id !== featured)
  if (others.length === 0) return null
  return (
    <section className="mt-6" aria-labelledby="resume-dossier-list">
      <h2 id="resume-dossier-list" className="mb-1 text-meta font-semibold uppercase tracking-wide text-faint">{t('Your other dossiers')}</h2>
      <ul className="divide-y divide-soft rounded-control border border-default bg-surface" data-resume-dossiers>
        {others.map((dossier) => {
          const state = dossierState(dossier, tasks)
          const next = state.waiting ? dossierText(dossier.waiting_for) : state.complete ? t('Thread complete') : state.next ? dossierText(state.next.title) : t('No task yet')
          return (
            <li key={dossier.id} className="flex min-w-0 items-center gap-1 pr-2">
              <button type="button" onClick={() => navigate({ view: 'dossier', id: dossier.id })}
                className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2.5 text-left hover:bg-sunken focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-focus"
                data-dossier-row={dossier.id}>
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sunken text-muted"><Icon name={state.waiting ? 'hourglass' : 'compass'} size="xs" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-body font-medium text-strong">{dossierText(dossier.title) || t('Untitled dossier')}</span>
                  <span className="block truncate text-meta text-muted">{next || t('No task yet')}</span>
                </span>
                <span className="shrink-0 text-meta text-muted">{dossierStatusText(dossier, tasks)}</span>
                <Icon name="chevron-right" size="xs" className="shrink-0 text-faint" />
              </button>
              <DossierFocusButton dossier={dossier} />
            </li>
          )
        })}
      </ul>
    </section>
  )
}
