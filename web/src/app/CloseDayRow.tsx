// The footer strip at the end of Today (OpenSpec changes close-the-day D6 and close-day):
// tomorrow's line ("Tomorrow: 2 things · nothing planned") and "Close the day", which opens
// the small dialog over My day. A closed day reads "Day closed, 18:42" with "Reopen the
// day" (ux-feedback-2 D2) and "Close again". Content below the list, so Today gains no
// row of chrome above its first task.
import { useState } from 'react'
import { formatInstant } from '../lib/dates'
import { t } from '../lib/i18n'
import { useLiveProjects } from '../lib/liveData'
import { useLiveTasks } from '../lib/liveTasks'
import { useReviewRow } from '../lib/localData'
import { canReopenDay, dayClosed } from '../lib/review'
import { tomorrowOf } from '../lib/closeToday'
import { Button } from '../ui'
import { CloseTodayDialog, TomorrowLine } from './CloseTodayDialog'
import { reopenDayAction } from './reopenDay'
import { useToday } from './useViews'

export function CloseDayRow() {
  const review = useReviewRow()
  const today = useToday()
  const tasks = useLiveTasks()
  const projects = useLiveProjects()
  const [open, setOpen] = useState(false)
  const closed = dayClosed(review, today)
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-default pt-3" data-close-day={closed ? 'closed' : 'open'}>
      <div className="flex flex-wrap items-center gap-x-3">
        {closed && <p className="text-meta text-muted">{t('Day closed, {time}', { time: formatInstant(review!.closed_at, 'time') })}</p>}
        {tasks && <TomorrowLine tasks={tasks} projects={projects} tomorrow={tomorrowOf(today)} />}
      </div>
      <span className="flex flex-wrap items-center gap-1">
        {closed && canReopenDay(review, today) && (
          <Button variant="secondary" size="sm" icon="rotate-ccw" onClick={() => reopenDayAction(today)} data-reopen-day>{t('Reopen the day')}</Button>
        )}
        <Button variant="ghost" size="sm" icon="moon" onClick={() => setOpen(true)} data-close-day-open>{closed ? t('Close again') : t('Close the day')}</Button>
      </span>
      {open && <CloseTodayDialog onClose={() => setOpen(false)} />}
    </div>
  )
}
