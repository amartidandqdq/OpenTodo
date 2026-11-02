// The desktop application bar (OpenSpec change original-mockup-a, spec
// "Original mockup shell"): the instance brand, the workspace context, search,
// the Assistant while it is available and the account access sit in one 70 px
// bar above the sidebar and the content. The phone keeps the page bar, so the
// desktop bar never duplicates it; its side of every control stays one place —
// the sidebar never repeats the brand or the search below it (WorkspaceControl
// turns compact). Types come from the tokens; the composition is
// .mockup-topbar-* in src/app/mockupShell.css.
import { useState } from 'react'
import { DESKTOP_HEADER_QUERY, Icon, IconButton, Menu, initials, useMediaQuery, useSidebarToggle } from '../ui'
import { keysOf } from '../lib/shortcuts'
import { t } from '../lib/i18n'
import type { User } from '../lib/types'
import { useWorkspaceState } from '../lib/localData'
import { SignOutDialog } from './AccountSettings'
import { InstanceMark, InstanceWordmark } from './InstanceBrand'
import { PersonAvatar } from './PersonAvatar'
import { AccountMenuItems } from './SidebarFooter'
import { workspaceLabel } from './workspaceNav'

export function MockupTopBar({ user, onSearch, onAssistant, onShortcuts, onSignOut }: {
  user: User
  /** Opens the search and command palette (Control+K). */
  onSearch?: () => void
  /** Opens the assistant; absent while the assistant is not available. */
  onAssistant?: () => void
  /** Opens the keyboard cheat sheet (`?`). */
  onShortcuts?: () => void
  /** Signs out of this device, after the account menu's confirmation. */
  onSignOut?: () => void
}) {
  const desktop = useMediaQuery(DESKTOP_HEADER_QUERY)
  const sidebar = useSidebarToggle()
  const [signingOut, setSigningOut] = useState(false)
  const state = useWorkspaceState()
  const current = state.list.find((w) => w.id === state.current)
  const name = user.name || user.email
  if (!desktop) return null
  return (
    <header className="mockup-topbar" data-mockup-topbar>
      <div className="mockup-brand" data-mockup-brand>
        <InstanceMark size={24} />
        <InstanceWordmark />
      </div>
      <span aria-hidden="true" className="mockup-topbar-divider" data-mockup-divider />
      {/* The workspace context, read-only: switching stays with the sidebar's
          workspace control, so the app bar never names a second control. */}
      <span className="mockup-workspace" data-mockup-workspace>
        <span className="truncate">{current ? workspaceLabel(current.name, current.default) : t('Personal')}</span>
      </span>
      <span className="ml-auto min-w-2" aria-hidden="true" />
      {sidebar && <IconButton icon={sidebar.collapsed ? 'panel-left-open' : 'panel-left-close'} size="sm"
        label={sidebar.collapsed ? t('Show sidebar') : t('Hide sidebar')} onClick={sidebar.toggle}
        aria-pressed={!sidebar.collapsed} data-sidebar-toggle />}
      {/* The palette's opener marker stays with the bar's button, so tests and
          shortcuts keep one place that opens the palette (app-side source of truth). */}
      {onSearch && (
        <IconButton icon="search" label={t('Search and commands')} shortcut={keysOf('global.palette')} size="md" onClick={onSearch}
          aria-haspopup="dialog" data-mockup-search data-palette-button />
      )}
      {onAssistant && (
        <button type="button" className="mockup-assistant-trigger" onClick={onAssistant}
          aria-haspopup="dialog" aria-keyshortcuts={keysOf('global.assistant')} data-mockup-assistant>
          <Icon name="sparkles" />
          <span>{t('Assistant')}</span>
        </button>
      )}
      {/* The account access on a desktop: the same menu items as the sidebar's
          account control (sidebar-footer data and tests keep their row). */}
      {/* The name holds the initials the avatar shows: the accessible name contains the visible text (label-content-name-mismatch). */}
      <Menu kind="menu" label={`${initials(name)} ${t('Account menu for {name}', { name })}`} title={name}
        align="end" width="sm:w-64" tip={name}
        triggerProps={{ 'data-mockup-account': true }}
        triggerClassName="flex min-h-9 min-w-9 items-center justify-center rounded-control px-1 text-left hover:bg-sunken focus-visible:bg-sunken dark:hover:bg-raised"
        trigger={<PersonAvatar id={user.id} name={name} size="sm" decorative />}
      >
        <AccountMenuItems onShortcuts={onShortcuts} onSignOutRequested={onSignOut ? () => setSigningOut(true) : undefined} />
      </Menu>
      {signingOut && onSignOut && <SignOutDialog onConfirm={onSignOut} onCancel={() => setSigningOut(false)} />}
    </header>
  )
}
