// Close the day from Today (OpenSpec change close-day): each unfinished task of My day
// gets one choice, Tomorrow, Another day or Not now; Done writes them as ONE undoable
// batch and stamps the day closed. Pure planning here; the write is `closeToday`.
// Tomorrow and Another day reschedule through the carry-over planner (`planCarryOver`),
// Not now writes nothing to the task. Every choice takes the task out of My day.
import { mergeChanges, toProposed } from './bulk'
import { withoutArchived } from './dayLists'
import { db, type AssistantUndo } from './db'
import { addDaysISO } from './dates'
import type { Change } from './ops'
import { t } from './i18n'
import { applyBatch } from './undo'
import {
  carryOverOf, planCarryOver, REVIEW_ID, storedFocus,
  type CarryDecision, type CarryOverItem, type CarryOverRecord, type CarryTask,
} from './review'
import type { Project, Review, Task } from './types'

/** Not now: leaves My day and keeps the due date (the carry-over planner writes nothing for Keep). */
export const NOT_NOW: CarryDecision = { kind: 'keep' }

/** The date a choice moves a task to, or null when it keeps its date. */
export function movedDate(d: CarryDecision | undefined, tomorrow: string): string | null {
  if (!d || d.kind === 'keep' || d.kind === 'done' || d.kind === 'someday') return null
  return d.kind === 'tomorrow' ? tomorrow : d.date
}

/**
 * The changes of closing the day (pure): the due dates the choices move, the My day
 * selection without the decided tasks, and the close stamp on the `review` row.
 */
export function planCloseToday(o: { decisions: ReadonlyMap<string, CarryDecision>; rows: readonly CarryTask[]; review: Pick<Review, 'focus' | 'focus_date'> | null | undefined; today: string; now?: number }): Change[] {
  const now = o.now ?? Date.now()
  const due = planCarryOver(o.decisions, o.rows, o.today, o.rows.map((x) => x.task), now)
  const decided = new Set(o.rows.map((x) => x.task.id))
  const focus = storedFocus(o.review, o.today).filter((id) => !decided.has(id))
  const review: Change = { entity: 'review', entityId: REVIEW_ID, patch: { focus: focus.join(','), focus_date: o.today, closed_at: now, closed_day: o.today } }
  return mergeChanges([...due, review])
}

/**
 * Writes the close as one undoable batch. The carry-over record goes on the same row,
 * so "Reopen the day" can put the moved due dates back as it does for the Review step.
 */
export async function closeToday(o: { decisions: ReadonlyMap<string, CarryDecision>; rows: readonly CarryTask[]; review: Pick<Review, 'focus' | 'focus_date'> | null | undefined; today: string; now?: number }): Promise<AssistantUndo | null> {
  const changes = planCloseToday(o)
  const proposed = await toProposed(changes.filter((c) => c.entity === 'task'))
  const reviewChange = changes.find((c) => c.entity === 'review')!
  const current = await db.review.get(REVIEW_ID)
  const items: CarryOverItem[] = proposed.flatMap((c) => Object.entries(c.patch).map(([field, after]) => ({ id: c.entityId, field, before: c.base?.[field] ?? null, after: after ?? null })))
  const previous = carryOverOf(current)
  const record: CarryOverRecord = { date: o.today, items: previous?.date === o.today ? [...previous.items, ...items] : items }
  const patch = { ...reviewChange.patch, carry_over: JSON.stringify(record) }
  const base = Object.fromEntries(Object.keys(patch).map((f) => [f, (current as Record<string, unknown> | undefined)?.[f] ?? null]))
  proposed.push({ entity: 'review', entityId: REVIEW_ID, patch, base })
  return applyBatch(proposed, { source: 'bulk', label: t('Day closed') })
}

/** What tomorrow holds: the open things due on it and its first timed appointment. */
export interface TomorrowPreview {
  things: number
  next: { time: string; title: string } | null
}

/**
 * Tomorrow's preview (today-summary's patterns): the open tasks due tomorrow, after the
 * `moves` of the choices made so far (task id to the date it will have). A zoned time is
 * left out of the appointment, as the Today summary does.
 */
export function tomorrowPreview(o: { tasks: readonly Task[]; projects: readonly Pick<Project, 'id' | 'archived'>[]; tomorrow: string; moves?: ReadonlyMap<string, string> }): TomorrowPreview {
  const open = withoutArchived(o.tasks.filter((t) => !t.deleted_at && !t.completed_at), o.projects)
  const onTomorrow = open.filter((t) => (o.moves?.get(t.id) ?? t.due?.date) === o.tomorrow)
  const timed = onTomorrow
    .filter((t) => !!t.due?.time && !t.due.tz)
    .sort((a, b) => (a.due!.time! < b.due!.time! ? -1 : a.due!.time! > b.due!.time! ? 1 : 0))
  const first = timed[0]
  return { things: onTomorrow.length, next: first ? { time: first.due!.time!, title: first.title } : null }
}

/** The day after `today` (logical days, floating dates). */
export function tomorrowOf(today: string): string {
  return addDaysISO(today, 1)
}
