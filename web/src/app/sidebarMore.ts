// "Show all sections in More" (OpenSpec change declutter, appearance-preferences "Show all
// sections in More preference"): a device-local switch, off by default. Off, the More group
// hides Loop home and Statistics and folds Next, Waiting, Anytime and Someday into one
// Horizons entry; on, it lists them all as before. It changes what is listed, never data.
import { createStoredValue } from '../lib/deviceStorage'

export const ALL_SECTIONS_KEY = 'opentodo.sidebar.allSections'

// Another tab's choice applies here too (the storage event). Storage refused: the
// preference just does not stick, and the sidebar keeps its default.
const allSections = createStoredValue<boolean>(ALL_SECTIONS_KEY, {
  parse: (raw) => raw === '1',
  serialize: (on) => (on ? '1' : null),
}, { crossTab: true, server: false })

export const showAllSectionsOn = allSections.get
export const setShowAllSections = allSections.set
export const useShowAllSections = allSections.use
