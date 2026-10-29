// The local dossier offer after a capture (OpenSpec change resume-dossiers,
// design D6): deterministic, offline, no model. The task already exists; the
// card only offers to attach it, and the attachment is one undoable batch.
import { useMemo, useState } from 'react'
import { attachTaskToDossier, hideDossierLinkOffer, useDossierLinkOffer } from '../../lib/dossiers'
import { dossierLists, dossierText } from './DossierCard'
import { useDossierData } from './useDossierData'
import { t } from '../../lib/i18n'
import type { Dossier } from '../../lib/types'
import { Button, Combobox, Icon } from '../../ui'
import { useResetOnChange } from '../../lib/useResetOnChange'
import { showUndoToast } from '../bulk/toastStore'
import { reportActionError } from '../actionError'

export function DossierLinkCard() {
  const offer = useDossierLinkOffer()
  const data = useDossierData()
  const [chosen, setChosen] = useState<string | null>(null)
  useResetOnChange([offer?.key], () => setChosen(null))
  const live = useMemo(() => data.dossiers.filter((d) => !d.deleted_at), [data.dossiers])
  if (!offer) return null
  // Only the proposed dossiers (or another one the person picks) may be attached: if the
  // proposal was deleted elsewhere, hide the card rather than attach to a stranger.
  const selected = chosen && live.some((d) => d.id === chosen) ? chosen : offer.candidateIds.find((id) => live.some((d) => d.id === id))
  const dossier = live.find((d) => d.id === selected)
  if (!dossier) return null
  const close = () => hideDossierLinkOffer(offer.key)
  const attach = async () => {
    try {
      const entry = await attachTaskToDossier(dossier.id, offer.taskId)
      hideDossierLinkOffer(offer.key)
      if (entry) showUndoToast(t('{task} added to {dossier}', { task: offer.title, dossier: dossierText(dossier.title) }), entry.id)
    } catch (error) {
      // The task or the dossier left while the card was open: close it, write nothing.
      hideDossierLinkOffer(offer.key)
      reportActionError(error)
    }
  }
  return (
    <div data-dossier-link-card className="mb-5 rounded-control border border-default bg-surface p-3 text-body shadow-1"
      onKeyDown={(e) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close() } }}>
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-strong">{t('Link “{title}” to a dossier?', { title: offer.title })}</p>
          <p className="mt-1 text-meta text-muted">{t('The task is already in your list. Nothing changes before you confirm.')}</p>
          <p className="mt-1 text-meta text-muted" data-dossier-link-target>{t('Dossier: {name}', { name: dossierText(dossier.title) || t('Untitled dossier') })}</p>
          <p className="mt-1 flex items-center gap-1 text-hint text-faint" data-dossier-link-source><Icon name="compass" size="xs" />{t('Local suggestion, no model.')}</p>
        </div>
        <button type="button" className="ui-btn ui-btn--ghost ui-btn--sm -mr-1 px-1 py-1 text-muted" aria-label={t('Later')} onClick={close}><Icon name="x" size="sm" /></button>
      </div>
      <div className="mt-2">
        <Combobox<Dossier>
          label={t('Dossier')}
          placeholder={t('Find a dossier…')}
          source={live}
          getKey={(d) => d.id}
          getLabel={(d) => dossierText(d.title) || t('Untitled dossier')}
          getSecondary={(d) => {
            const lists = dossierLists(d, data.tasks, data.projectMap)
            return lists.length ? lists.join(' · ') : t('No task yet')
          }}
          selected={[dossier.id]}
          rankContext="dossier"
          onPick={(d) => setChosen(d.id)}
        />
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={close} data-dossier-link-keep>{t('Keep as a separate task')}</Button>
        <Button size="sm" variant="primary" onClick={() => void attach()} data-dossier-link-confirm>{t('Add to dossier')}</Button>
      </div>
    </div>
  )
}
