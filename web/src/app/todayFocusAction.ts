// The sun's write (fork change `my-day-sun`): one place for the toast the row action,
// the Actions menu and the task's header menu all show after `toggleFocus`.
import { t } from '../lib/i18n'
import { FOCUS_MAX, toggleFocus } from '../lib/review'
import type { Review, Task } from '../lib/types'
import { ACTION_TOAST_MS, showBulkToast } from './bulk/toastStore'

export async function toggleTodayFocus(review: Review | null | undefined, today: string, tasks: readonly Task[], task: Task): Promise<void> {
  const outcome = await toggleFocus(review, today, tasks, task.id)
  const label = outcome === 'full'
    ? t('Today’s focus holds {n} tasks. Take one out first.', { n: FOCUS_MAX })
    : outcome === 'added' ? t('{title} is in today’s focus.', { title: task.title }) : t('{title} left today’s focus.', { title: task.title })
  showBulkToast(label, null, { ttl: ACTION_TOAST_MS })
}
