// The Simple screen's menu (OpenSpec change simple-mode, "Choosing the lists shown",
// "Entering and leaving Simple mode"): a checkbox per list, New list, and All
// features. Hiding a list only writes the user's `simple_hidden` preference; leaving
// only writes `simple_mode`. No task, project or section changes.
import { useState } from 'react'
import { Button, Dialog, Field, Icon, Input, Menu, MenuGroup, MenuItem, MenuSeparator } from '../../ui'
import { t } from '../../lib/i18n'
import { createProject } from '../../lib/ops'
import { simpleLists } from '../../lib/simpleBoard'
import { setListHidden, setSimpleMode } from '../../lib/simpleMode'
import type { Project } from '../../lib/types'
import { act } from '../actionError'

export function SimpleMenu({ projects, hidden, onLeave, onCreated }: {
  projects: readonly Project[]
  hidden: readonly string[]
  /** Opens the start view once the preference is off. */
  onLeave: () => void
  onCreated: (id: string) => void
}) {
  const [creating, setCreating] = useState(false)
  const lists = simpleLists(projects)
  return (
    <>
      <Menu label={t('Menu')} align="end" kind="menu" width="16rem"
        triggerClassName="touch-target inline-flex size-11 shrink-0 items-center justify-center rounded-control text-muted hover:bg-hover hover:text-default focus-visible:outline-2 focus-visible:outline-focus"
        triggerProps={{ 'data-simple-menu': true }} trigger={<Icon name="menu" />}>
        {lists.length > 0 && (
          <MenuGroup label={t('Lists')}>
            {lists.map((p) => (
              <MenuItem key={p.id} label={p.name} checked={!hidden.includes(p.id)} onSelect={() => act(setListHidden(hidden, p.id, !hidden.includes(p.id)))} />
            ))}
          </MenuGroup>
        )}
        <MenuItem icon="plus" label={t('New list')} onSelect={() => setCreating(true)} />
        <MenuSeparator />
        <MenuItem icon="list-checks" label={t('All features')} onSelect={() => act(setSimpleMode(false).then(onLeave))} />
      </Menu>
      {creating && <NewList onClose={() => setCreating(false)} onCreated={onCreated} />}
    </>
  )
}

function NewList({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const [name, setName] = useState('')
  const submit = () => {
    const clean = name.trim()
    if (!clean) return
    onClose()
    act(createProject({ name: clean }).then(onCreated))
  }
  return (
    <Dialog title={t('New list')} onClose={onClose}>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); submit() }}>
        <Field label={t('Name')}>
          <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>{t('Cancel')}</Button>
          <Button variant="primary" type="submit" disabled={!name.trim()}>{t('Create')}</Button>
        </div>
      </form>
    </Dialog>
  )
}
