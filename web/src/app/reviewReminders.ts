// Review reminders (OpenSpec change declutter, weekly-review "Rhythm markers"): a device-local
// switch, off by default. On, a rhythm that is due shows a dot and text on the Review entry, the
// Loop home names it, and the Daily check is offered by a toast. Off, nothing nags: the Review
// entry names only when the last review was, and the Review screen stays reachable.
import { createStoredValue } from '../lib/deviceStorage'

export const REMINDERS_KEY = 'opentodo.reviewReminders'

// Another tab's choice applies here too (the storage event). Storage refused: the preference
// just does not stick, and the reminders stay off.
const reminders = createStoredValue<boolean>(REMINDERS_KEY, {
  parse: (raw) => raw === '1',
  serialize: (on) => (on ? '1' : null),
}, { crossTab: true, server: false })

export const reviewRemindersOn = reminders.get
export const setReviewReminders = reminders.set
export const useReviewReminders = reminders.use
