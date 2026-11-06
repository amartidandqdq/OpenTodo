// The one-line summary under the Today title (OpenSpec change `today-home`, today-summary):
// what the day holds, computed from the local rows. No AI, nothing stored, nothing written.
import { earlierIds, withoutArchived } from './dayLists'
import type { Project, Task } from './types'

export interface TodaySummary {
  /** Things chosen for today: My day's threads and tasks. */
  chosen: number
  /** The earliest timed task due today whose time has not passed, if any. */
  next: { time: string; title: string } | null
  /** Open tasks in Today's Earlier group. */
  earlier: number
}

/**
 * The summary for `today` at wall-clock `now` (HH:MM). `chosen` is My day's own list
 * (`todayFocusOf(...).all`). A zoned due time is left out of the appointment part: its
 * wall clock is the zone's, not the viewer's.
 */
export function todaySummary(o: {
  today: string
  now: string
  tasks: readonly Task[]
  projects: readonly Pick<Project, 'id' | 'archived'>[]
  chosen: readonly Task[]
}): TodaySummary {
  const open = withoutArchived(o.tasks.filter((t) => !t.deleted_at && !t.completed_at), o.projects)
  const timed = open
    .filter((t) => t.due?.date === o.today && !!t.due.time && !t.due.tz && t.due.time >= o.now)
    .sort((a, b) => (a.due!.time! < b.due!.time! ? -1 : a.due!.time! > b.due!.time! ? 1 : 0))
  const first = timed[0]
  return {
    chosen: o.chosen.length,
    next: first ? { time: first.due!.time!, title: first.title } : null,
    earlier: earlierIds(o.tasks, o.projects, o.today).length,
  }
}
