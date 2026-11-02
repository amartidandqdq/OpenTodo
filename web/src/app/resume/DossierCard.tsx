// The dossier card shared by Pick up the thread, My day and Waiting (OpenSpec
// change resume-dossiers). It shows only what the live tasks say: the next open
// step, the completed count and the thread's own hold. The sun writes the same
// synced today's focus as a task's sun.
import { useMemo, useState, type ReactNode } from 'react'
import { UNDECRYPTABLE } from '../../lib/e2ee'
import { dossierState, DOSSIER_FOCUS_MAX, focusDossierIds } from '../../lib/dossierModel'
import { setDossierFollowUp, toggleDossierFocus } from '../../lib/dossiers'
import { t } from '../../lib/i18n'
import { useDossiersLoaded, useReviewRow } from '../../lib/localData'
import type { Dossier, Project, Task } from '../../lib/types'
import { Icon, IconButton, Tooltip } from '../../ui'
import { DateField } from '../datetime/DateField'
import { useDateTimeFormat } from '../DateTimePrefsProvider'
import { useToday } from '../useViews'
import { ACTION_TOAST_MS, showBulkToast, showUndoToast } from '../bulk/toastStore'
import { act, reportActionError } from '../actionError'

/** The server's content prefix: a row this device never decrypted is unavailable, not display text. */
const undecrypted = (value: string): boolean => value === UNDECRYPTABLE || value.startsWith('enc:v')

/** A content field the device could not decrypt: show the translated placeholder, never the envelope. */
export function dossierText(value: string | null | undefined): string {
  if (!value) return ''
  return undecrypted(value) ? t(UNDECRYPTABLE) : value
}

/** Whether a dossier content field cannot be read, so its edit control must stay closed. */
export function dossierTextLocked(value: string | null | undefined): boolean {
  return typeof value === 'string' && undecrypted(value)
}

/** Says why a control is off, on hover and focus; a disabled button cannot open a tooltip itself. */
export function ReasonTip({ reason, children }: { reason: string | undefined; children: ReactNode }) {
  if (!reason) return <>{children}</>
  return <Tooltip label={reason}><span tabIndex={0} className="inline-flex rounded-control">{children}</span></Tooltip>
}

/** The state word of a dossier, the same in the card, the list and Waiting. */
export function dossierStatusText(dossier: Dossier, tasks: readonly Task[]): string {
  const state = dossierState(dossier, tasks)
  return state.waiting ? t('On hold') : state.complete ? t('Thread complete') : state.empty ? t('To compose') : t('To advance')
}

/** The list names of a dossier's members, without duplicates and in task order. */
export function dossierLists(dossier: Dossier, tasks: readonly Task[], projects: ReadonlyMap<string, Project>): string[] {
  const { tasks: members } = dossierState(dossier, tasks)
  const names = new Set<string>()
  for (const task of members) names.add(task.project_id ? dossierText(projects.get(task.project_id)?.name) || t('List removed') : t('Inbox'))
  return [...names]
}

/** The compact progress bar of a dossier; the text says the same numbers. */
export function DossierProgress({ done, total, label }: { done: number; total: number; label?: string }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0
  const text = total > 0 ? t('{done} of {total} steps completed', { done, total }) : t('No task yet')
  return (
    <div className="my-3" data-dossier-progress>
      {total > 0 && (
        <div role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done} aria-label={label ?? text}
          className="h-1 overflow-hidden rounded-full bg-sunken">
          <span className="block h-full rounded-full bg-accent transition-[width] duration-(--duration-ui) ease-calm" style={{ width: `${pct}%` }} />
        </div>
      )}
      <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-meta text-muted">
        <span className="tabular-nums">{text}</span>
      </div>
    </div>
  )
}

/** The follow-up date in its own tone; it never marks a task late. A passed date asks to be reviewed. */
export function FollowUpText({ date, today }: { date: string | null; today: string }) {
  const dt = useDateTimeFormat()
  if (!date) return <span className="text-muted">{t('No follow-up date')}</span>
  const shown = dt.formatDate(date, 'compact')
  if (date < today) return <span className="text-warning">{t('Review since {date}', { date: shown })}</span>
  if (date === today) return <span className="text-warning">{t('Look again today')}</span>
  return <span className="text-default">{t('Look again on {date}', { date: shown })}</span>
}

/**
 * The follow-up date of a waiting dossier, editable on the card. It is the thread's own date:
 * it never writes a task's due date, and `setDossierFollowUp` refuses a date without a hold.
 */
export function DossierFollowUpEditor({ dossier }: { dossier: Dossier }) {
  const today = useToday()
  const passed = !!dossier.follow_up && dossier.follow_up < today
  const change = async (date: string | null) => {
    try {
      const entry = await setDossierFollowUp(dossier.id, date)
      if (entry) showUndoToast(entry.label ?? t('Follow-up date changed'), entry.id)
    } catch (err) {
      reportActionError(err)
    }
  }
  return (
    <div className="mt-2" data-dossier-follow-up>
      <div className="flex flex-wrap items-center gap-2">
        {passed
          ? <span className="text-meta font-medium text-warning">{t('Review since')}</span>
          : <span className="text-meta text-default">{t('Look again on')}</span>}
        <div className="min-w-0 max-w-60 flex-1">
          <DateField label={t('Follow-up date')} hideLabel value={dossier.follow_up} onChange={(date) => act(change(date))} />
        </div>
      </div>
      <p className="mt-1 text-hint text-faint">{t('Follow-up date, no due date on the task.')}</p>
    </div>
  )
}

/** The sun of a dossier, in today's focus or not. */
export function DossierFocusButton({ dossier, className = '' }: { dossier: Dossier; className?: string }) {
  const review = useReviewRow()
  const dossiers = useDossiersLoaded()
  const today = useToday()
  const [busy, setBusy] = useState(false)
  const inFocus = focusDossierIds(review, today).includes(dossier.id)
  const toggle = async () => {
    if (!dossiers) return
    setBusy(true)
    try {
      const outcome = await toggleDossierFocus(review, today, dossiers, dossier.id)
      const label = outcome === 'full'
        ? t('Today’s focus holds {n} dossiers. Take one out first.', { n: DOSSIER_FOCUS_MAX })
        : outcome === 'added' ? t('{title} is in today’s focus.', { title: dossierText(dossier.title) }) : t('{title} left today’s focus.', { title: dossierText(dossier.title) })
      showBulkToast(label, null, { ttl: ACTION_TOAST_MS })
    } finally {
      setBusy(false)
    }
  }
  return (
    <IconButton icon="sun" size="sm" label={inFocus ? t('Remove from today’s focus') : t('Add to today’s focus')}
      aria-pressed={inFocus} busy={busy} disabled={!dossiers} data-dossier-focus onClick={() => act(toggle())}
      className={`${inFocus ? 'text-accent' : 'text-muted'} ${className}`} />
  )
}

export interface DossierCardProps {
  dossier: Dossier
  tasks: readonly Task[]
  projects: ReadonlyMap<string, Project>
  /** The page the card is on: it is a little quieter inside My day. */
  compact?: boolean
  /** Today's focus sun; off on a screen that already has its own focus control. */
  focus?: boolean
  /** The primary and secondary actions under the next step. */
  actions?: ReactNode
  /** Opens the dossier page; the title is a button when set. */
  onOpen?: () => void
  /** Names of the ids the live snapshot no longer resolves, when the caller can read them. */
  unavailableNames?: readonly string[]
  /**
   * Whether the person may edit a task. A waiting dossier's follow-up date is editable only when
   * some step is editable (or the thread has no step yet); otherwise the card shows it read-only.
   */
  canEdit?: (task: Pick<Task, 'project_id'>) => boolean
}

/** One dossier as a card: next real step, progress, hold and the actions the screen offers. */
export function DossierCard({ dossier, tasks, projects, compact = false, focus = true, actions, onOpen, unavailableNames = [], canEdit }: DossierCardProps) {
  const state = useMemo(() => dossierState(dossier, tasks), [dossier, tasks])
  const followUpEditable = !canEdit || state.tasks.length === 0 || state.tasks.some((task) => canEdit(task))
  const lists = useMemo(() => dossierLists(dossier, tasks, projects), [dossier, tasks, projects])
  const today = useToday()
  // A wait is the thread's own state and outranks a finished-looking timeline:
  // resuming is what makes the next step visible again.
  const status = state.waiting ? t('On hold') : state.complete ? t('Thread complete') : state.empty ? t('To compose') : t('To advance')
  const label = state.waiting ? t('What you are waiting for') : state.complete ? t('It is done') : state.empty ? t('To start') : t('Next action')
  const title = state.waiting ? dossierText(dossier.waiting_for) || t('On hold')
    : state.complete ? t('Every step is complete')
      : state.next ? dossierText(state.next.title) || t('Untitled') : t('Add a first task')
  const description = state.waiting ? (dossier.follow_up ? null : t('Nothing to plan until the wait resolves.'))
    : state.complete ? (onOpen ? t('Open the thread to see the completed steps.') : t('The completed steps stay below.'))
      : state.next ? (lists.length === 1 ? t('In {list}', { list: lists[0] }) : t('In {n} lists', { n: lists.length }))
        : t('A dossier links existing tasks without moving them.')
  const listText = lists.length === 0 ? t('No list') : lists.length === 1 ? lists[0] : t('{n} lists', { n: lists.length })
  const locked = dossierTextLocked(dossier.title) || dossierTextLocked(dossier.note) || dossierTextLocked(dossier.waiting_for)
  return (
    <article data-dossier-card={dossier.id} data-dossier-state={state.waiting ? 'waiting' : state.complete ? 'complete' : state.empty ? 'empty' : 'active'}
      data-dossier-locked={locked || undefined}
      className={`surface-card min-w-0 ${compact ? 'p-3 sm:p-4' : 'p-4 sm:p-5'}`}>
      <div className="flex min-w-0 items-start gap-2">
        <div className="min-w-0 flex-1">
          {onOpen
            ? <button type="button" className="block max-w-full break-words text-left text-h3 font-semibold text-strong hover:underline" onClick={onOpen} data-dossier-open>{dossierText(dossier.title) || t('Untitled dossier')}</button>
            : <h2 className="break-words text-h3 font-semibold text-strong">{dossierText(dossier.title) || t('Untitled dossier')}</h2>}
          <p className="mt-0.5 text-meta text-muted">{listText}{state.total > 0 ? ` · ${t('{n, plural, one {# task in one thread} other {# tasks in one thread}}', { n: state.total })}` : ''}</p>
        </div>
        {focus && <DossierFocusButton dossier={dossier} />}
      </div>
      <DossierProgress done={state.done} total={state.total} />
      {locked && (
        <p className="mb-2 flex items-start gap-1.5 text-meta text-warning" data-dossier-encrypted>
          <Icon name="lock" size="xs" className="mt-0.5 shrink-0" />
          {t('Some words in this dossier cannot be decrypted on this device.')}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-meta text-muted">
        <span>{status}</span>
        {state.unavailable.length > 0 && (
          <span className="min-w-0 break-words text-warning" data-dossier-unavailable-count>
            {unavailableNames.length > 0
              ? t('{n, plural, one {# unavailable task} other {# unavailable tasks}}: {names}', { n: state.unavailable.length, names: unavailableNames.map(dossierText).join(', ') })
              : t('{n, plural, one {# unavailable task} other {# unavailable tasks}}', { n: state.unavailable.length })}
          </span>
        )}
      </div>
      <div className={`mt-3 rounded-control bg-accent-soft ${compact ? 'p-2.5' : 'p-3'}`} data-dossier-next>
        <p className="text-hint font-semibold uppercase tracking-wide text-on-accent-soft">{label}</p>
        <p className="mt-1 break-words text-body font-medium text-strong">{title}</p>
        {state.waiting && (followUpEditable
          ? <DossierFollowUpEditor dossier={dossier} />
          : <p className="mt-1 text-meta"><FollowUpText date={dossier.follow_up} today={today} /></p>)}
        {description && <p className="mt-1 text-meta text-muted">{description}</p>}
        {actions && <div className="mt-2.5 flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </article>
  )
}
