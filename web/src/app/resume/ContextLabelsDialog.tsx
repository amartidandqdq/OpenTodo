// Reachable label editing from Pick up the thread (OpenSpec change resume-dossiers):
// the context chips are only the labels already on open tasks, so a device with no
// context label yet gets the ordinary label picker instead of a dead end. No label
// is invented and no new entity is introduced.
import { useState } from 'react'
import { t } from '../../lib/i18n'
import type { Project, Task } from '../../lib/types'
import { Combobox, Dialog, Field } from '../../ui'
import { LabelPicker } from '../LabelPicker'
import { dossierText } from './DossierCard'

export function ContextLabelsDialog({ tasks, projects, onClose }: {
  tasks: readonly Task[]
  projects: ReadonlyMap<string, Project>
  onClose: () => void
}) {
  const [taskId, setTaskId] = useState<string | null>(tasks[0]?.id ?? null)
  return (
    <Dialog title={t('Labels on a task')} label={t('Labels on a task')} onClose={onClose}>
      <div className="space-y-3">
        <p className="text-meta text-muted">{t('The context chips on this page are the labels already on your open tasks. Changing a label here changes only that task.')}</p>
        <Field label={t('Task')}>
          <Combobox<Task> label={t('Task')} placeholder={t('Find an open task…')} emptyText={t('No open task matches.')}
            source={tasks} getKey={(task) => task.id} getLabel={(task) => dossierText(task.title) || t('Untitled')}
            getSecondary={(task) => task.project_id ? dossierText(projects.get(task.project_id)?.name) || t('List removed') : t('Inbox')}
            selected={taskId ? [taskId] : []} rankContext="dossier.labels" onPick={(task) => setTaskId(task.id)} />
        </Field>
        {taskId
          ? <div data-context-labels-picker>
              <p className="mb-1 text-body font-medium text-default">{t('Labels')}</p>
              <LabelPicker taskId={taskId} onClose={onClose} />
              <p className="mt-2 text-hint text-faint">{t('Enter toggles or creates · Esc closes')}</p>
            </div>
          : <p className="text-meta text-muted">{t('Add a task above, then give it a label.')}</p>}
      </div>
    </Dialog>
  )
}
