// The Next and Waiting views (OpenSpec change open-loops-method, design D9; spec
// method-views): derived lists of ordinary task rows with the list keys. A task
// can be in several Next groups, so a row's key is "<group>:<task>", as in a
// saved view.
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { blockedMap } from '../../lib/dependencies'
import { waitingDossiers } from '../../lib/dossierModel'
import { t } from '../../lib/i18n'
import { resolveLabels } from '../../lib/labels'
import { hasTimeColumn } from '../../lib/rowTime'
import { useAllLabels, useDossiers } from '../../lib/localData'
import { nextGroups, waitingGroups, type MethodGroup } from '../../lib/method/groups'
import { setTaskCompleted } from '../../lib/ops'
import { Dialog, EmptyState, type EmptyStateAction, PageBody, PageHeader, Skeleton, type IconName } from '../../ui'
import { act } from '../actionError'
import { useBulkList } from '../bulk/useBulkList'
import { useWithMethod } from '../help/MethodLink'
import { LabelPicker } from '../LabelPicker'
import { setPanelTaskId, usePanelTaskId } from '../panel'
import { openFromRow } from '../sidePanel'
import { keysOf } from '../../lib/shortcuts'
import { navigate } from '../router'
import { HorizonSwitch, type HorizonView } from '../HorizonSwitch'
import { TaskRow } from '../TaskRow'
import { WaitingDossiers } from '../resume/WaitingDossiers'
import { useListKeys } from '../useListKeys'
import { useMethodInput } from './useMethodInput'

interface Props {
  title: string
  icon: IconName
  move: 'do' | 'place'
  help: string
  groups: MethodGroup[] | null
  /** The empty view (task-list-presentation "Empty views"): one sentence, one action. */
  empty: EmptyStateAction & { title: string }
  /** Dossiers on hold, shown above the task groups (resume-dossiers). */
  above?: ReactNode
  /** Whether `above` has rows: then the task groups' empty state stays away. */
  hasAbove?: boolean
  /** The horizon this view is, for the switch under its title (declutter). */
  horizon: HorizonView
}

/** Next (`/next`): the next action of every project, by context. */
export function NextView() {
  const input = useMethodInput()
  const labels = useAllLabels()
  const groups = useMemo(() => (input ? nextGroups(input, labels) : null), [input, labels])
  return (
    <MethodList title={t('Next', { context: 'method' })} icon="arrow-right" move="do" help="next" groups={groups} horizon="next"
      empty={{ title: t('Add a next step to a project.'), label: t('Walk your projects'), onClick: () => navigate({ view: 'review', step: 'projects' }) }} />
  )
}

/** Waiting (`/waiting`): what is assigned to someone else, then what is blocked by another task. */
export function WaitingView() {
  const input = useMethodInput()
  const groups = useMemo(() => (input ? waitingGroups(input) : null), [input])
  // A wait is not a late task (resume-dossiers): the dossiers on hold come first,
  // and a view that holds only dossiers never says nothing is waiting on anyone.
  const dossiers = useDossiers()
  const holds = useMemo(() => waitingDossiers(dossiers).length, [dossiers])
  return (
    <MethodList title={t('Waiting', { context: 'method' })} icon="hourglass" move="place" help="waiting" groups={groups} horizon="waiting"
      above={<WaitingDossiers />} hasAbove={holds > 0}
      empty={{ title: t('Nothing is waiting on anyone.'), label: t('Open Next'), onClick: () => navigate({ view: 'next' }), shortcut: keysOf('go.next') }} />
  )
}

function MethodList({ title, icon, move, help, groups, empty, above, hasAbove = false, horizon }: Props) {
  const labels = useAllLabels()
  const input = useMethodInput()
  const labelMap = useMemo(() => new Map(labels.map((l) => [l.id, l])), [labels])
  const projectMap = useMemo(() => new Map((input?.projects ?? []).map((p) => [p.id, p])), [input])
  const blocked = useMemo(() => blockedMap(input?.tasks ?? []), [input])
  const rows = useMemo(() => (groups ?? []).flatMap((g) => g.tasks.map((task) => ({ key: `${g.key}:${task.id}`, task }))), [groups])
  // The time column (rows-v2 D2): one fact of the whole list.
  const timeColumn = useMemo(() => hasTimeColumn(rows.map((r) => r.task)), [rows])
  const [selected, setSelected] = useState<string | null>(null)
  const [pickerFor, setPickerFor] = useState<string | null>(null)
  const openId = usePanelTaskId()
  const bulk = useBulkList(useMemo(() => rows.map((r) => r.task), [rows]))
  useListKeys({ rows, selected, setSelected, openId, setOpenId: setPanelTaskId, pickerFor, setPickerFor, bulk, onIdleEscape: () => setSelected(null), sidePanel: true })
  // A completed or moved task leaves the list: keep a selection only while its row exists.
  useEffect(() => { if (selected && !rows.some((r) => r.key === selected)) setSelected(null) }, [rows, selected])
  const count = rows.length ? new Set(rows.map((r) => r.task.id)).size : undefined
  const meta = useWithMethod(move, count)
  const subtitle = useWithMethod(move)

  return (
    <PageBody width="list">
      <PageHeader title={title} icon={icon} help={help} meta={meta} subtitle={subtitle}>
        <HorizonSwitch view={horizon} />
      </PageHeader>
      {above}
      {!groups ? <Skeleton shape="row" count={4} /> : rows.length === 0 ? (
        hasAbove ? null : (
        <div data-empty-state={move === 'do' ? 'next' : 'waiting'}>
          <EmptyState title={empty.title} action={{ label: empty.label, onClick: empty.onClick, shortcut: empty.shortcut }} />
        </div>
        )
      ) : (
        <>
          {bulk.render(rows.find((r) => r.key === selected)?.task.id ?? null)}
          <div role="region" aria-label={title}>
            {groups.map((g) => (
              <section key={g.key} data-group={g.key} className="mb-4" aria-labelledby={`method-group-${g.key}`}>
                <h2 id={`method-group-${g.key}`} className="mb-1 px-2 text-meta font-semibold text-faint">{g.heading}</h2>
                <ul>
                  {g.tasks.map((task) => {
                    const key = `${g.key}:${task.id}`
                    return (
                      <TaskRow key={key} task={task} project={task.project_id ? projectMap.get(task.project_id) : undefined}
                        labels={resolveLabels(task.labels, labelMap)} showProject selected={key === selected} timeColumn={timeColumn}
                        onMore={(from) => { setSelected(key); bulk.openActions(null, from) }}
                        blockedBy={blocked.get(task.id)} breadcrumb={g.notes?.get(task.id) ?? null}
                        onToggle={() => act(setTaskCompleted(task.id, !task.completed_at))}
                        onOpen={(e) => { setSelected(key); openFromRow(task.id, e) }}
                        {...bulk.rowProps(task.id)} />
                    )
                  })}
                </ul>
              </section>
            ))}
          </div>
        </>
      )}
      {pickerFor && (
        <Dialog title={t('Labels')} label={t('Labels for task')} onClose={() => setPickerFor(null)}>
          <LabelPicker taskId={pickerFor} onClose={() => setPickerFor(null)} />
        </Dialog>
      )}
    </PageBody>
  )
}
