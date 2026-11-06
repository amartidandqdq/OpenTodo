// The one-line summary under the Today title (OpenSpec change `today-home`): chosen
// work, the next timed task and what is earlier, from the local rows. It renders
// nothing until the tasks are read, and it re-reads the clock each minute.
import { Fragment, useEffect, useMemo, useState, type ReactNode } from 'react'
import { formatTime } from '../../lib/dates'
import { t } from '../../lib/i18n'
import { useLiveProjects } from '../../lib/liveData'
import { useDossiers, useReviewRow } from '../../lib/localData'
import { useLiveTasks } from '../../lib/liveTasks'
import { todayFocusOf } from '../../lib/review'
import { todaySummary } from '../../lib/todaySummary'
import { useToday } from '../useViews'

const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`

/** The wall-clock time, HH:MM, kept current to the minute. */
function useClock(): string {
  const [now, setNow] = useState(() => hhmm(new Date()))
  useEffect(() => {
    const id = setInterval(() => setNow(hhmm(new Date())), 60_000)
    return () => clearInterval(id)
  }, [])
  return now
}

export function TodaySummaryLine() {
  const tasks = useLiveTasks()
  const projects = useLiveProjects()
  const review = useReviewRow()
  const dossiers = useDossiers()
  const today = useToday()
  const now = useClock()
  const summary = useMemo(() => {
    if (!tasks) return null
    const chosen = todayFocusOf(review, today, tasks, dossiers).all
    return todaySummary({ today, now, tasks, projects, chosen })
  }, [tasks, projects, review, dossiers, today, now])
  if (!summary) return null
  const parts: ReactNode[] = []
  if (summary.chosen > 0) parts.push(t('{n, plural, one {# chosen for today} other {# chosen for today}}', { n: summary.chosen }))
  if (summary.next) parts.push(t('next appointment {time} {title}', { time: formatTime(summary.next.time), title: summary.next.title }))
  parts.push(summary.earlier > 0 ? t('{n, plural, one {# earlier} other {# earlier}}', { n: summary.earlier }) : t('nothing earlier'))
  return (
    <p className="mt-2 text-meta text-muted" data-today-summary>
      {parts.map((part, i) => (
        <Fragment key={i}>{i > 0 && <span aria-hidden="true" className="mx-1.5 text-faint">·</span>}{part}</Fragment>
      ))}
    </p>
  )
}
