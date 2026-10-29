// "Resume the thread" on Today (OpenSpec change today-home, task-dossiers): the featured
// thread of Pick up the thread as a compact card under My day, with Open the thread and
// Not now. It is the same choice (featuredDossier) and the same postponement. A thread
// already in My day is not repeated there, and no dossier means no card.
import { useMemo } from 'react'
import { dossierState, featuredDossier, focusDossierIds } from '../../lib/dossierModel'
import { t } from '../../lib/i18n'
import { Button } from '../../ui'
import { act, reportActionError } from '../actionError'
import { DossierCard } from '../resume/DossierCard'
import { postponeDossier } from '../resume/dossierPostpone'
import { useDossierData } from '../resume/useDossierData'
import { navigate } from '../router'

export function TodayResume() {
  const data = useDossierData()
  const featured = useMemo(() => featuredDossier(data.dossiers, data.tasks, data.review, data.today), [data.dossiers, data.tasks, data.review, data.today])
  if (!data.loaded || !featured) return null
  if (focusDossierIds(data.review, data.today, data.dossiers).includes(featured.id)) return null
  const open = () => navigate({ view: 'dossier', id: featured.id })
  const postpone = async () => {
    try {
      await postponeDossier(featured, data.today)
    } catch (err) {
      reportActionError(err)
    }
  }
  const waiting = dossierState(featured, data.tasks).waiting
  return (
    <section className="mb-4" aria-labelledby="today-resume" data-today-resume>
      <h2 id="today-resume" className="mb-1 px-2 text-hint font-semibold uppercase tracking-wide text-faint">{t('Pick up the thread')}</h2>
      <DossierCard dossier={featured} tasks={data.tasks} projects={data.projectMap} canEdit={data.canEdit} compact focus={false} onOpen={open}
        actions={<>
          <Button size="sm" variant="secondary" onClick={open} data-today-resume-open>{t('Open the thread')}</Button>
          {!waiting && <Button size="sm" variant="ghost" onClick={() => act(postpone())} data-today-resume-later>{t('Not now')}</Button>}
        </>} />
    </section>
  )
}
