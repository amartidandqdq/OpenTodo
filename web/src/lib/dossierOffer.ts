// The capture offer of resume-dossiers (a task just added that may belong to a dossier):
// only the card's state, which the shell reads on every screen. Finding the match and
// attaching the task live in lib/dossiers, which loads when a dossier is used.
import { createStore } from './store'
import { resettable } from './moduleState'

/** The capture offer: the task is already created, only the attach is waiting for a choice. */
export interface DossierLinkOffer {
  key: number
  taskId: string
  title: string
  candidateIds: string[]
}

const offer = createStore<DossierLinkOffer | null>('dossierLinkOffer', null)
let seq = 0
resettable('dossierLinkOfferSeq', () => { seq = 0 })
export const dossierLinkOffer = offer.get
export const useDossierLinkOffer = offer.use

/** Shows the card for these candidates. */
export function showDossierLinkOffer(taskId: string, title: string, candidateIds: string[]): void {
  offer.set({ key: ++seq, taskId, title, candidateIds })
}

export function hideDossierLinkOffer(key?: number): void {
  if (key === undefined || offer.get()?.key === key) offer.set(null)
}
