// Close the day from Today (OpenSpec change close-day): a small dialog over My day's
// unfinished tasks. Each gets one choice (Tomorrow, Another day, Not now); Done writes
// them as one undoable batch through lib/closeToday.ts and the dialog turns into the
// calm "See you tomorrow" with tomorrow's preview. No new route, no stored field.
import { useMemo, useState, type ReactNode } from 'react'
import { formatTime } from '../lib/dates'
import { t } from '../lib/i18n'
import { useLiveProjects } from '../lib/liveData'
import { useLiveTasks } from '../lib/liveTasks'
import { useMembershipMap, useReviewRow } from '../lib/localData'
import { closeToday, movedDate, NOT_NOW, tomorrowOf, tomorrowPreview } from '../lib/closeToday'
import { focusTasks, type CarryDecision, type CarryTask } from '../lib/review'
import { canEditTasks, roleOf } from '../lib/sharing'
import type { Project, Task } from '../lib/types'
import { Button, Dialog } from '../ui'
import { act } from './actionError'
import { DateField } from './datetime/DateField'
import { useToday } from './useViews'

type Choice = 'tomorrow' | 'another' | 'later'
const CHOICES: readonly Choice[] = ['tomorrow', 'another', 'later']
const CHOICE_LABEL: Record<Choice, () => string> = { tomorrow: () => t('Tomorrow'), another: () => t('Another day'), later: () => t('Not now') }
const TOMORROW_DECISION: CarryDecision = { kind: 'tomorrow' }

/** Tomorrow's line: the things due on it, then the first timed appointment or "nothing planned". */
export function TomorrowLine({ tasks, projects, tomorrow, moves }: { tasks: readonly Task[]; projects: readonly Pick<Project, 'id' | 'archived'>[]; tomorrow: string; moves?: ReadonlyMap<string, string> }) {
  const p = tomorrowPreview({ tasks, projects, tomorrow, moves })
  const parts: ReactNode[] = [p.things > 0 ? t('Tomorrow: {n, plural, one {# thing} other {# things}}', { n: p.things }) : t('Tomorrow: nothing planned')]
  if (p.things > 0) parts.push(p.next ? t('next appointment {time} {title}', { time: formatTime(p.next.time), title: p.next.title }) : t('nothing planned'))
  return (
    <p className="text-meta text-muted" data-tomorrow-line>
      {parts.map((part, i) => (
        <span key={i}>{i > 0 && <span aria-hidden="true" className="mx-1.5 text-faint">·</span>}{part}</span>
      ))}
    </p>
  )
}

export function CloseTodayDialog({ onClose }: { onClose: () => void }) {
  const tasks = useLiveTasks()
  const projects = useLiveProjects()
  const review = useReviewRow()
  const memberships = useMembershipMap()
  const today = useToday()
  const tomorrow = tomorrowOf(today)
  const [decisions, setDecisions] = useState<Map<string, CarryDecision>>(() => new Map())
  const [picking, setPicking] = useState<CarryTask | null>(null)
  // Set once Done has written the batch: the dialog then shows the confirmation.
  const [closed, setClosed] = useState(false)
  const rows = useMemo<CarryTask[]>(() => (tasks ? focusTasks(review, today, tasks).map((task) => ({ task, editable: canEditTasks(roleOf(task.project_id, memberships)) })) : []), [tasks, review, today, memberships])
  const moves = useMemo(() => {
    const out = new Map<string, string>()
    for (const [id, d] of decisions) {
      const date = movedDate(d, tomorrow)
      if (date) out.set(id, date)
    }
    return out
  }, [decisions, tomorrow])
  const complete = rows.every((x) => decisions.has(x.task.id))

  const decide = (x: CarryTask, d: CarryDecision) => setDecisions((prev) => new Map(prev).set(x.task.id, d))
  const choose = (x: CarryTask, c: Choice) => {
    if (c === 'another') setPicking(x)
    else decide(x, c === 'tomorrow' ? TOMORROW_DECISION : NOT_NOW)
  }
  const finish = async () => {
    await closeToday({ decisions, rows, review, today })
    setClosed(true)
  }

  if (closed) {
    return (
      <Dialog title={t('See you tomorrow')} onClose={onClose} size="sm">
        <div className="space-y-4" data-close-today-done>
          {tasks && <TomorrowLine tasks={tasks} projects={projects} tomorrow={tomorrow} />}
          <div className="flex justify-end">
            <Button size="sm" onClick={onClose} data-close-today-finish>{t('Close')}</Button>
          </div>
        </div>
      </Dialog>
    )
  }

  return (
    <Dialog title={t('Close the day')} onClose={onClose} size="md">
      <div className="space-y-4" data-close-today>
        {rows.length === 0 ? (
          <p className="text-body text-muted" data-close-today-empty>{t('Nothing from My day is still open.')}</p>
        ) : (
          <>
            <p className="text-body text-muted">{t('{n, plural, one {# task from My day is still open.} other {# tasks from My day are still open.}} Choose what happens to each.', { n: rows.length })}</p>
            <ul className="divide-y divide-default" data-close-today-rows>
              {rows.map((x) => {
                const current = decisions.get(x.task.id)
                const selected: Choice | null = !current ? null : current.kind === 'tomorrow' ? 'tomorrow' : current.kind === 'day' ? 'another' : current.kind === 'keep' ? 'later' : null
                return (
                  <li key={x.task.id} className="flex flex-wrap items-center justify-between gap-2 py-2" data-close-today-row={x.task.id}>
                    <span className="user-text min-w-0 flex-1 truncate text-body text-default">{x.task.title}</span>
                    <span className="flex flex-wrap gap-1" role="group" aria-label={t('Choice for {title}', { title: x.task.title })}>
                      {CHOICES.filter((c) => x.editable || c === 'later').map((c) => (
                        <Button key={c} size="sm" variant={selected === c ? 'primary' : 'secondary'} aria-pressed={selected === c}
                          onClick={() => choose(x, c)} data-close-choice={c}>
                          {CHOICE_LABEL[c]()}
                        </Button>
                      ))}
                    </span>
                  </li>
                )
              })}
            </ul>
          </>
        )}
        {tasks && <TomorrowLine tasks={tasks} projects={projects} tomorrow={tomorrow} moves={moves} />}
        <p className="text-meta text-faint">{t('Not now takes the task out of My day and keeps its due date.')}</p>
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="secondary" onClick={onClose}>{t('Cancel')}</Button>
          <Button size="sm" variant="primary" disabled={!complete} onClick={() => act(finish())} data-close-today-done-button>{t('Done')}</Button>
        </div>
      </div>
      {picking && (
        <Dialog title={t('Pick a day for {title}', { title: picking.task.title })} onClose={() => setPicking(null)} size="sm">
          <DateField label={t('Date')} autoFocus value={null} onChange={(iso) => { const x = picking; setPicking(null); if (iso) decide(x, { kind: 'day', date: iso }) }} />
        </Dialog>
      )}
    </Dialog>
  )
}
