// "Not now" (resume-dossiers, today-home): the thread is put on hold until tomorrow with
// the dossier's own hold and follow-up date, one undoable batch. No task is written.
// Pick up the thread and the Today card both postpone through this one function.
import { addDaysISO } from '../../lib/dates'
import { setDossierWaiting } from '../../lib/dossiers'
import { t } from '../../lib/i18n'
import type { Dossier } from '../../lib/types'
import { showUndoToast } from '../bulk/toastStore'
import { dossierTextLocked } from './DossierCard'

export async function postponeDossier(dossier: Dossier, today: string): Promise<void> {
  const entry = await setDossierWaiting(dossier.id, t('Not now'), addDaysISO(today, 1))
  if (!entry) return
  const locked = dossierTextLocked(dossier.title)
  showUndoToast(locked ? t('Dossier on hold') : entry.label ?? t('Dossier on hold'), entry.id)
}
