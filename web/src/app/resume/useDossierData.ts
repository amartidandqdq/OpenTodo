// The rows every dossier screen reads (OpenSpec change resume-dossiers): one
// place for the live tasks, dossiers, projects, labels and the cached roles, so
// the attach picker and the step rows agree on what is editable.
import { useCallback, useMemo } from 'react'
import { canEditTask } from '../../lib/sharing'
import { useAllLabels, useDossiersLoaded, useMembershipMap, useProjects, useProjectsLoaded, useReviewRow } from '../../lib/localData'
import { useLiveTasks } from '../../lib/liveTasks'
import type { Task } from '../../lib/types'
import { useToday } from '../useViews'

export function useDossierData() {
  const tasks = useLiveTasks()
  const dossiers = useDossiersLoaded()
  const projects = useProjects()
  const projectsLoaded = useProjectsLoaded()
  const labels = useAllLabels()
  const review = useReviewRow()
  const memberships = useMembershipMap()
  const today = useToday()
  const projectMap = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects])
  const labelMap = useMemo(() => new Map(labels.map((l) => [l.id, l])), [labels])
  const canEdit = useCallback((task: Pick<Task, 'project_id'>) => canEditTask(task, memberships), [memberships])
  return {
    tasks: tasks ?? [],
    dossiers: dossiers ?? [],
    projects,
    labels,
    review,
    memberships,
    today,
    projectMap,
    labelMap,
    canEdit,
    // Wait for the list names too: an early card would show "List removed" for
    // every project while its own snapshot is still reading.
    loaded: tasks !== undefined && dossiers !== undefined && projectsLoaded !== undefined,
  }
}
