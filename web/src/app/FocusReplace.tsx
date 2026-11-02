// "Replace which one?" (fork change `my-day-replace`): opened by the sun on a fourth
// task when My day already holds three. Lists the three chosen tasks; choosing one
// takes it out and puts the new task in, in one undoable batch. Escape cancels.
import type { RefObject } from 'react'
import { act } from './actionError'
import { t } from '../lib/i18n'
import { focusTasks } from '../lib/review'
import type { Review, Task } from '../lib/types'
import { MenuCloseContext, MenuItem, Popover, useRovingMenu } from '../ui'
import { replaceTodayFocus } from './todayFocusAction'

export function FocusReplace({ task, review, today, tasks, anchor, onClose }: {
  /** The task the sun was pressed on: it takes the chosen one's place. */
  task: Task
  review: Review | null | undefined
  today: string
  tasks: readonly Task[]
  anchor: RefObject<HTMLElement | null>
  onClose: () => void
}) {
  const roving = useRovingMenu()
  const chosen = focusTasks(review, today, tasks)
  return (
    <Popover open onClose={onClose} anchor={anchor} label={t('Replace which one?')} role="menu" align="end" width="sm:w-72" className="p-1">
      <MenuCloseContext.Provider value={onClose}>
        <div role="none" onKeyDown={roving} data-focus-replace>
          <div className="px-2.5 pb-1 pt-2 text-meta font-semibold text-muted">{t('Replace which one?')}</div>
          {chosen.map((c) => (
            <MenuItem key={c.id} label={c.title} icon="sun" description={t('Makes room for {title}', { title: task.title })}
              onSelect={() => act(replaceTodayFocus(review, today, tasks, c.id, task))} data-focus-replace-out={c.id} />
          ))}
        </div>
      </MenuCloseContext.Provider>
    </Popover>
  )
}
