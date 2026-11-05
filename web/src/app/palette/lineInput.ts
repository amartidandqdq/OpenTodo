// One line read like the quick add reads it (command-palette "Add as a task from
// Search"; simple-mode "The single field"). Kept apart from addFromBar so a screen
// that only parses a line does not pull in the bar's toasts and paste handling.
import { currentDateTime, logicalToday } from '../../lib/dates'
import { loadQuickAddSettings, parse, resolveDayMonthOrder, resolveLanguages, toTaskInput, type LabelRef, type ProjectRef } from '../../lib/nlp'
import { preferredLanguages } from '../../lib/i18n'
import { dayPartsPreferred } from '../../lib/dayParts'
import { timeSectorsPreferred } from '../../lib/sectorPrefs'
import { energyLevelsPreferred } from '../../lib/energy'
import { createLabelByName, nowHHMM, type QuickAddInput } from '../QuickAdd'

/** One line read like the quick add reads it (Search's "Add as a task"); the plain line when parsing is off or leaves no title. */
export async function lineToInput(line: string, projects: readonly ProjectRef[], labels: readonly LabelRef[]): Promise<QuickAddInput> {
  const settings = loadQuickAddSettings()
  if (!settings.enabled) return { title: line }
  const langs = preferredLanguages()
  const parsed = parse(line, {
    today: logicalToday(), now: nowHHMM(), languages: resolveLanguages(settings, langs), dayMonthOrder: resolveDayMonthOrder(settings, langs, null),
    weekStart: currentDateTime().weekStart, projects, dismissed: [],
    // Part phrases only while the account uses day parts (day-parts D5).
    dayParts: await dayPartsPreferred(),
    // The `~deep` tokens only while the account offers energy (task-energy D3).
    energy: await energyLevelsPreferred(),
    // Sector phrases only while the account uses time sectors (time-sectors D8).
    sectors: await timeSectorsPreferred(),
  })
  return parsed.title ? toTaskInput(parsed, { labels, createLabel: createLabelByName }) : { title: line }
}
