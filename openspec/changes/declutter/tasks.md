# Tasks

## 1. Horizons in More

- [ ] 1.1 `Sidebar.tsx`: `moreEntriesOf` lists one "Horizons" entry (route Next, marked current on the four horizon views) in place of Next, Waiting, Anytime and Someday; test `sidebar.test.tsx` checks one entry and the current mark
- [ ] 1.2 `method/HorizonSwitch.tsx`: Tabs over Next, Waiting, Anytime and Someday; placed at the top of NextView, WaitingView and the Anytime and Someday lists; test `horizonSwitch.test.tsx` checks the four tabs, navigation and arrow keys
- [ ] 1.3 Messages extracted; French "Horizons", "Horizon" and tab names in `fr.json`

## 2. Plus menu sections hidden by default

- [ ] 2.1 `lib/displayPrefs` device flag "Show all sections in More" (`createStoredValue`, off by default); `moreEntriesOf` drops Loop home and Statistics and the four horizons unless it is on; test `sidebar.test.tsx` covers the default and the restored list
- [ ] 2.2 Settings → Appearance → Sidebar: switch row "Show all sections in More" (`SidebarView`); test `appearance.test.tsx` checks the default off and the write
- [ ] 2.3 Messages extracted; French values in `fr.json`; `settingsIndex.ts` entry added

## 3. Advanced keyboard shortcuts (vim)

- [ ] 3.1 `vim/prefs.ts`: the flag is read from `opentodo.advanced`; an absent value falls back to the earlier `opentodo.vim` value; sign-out clears both; `prefs.test.ts` covers default off, migration of a stored Vim switch, and turning off
- [ ] 3.2 `PreferencesPanels.tsx` `KeyboardView`: the switch is "Advanced keyboard shortcuts (vim)"; the hint in `ShortcutHelp.tsx` names it; `preferencesPanels.test.tsx` and `shortcutHelp.test.tsx` cover the label and the hidden Vim rows
- [ ] 3.3 Messages extracted; French values in `fr.json`

## 4. Review reminders off by default

- [ ] 4.1 `lib/reviewReminders.ts` device flag `opentodo.reviewReminders` (off by default); `Sidebar.tsx` `reviewMarker` ignores due rhythms unless on; `DailyCheckToast.tsx` shows nothing unless on; tests `sidebar.test.tsx` and `dailyCheckToast.test.tsx` cover off and on
- [ ] 4.2 Settings → General → Start view and briefing: switch row "Review reminders"; test `preferencesPanels.test.tsx` checks the default off
- [ ] 4.3 Messages extracted; French values in `fr.json`; `settingsIndex.ts` entry added

## 5. Checks

- [ ] 5.1 `node scripts/i18n/extract.mjs --write` and `node scripts/i18n-check.mjs` pass
- [ ] 5.2 `cd web && node_modules/.bin/vitest run` on the touched suites; `node_modules/.bin/tsc --noEmit -p .` passes
- [ ] 5.3 `make openspec-validate` (the pinned OpenSpec CLI 1.13.2) passes
- [ ] 5.4 `docs/` describes the defaults and where each setting is (`docs/language.md`, `docs/keyboard.md` if present)
