// The card after a quick add (fork change `assistant-classify-card`): "File 'Call the garage tomorrow' in Car?" with the list
// the assistant proposes, a picker for another list, "File it" and "Later". Nothing moves before a choice; filing is the usual
// move with its Undo toast, and "Later" leaves the task in the Inbox as it was typed.
import { useRef, useState } from 'react'
import { hideClassifyOffer, useClassifyOffer } from '../lib/classifyAfterAdd'
import { useProjects } from '../lib/localData'
import { t } from '../lib/i18n'
import { Icon, Tooltip, ToastRegion, useToastClearance } from '../ui'
import { useResetOnChange } from '../lib/useResetOnChange'
import { ProjectPickerField } from './ProjectPickerField'
import { moveWithUndo } from './undoable'

export function ClassifyCard() {
  const offer = useClassifyOffer()
  const projects = useProjects()
  const [chosen, setChosen] = useState<string | null>(null)
  useResetOnChange([offer?.key], () => setChosen(null))
  const region = useRef<HTMLDivElement>(null)
  const side = useToastClearance(region, !!offer)
  if (!offer) return null
  const target = chosen ?? offer.projectId
  const name = projects.find((p) => p.id === target)?.name ?? t('the list')
  const file = async () => {
    hideClassifyOffer(offer.key)
    await moveWithUndo(offer.taskId, target, name)
  }
  return (
    <ToastRegion label={t('Suggested list')} side={side} regionRef={region}>
      <div key={offer.key} data-classify-card
        className="ui-toast pointer-events-auto flex flex-col gap-2 rounded-control border border-default bg-surface px-3 py-3 text-body shadow-2"
        onKeyDown={(e) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); hideClassifyOffer(offer.key) } }}>
        <div className="flex items-start gap-2">
          <p role="status" className="min-w-0 flex-1">{t('File “{title}” in a list?', { title: offer.title })}</p>
          <Tooltip label={t('Later')} shortcut="Esc">
            <button type="button" className="ui-btn ui-btn--ghost ui-btn--sm -mr-1 px-1 py-1 text-muted" aria-label={t('Later')} data-classify-later-icon
              onClick={() => hideClassifyOffer(offer.key)}><Icon name="x" size="sm" /></button>
          </Tooltip>
        </div>
        <ProjectPickerField label={t('List')} projects={projects} value={target} onChange={setChosen} rankContext="capture.project" inbox={false} noneLabel={t('None')} />
        <div className="flex justify-end gap-2">
          <button type="button" className="ui-btn ui-btn--ghost ui-btn--sm" data-classify-later onClick={() => hideClassifyOffer(offer.key)}>{t('Later')}</button>
          <button type="button" className="ui-btn ui-btn--primary ui-btn--sm" data-classify-file onClick={() => void file()}>{t('File it')}</button>
        </div>
      </div>
    </ToastRegion>
  )
}
