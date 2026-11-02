// The sun's write (fork change `my-day-sun`): one place for the toast the row action,
// the Actions menu and the task's header menu all show after `toggleFocus`. A fourth
// task is not refused any more (fork change `my-day-replace`): the caller opens
// FocusReplace, and `replaceTodayFocus` swaps one of the three for it in one undoable batch.
import { t } from '../lib/i18n'
import { applyBatch } from '../lib/undo'
import { FOCUS_MAX, focusTasks, REVIEW_ID, toggleFocus } from '../lib/review'
import type { Review, Task } from '../lib/types'
import { ACTION_TOAST_MS, showBulkToast } from './bulk/toastStore'

/** Toggles the task in today's focus; 'full' means the caller should offer a replacement (no write made). */
export async function toggleTodayFocus(review: Review | null | undefined, today: string, tasks: readonly Task[], task: Task): Promise<'added' | 'removed' | 'full'> {
  const outcome = await toggleFocus(review, today, tasks, task.id)
  if (outcome !== 'full') {
    const label = outcome === 'added' ? t('{title} is in today’s focus.', { title: task.title }) : t('{title} left today’s focus.', { title: task.title })
    showBulkToast(label, null, { ttl: ACTION_TOAST_MS })
  }
  return outcome
}

/**
 * Puts `task` in today's focus in place of `outgoingId`: one review write holding the new
 * selection, so the swap is one batch and one Undo. The cap stays FOCUS_MAX.
 */
export async function replaceTodayFocus(review: Review | null | undefined, today: string, tasks: readonly Task[], outgoingId: string, task: Task): Promise<void> {
  const kept = focusTasks(review, today, tasks).map((x) => x.id).filter((id) => id !== outgoingId)
  if (kept.length >= FOCUS_MAX) return
  const outgoing = tasks.find((x) => x.id === outgoingId)?.title ?? ''
  const next = [...kept, task.id].join(',')
  const entry = await applyBatch([{ entity: 'review', entityId: REVIEW_ID, patch: { focus_date: today, focus: next } }], { source: 'action' })
  showBulkToast(t('{title} is in today’s focus. {outgoing} left.', { title: task.title, outgoing }), entry?.id ?? null, { ttl: ACTION_TOAST_MS })
}
