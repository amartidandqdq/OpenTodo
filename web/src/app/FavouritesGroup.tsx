// The Favourites group (sidebar-favourites D4, app-shell "Favourites group"): the
// user's pinned projects, labels and saved filters, mixed, in the user's order, each
// with the mark of its own group, no count (the sidebar counts Inbox and Today only,
// OpenSpec change today-home) and the same menu. It has no chevron
// and no actions; Alt+↑ / Alt+↓ on a row moves it among the favourites.
import { type KeyboardEvent, useEffect, useMemo, useRef } from 'react'
import { moveFavourite, type Favourite } from '../lib/favourites'
import { projectPath } from '../lib/projects'
import type { Project } from '../lib/types'
import { isDashboard, type ViewSummary } from '../lib/views'
import { t } from '../lib/i18n'
import { hueFor, Icon, ReadAs, SidebarGroup, SidebarItem } from '../ui'
import { act } from './actionError'
import { taskDrop } from './taskDrop'
import { useMembershipMap } from '../lib/localData'
import { canEditTasks, roleOf } from '../lib/sharing'
import { LabelMenu } from './LabelsView'
import { ProjectRowMenu } from './ProjectRowMenu'
import { navigate, type Route } from './router'
import { ProjectMark } from './Sidebar'
import { ViewMenu, viewIcon } from './ViewsView'

const keyOf = (f: Pick<Favourite, 'kind' | 'id'>) => `${f.kind}:${f.id}`

export function FavouritesGroup({ favourites, route, collapsed, projects, viewCounts }: {
  favourites: Favourite[]
  route: Route
  /** The icon rail. */
  collapsed: boolean
  /** Every live project, for a sub-project's path in its tooltip. */
  projects: readonly Project[]
  viewCounts: Map<string, ViewSummary>
}) {
  const memberships = useMembershipMap()
  const byId = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects])
  const pathOf = (p: Project) => projectPath(p, byId)
  // A moved row is re-rendered in its new place: keep the keyboard focus on it.
  const refocus = useRef<string | null>(null)
  useEffect(() => {
    const key = refocus.current
    if (!key) return
    refocus.current = null
    document.querySelector<HTMLElement>(`[data-favourite="${CSS.escape(key)}"]`)?.focus()
  }, [favourites])
  const onKey = (e: KeyboardEvent<HTMLButtonElement>, f: Favourite) => {
    if (!e.altKey || e.ctrlKey || e.metaKey || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return
    e.preventDefault()
    e.stopPropagation()
    refocus.current = keyOf(f)
    act(moveFavourite(f.kind, f.id, e.key === 'ArrowUp' ? -1 : 1))
  }
  const isActive = (f: Favourite) => (route.view === f.kind && 'id' in route && route.id === f.id)

  return (
    <SidebarGroup title={t('Favourites')} collapsed={collapsed} testId="sidebar-favourites">
      {favourites.map((f) => {
        const common = {
          'data-favourite': keyOf(f), active: isActive(f), collapsed, onKeyDown: (e: KeyboardEvent<HTMLButtonElement>) => onKey(e, f),
          onClick: () => navigate({ view: f.kind, id: f.id } as Route),
        }
        let item
        let menu
        if (f.kind === 'project') {
          item = <SidebarItem {...common} label={f.item.name} title={pathOf(f.item)} leading={<ProjectMark project={f.item} />} />
          menu = <ProjectRowMenu project={f.item} within="favourites" className="hover-reveal" />
        } else if (f.kind === 'label') {
          item = <SidebarItem {...common} label={f.item.name}
            leading={<span data-hue={hueFor(f.item.color)} className="inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-hue-solid" />} />
          menu = <LabelMenu label={f.item} within="favourites" className="hover-reveal" />
        } else {
          const c = viewCounts.get(f.id)
          const list = !isDashboard(f.item)
          item = <SidebarItem {...common} label={f.item.name}
            leading={<span style={{ color: f.item.color }}><Icon name={viewIcon(f.item)} /></span>}
            badge={list && c && !c.ok ? <span className="text-meta text-danger"><ReadAs label={c.error}>!</ReadAs></span> : undefined} />
          menu = <ViewMenu view={f.item} within="favourites" className="hover-reveal" />
        }
        return (
          <div key={keyOf(f)} className="group flex items-center rounded-control data-drop-active:ring-2 data-drop-active:ring-accent" data-favourite-row={keyOf(f)}
            data-task-drop={f.kind === 'project' ? (canEditTasks(roleOf(f.id, memberships)) ? taskDrop.project(f.id) : undefined) : f.kind === 'label' ? taskDrop.label(f.id) : undefined}>
            {item}
            {!collapsed && menu}
          </div>
        )
      })}
    </SidebarGroup>
  )
}
