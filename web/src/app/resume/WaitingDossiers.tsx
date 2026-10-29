// Dossiers on hold in the Waiting view (OpenSpec change resume-dossiers): above
// the delegated and blocked task groups, with the thread's own follow-up date.
// A wait never marks a task late and never takes a place in My day.
import { useMemo } from 'react'
import { waitingDossiers } from '../../lib/dossierModel'
import { resumeDossier } from '../../lib/dossiers'
import { t } from '../../lib/i18n'
import { Button, Icon } from '../../ui'
import { reportActionError } from '../actionError'
import { ACTION_TOAST_MS, showBulkToast } from '../bulk/toastStore'
import { navigate } from '../router'
import { DossierCard, dossierTextLocked } from './DossierCard'
import { useDossierData } from './useDossierData'

export function WaitingDossiers() {
  const data = useDossierData()
  const waiting = useMemo(() => waitingDossiers(data.dossiers), [data.dossiers])
  if (!data.loaded || waiting.length === 0) return null
  const resume = async (id: string) => {
    try {
      const entry = await resumeDossier(id)
      if (entry) {
        const dossier = waiting.find((d) => d.id === id)
        const fallback = t('Dossier resumed')
        const locked = dossier && (dossierTextLocked(dossier.title) || dossierTextLocked(dossier.waiting_for))
        showBulkToast(locked ? fallback : entry.label ?? fallback, entry.id, {
          ttl: ACTION_TOAST_MS,
          action: { label: t('Open the thread'), run: () => navigate({ view: 'dossier', id }) },
        })
      }
    } catch (err) {
      reportActionError(err)
    }
  }
  return (
    <section className="mb-5" aria-labelledby="waiting-dossiers" data-waiting-dossiers>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <h2 id="waiting-dossiers" className="text-meta font-semibold uppercase tracking-wide text-faint">{t('Threads on hold')}</h2>
        <span className="ml-auto text-meta tabular-nums text-muted">{waiting.length}</span>
      </div>
      <div className="mb-3 flex items-start gap-2 rounded-control border border-default bg-surface px-3 py-2 text-meta text-muted">
        <Icon name="hourglass" size="xs" className="mt-0.5 shrink-0 text-warning" />
        <p>{t('A wait is not a late task. The follow-up brings you back to the thread; it never takes a place in My day.')}</p>
      </div>
      <div className="space-y-3">
        {waiting.map((dossier) => (
          <DossierCard key={dossier.id} dossier={dossier} tasks={data.tasks} projects={data.projectMap} canEdit={data.canEdit} compact
            onOpen={() => navigate({ view: 'dossier', id: dossier.id })}
            actions={<>
              <Button size="sm" variant="primary" icon="check" onClick={() => resume(dossier.id)} data-waiting-resume>{t('The wait is resolved')}</Button>
              <Button size="sm" variant="secondary" onClick={() => navigate({ view: 'dossier', id: dossier.id })}>{t('Open the thread')}</Button>
            </>} />
        ))}
      </div>
    </section>
  )
}
