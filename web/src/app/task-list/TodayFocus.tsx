// "Ma journée" (fork change `my-day-sun`, resume-dossiers D5): the threads and tasks
// chosen for today with the sun, shown above Today's groups. Both selections are the
// synced today's focus, never a due date: a task can be in My day and still have none.
import { useCallback, useMemo } from 'react'
import { t } from '../../lib/i18n'
import { resolveLabels } from '../../lib/labels'
import { useAllLabels, useDossiers, useMembershipMap, useProjects, useReviewRow } from '../../lib/localData'
import { useLiveTasks } from '../../lib/liveTasks'
import { setTaskCompleted } from '../../lib/ops'
import { canEditTask } from '../../lib/sharing'
import { todayFocusOf } from '../../lib/review'
import type { Task } from '../../lib/types'
import { hasTimeColumn } from '../../lib/rowTime'
import { Button, Icon } from '../../ui'
import { act } from '../actionError'
import { setPanelTaskId } from '../panel'
import { DossierCard } from '../resume/DossierCard'
import { navigate } from '../router'
import { TaskRow } from '../TaskRow'
import { useToday } from '../useViews'

export function TodayFocus() {
  const review = useReviewRow()
  const today = useToday()
  const tasks = useLiveTasks()
  const projects = useProjects()
  const labels = useAllLabels()
  const dossiers = useDossiers()
  const memberships = useMembershipMap()
  const canEdit = useCallback((task: Pick<Task, 'project_id'>) => canEditTask(task, memberships), [memberships])
  const focus = useMemo(() => todayFocusOf(review, today, tasks ?? [], dossiers), [review, today, tasks, dossiers])
  const projectMap = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects])
  const labelMap = useMemo(() => new Map(labels.map((l) => [l.id, l])), [labels])
  // A dossier card is real only against the live tasks: wait for them rather than
  // naming every member unavailable for one render.
  if (!tasks || (focus.dossiers.length === 0 && focus.tasks.length === 0)) return null
  const timeColumn = hasTimeColumn(focus.tasks)
  const count = focus.dossiers.length + focus.tasks.length
  return (
    <section className="mb-4" aria-labelledby="today-focus" data-today-focus>
      <div className="mb-1 flex items-center gap-2 px-2">
        <Icon name="sun" size="xs" className="text-accent" />
        <h2 id="today-focus" className="text-meta font-semibold text-faint">{t('My day')}</h2>
        <span className="text-meta tabular-nums text-muted">{count}</span>
        <Button variant="ghost" size="sm" className="ml-auto" onClick={() => navigate({ view: 'review', step: 'daily' })}>{t('Choose')}</Button>
      </div>
      {focus.dossiers.length > 0 && (
        <ul className="mb-2 space-y-2" data-today-focus-dossiers>
          {focus.dossiers.map((dossier) => (
            <li key={dossier.id}>
              <DossierCard dossier={dossier} tasks={tasks} projects={projectMap} canEdit={canEdit} compact onOpen={() => navigate({ view: 'dossier', id: dossier.id })} />
            </li>
          ))}
        </ul>
      )}
      {focus.tasks.length > 0 && (
        <ul>
          {focus.tasks.map((task) => (
            <TaskRow key={task.id} task={task} project={task.project_id ? projectMap.get(task.project_id) : undefined}
              labels={resolveLabels(task.labels, labelMap)} showProject selected={false} timeColumn={timeColumn}
              onToggle={() => act(setTaskCompleted(task.id, !task.completed_at))} onOpen={() => setPanelTaskId(task.id)} />
          ))}
        </ul>
      )}
    </section>
  )
}
