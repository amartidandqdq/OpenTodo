// The Simple screen's one field (OpenSpec change simple-mode, "The single field",
// "AI actions"): Enter adds the line as a task, Ctrl/Cmd+Enter or Ask sends it to the
// assistant, and the AI menu runs the four skills. Intent is never guessed from the
// text (design D5). Without the assistant there is no Ask and no AI menu, and
// Ctrl/Cmd+Enter adds like Enter.
import { useState, type KeyboardEvent, type RefObject } from 'react'
import { Button, Icon, Menu, MenuItem } from '../../ui'
import { t } from '../../lib/i18n'

/** What the field can ask the assistant; absent when the assistant is not available. */
export interface FieldAssistant {
  ask: (text: string) => boolean
  /** Runs an AI action; the field's text is the material of Break this down and Turn this into tasks. */
  run: (skill: 'plan-day' | 'break-down' | 'capture' | 'tidy-up', text: string) => boolean
  /** The selected task, for Break this down. */
  selectedTitle: string | null
}

export function SimpleField({ inputRef, listName, onAdd, assistant, notice }: {
  inputRef: RefObject<HTMLInputElement | null>
  /** The list a line without a list token goes to. */
  listName: string
  onAdd: (line: string) => Promise<void>
  assistant: FieldAssistant | null
  /** Why the last request could not be sent (offline). */
  notice: string | null
}) {
  const [text, setText] = useState('')
  const line = text.trim()
  const add = () => { if (!line) return; setText(''); void onAdd(line) }
  // A request that was sent clears the field; one that could not be sent keeps the text.
  const send = (sent: boolean) => { if (sent) setText('') }
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter' || e.nativeEvent.isComposing) return
    e.preventDefault()
    if ((e.ctrlKey || e.metaKey) && assistant) { if (line) send(assistant.ask(line)) }
    else add()
  }
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1">
      <div className="flex min-h-11 min-w-0 items-center gap-1 rounded-control border border-input bg-surface ps-3 pe-1 focus-within:outline-2 focus-within:outline-focus">
        <input ref={inputRef} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={onKeyDown} data-simple-field enterKeyHint="done"
          placeholder={t('Add to {list}', { list: listName })} aria-label={assistant ? t('Add a task or ask the assistant') : t('Add a task')}
          className="min-w-0 flex-1 bg-transparent py-2 text-body text-default outline-none placeholder:text-muted" />
        {assistant && (
          <>
            <Button variant="ghost" size="sm" disabled={!line} onClick={() => send(assistant.ask(line))} data-simple-ask>{t('Ask')}</Button>
            <Menu label={t('AI actions')} align="end" kind="menu" triggerClassName="touch-target inline-flex size-9 items-center justify-center rounded-control text-muted hover:bg-hover hover:text-default"
              trigger={<Icon name="sparkles" />}>
              <MenuItem label={t('Plan my day')} onSelect={() => { assistant.run('plan-day', '') }} />
              <MenuItem label={t('Break this down')} disabled={!assistant.selectedTitle && !line} onSelect={() => { const sent = assistant.run('break-down', line); if (!assistant.selectedTitle) send(sent) }} />
              <MenuItem label={t('Turn this into tasks')} disabled={!line} onSelect={() => send(assistant.run('capture', line))} />
              <MenuItem label={t('Tidy up')} onSelect={() => { assistant.run('tidy-up', '') }} />
            </Menu>
          </>
        )}
      </div>
      {notice && <p role="status" className="px-3 text-meta text-muted" data-simple-notice>{notice}</p>}
    </div>
  )
}
