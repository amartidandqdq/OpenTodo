// The list's view bar (approved mockup A, openspec original-mockup-a): below the
// bordered capture sit the project's To do / Completed tabs with their counts, then the
// density control and the existing view controls (the duration filter, the columns
// layout). Nothing here writes task data; the tabs are the list's own local view state
// (they reset on a project change), driven through the list model.
import { readAppearance, setAppearance } from '../../lib/appearance'
import { DURATION_FILTERS, type DurationFilter } from '../../lib/filters'
import { t } from '../../lib/i18n'
import { useUserPrefsRow } from '../../lib/localData'
import { saveListColumns } from '../../lib/sections'
import { Button, Icon, Menu, MenuItem, MenuSeparator } from '../../ui'
import type { ListModel } from './useListModel'
import { act } from '../actionError'

/** The mockup's density control (change mockup-viewbar): one click, the same synced preference as Settings. */
export function DensityToggle() {
  const prefs = useUserPrefsRow()
  const compact = readAppearance(prefs).density === 'compact'
  return (
    <Button variant="ghost" size="sm" icon="rows-3" aria-pressed={compact} data-density-toggle className="mockup-density"
      onClick={() => act(setAppearance('density', compact ? 'comfortable' : 'compact'))}>
      {compact ? t('Compact') : t('Comfortable')}
    </Button>
  )
}

/** The active duration filter as one chip with its clear control. */
function DurationChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-accent bg-accent-soft py-0.5 pl-2.5 pr-1 text-meta font-medium text-on-accent-soft" data-duration-active>
      {label}
      <button type="button" className="touch-target flex h-5 w-5 items-center justify-center rounded-full hover:bg-accent/10" aria-label={t('Clear filter')} onClick={onClear} data-clear-duration>
        <Icon name="x" size="xs" />
      </button>
    </span>
  )
}

/**
 * The duration filter (time-blocking "Duration filter"): its menu in the view bar,
 * and one chip with a clear control while a filter is on.
 */
function DurationFilterControl({ active, onChange }: { active: DurationFilter | null; onChange: (kind: DurationFilter | null) => void }) {
  const current = DURATION_FILTERS.find((f) => f.kind === active)
  return (
    <span className="flex items-center gap-1" data-duration-filter>
      {current && <DurationChip label={current.label} onClear={() => onChange(null)} />}
      <Menu kind="menu" label={t('Filter')} title={t('Filter by duration')} trigger={<Icon name="filter" />} triggerClassName={`ui-btn ui-btn--ghost ui-btn--sm touch-target px-2 py-1 ${active ? 'text-accent' : ''}`} width="sm:w-56">
        {DURATION_FILTERS.map((f) => (
          <MenuItem key={f.kind} label={f.label} description={f.title} checked={active === f.kind} onSelect={() => onChange(active === f.kind ? null : f.kind)} />
        ))}
        {active && <MenuSeparator />}
        {active && <MenuItem label={t('Clear filter')} icon="x" onSelect={() => onChange(null)} />}
      </Menu>
    </span>
  )
}

export interface MockupViewBarProps {
  /** The project's To do / Completed tabs: counts and the active choice (mockup A). */
  tabs?: { done: boolean; onDone: (done: boolean) => void; open: number; completed: number }
  /** The duration filter, offered where the view has its own setting (its stored key). */
  filterKey: string | null
  duration: DurationFilter | null
  onDuration: (kind: DurationFilter | null) => void
  /** The list's columns layout (custom-fields): undefined unless the project defines fields on a list. */
  columns?: { on: boolean; onToggle: () => void }
}

/** The view bar of a task list (mockup A): under the capture, before the first row. */
export function MockupViewBar({ tabs, filterKey, duration, onDuration, columns }: MockupViewBarProps) {
  return (
    <div className="mockup-viewbar" data-mockup-viewbar>
      {tabs ? (
        <div className="mockup-tabs" data-mockup-tabs>
          <button type="button" className={`mockup-tab${tabs.done ? '' : ' mockup-tab--active'}`} aria-current={tabs.done ? undefined : 'true'} data-mockup-tab="todo" onClick={() => tabs.onDone(false)}>
            {t('To do')}
            <span className="mockup-count tabular-nums">{tabs.open}</span>
          </button>
          <button type="button" className={`mockup-tab${tabs.done ? ' mockup-tab--active' : ''}`} aria-current={tabs.done ? 'true' : undefined} data-mockup-tab="completed" onClick={() => tabs.onDone(true)}>
            {t('Completed')}
            <span className="mockup-count tabular-nums">{tabs.completed}</span>
          </button>
        </div>
      ) : null}
      <DensityToggle />
      {filterKey ? <DurationFilterControl active={duration} onChange={onDuration} /> : null}
      {columns ? (
        <Button variant="ghost" size="sm" icon="list" aria-pressed={columns.on} data-columns-toggle
          className={`${columns.on ? 'bg-sunken text-default dark:bg-raised' : ''} mockup-density`}
          onClick={columns.onToggle}>
          {t('Columns')}
        </Button>
      ) : null}
    </div>
  )
}

/**
 * The view bar wired to the list model (mockup A): tabs only for a project in List
 * layout, the columns layout where the project defines fields, its duration filter
 * where the view has one.
 */
export function ListViewBar({ model: m }: { model: ListModel }) {
  return (
    <MockupViewBar
      tabs={m.projectId && !m.board && !m.timeline ? { done: m.doneTab, onDone: m.setDoneTab, open: m.openCount, completed: m.doneCount } : undefined}
      filterKey={m.filterKey}
      duration={m.duration}
      onDuration={m.chooseDuration}
      columns={m.offerColumns ? { on: !!m.columnsPref, onToggle: () => m.projectId && saveListColumns(m.projectId, !m.columnsPref) } : undefined}
    />
  )
}
