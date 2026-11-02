# Tasks

## 1. Not now on the featured card

- [x] 1.1 `ResumeView`: "Not now" on a featured thread that is not on hold puts it on hold with tomorrow's follow-up date (one batch); test `resume.test.tsx` checks the dossier row and that it leaves the featured slot
- [x] 1.2 Messages extracted; French value for "Not now" reused from `fr.json`

## 2. First-use note

- [x] 2.1 `ResumeView`: a dismissible one-sentence note under "New dossier", dismissal kept in device storage; test shows it once, dismisses it, and hides it after remount
- [x] 2.2 Messages extracted; French values in `fr.json`

## 3. Follow-up date wording and tone

- [x] 3.1 `DossierCard`: the follow-up text uses the default text token; passed dates use the attention token and read "Review since {date}"; test `dossierCard.test.tsx` covers the three states
- [x] 3.2 Messages extracted; French "Revoir depuis le {date}" in `fr.json`; the old "Look again since" key retired

## 4. Add to a dossier from the task menu

- [x] 4.1 `lib/dossiers.ts`: `createDossierWithTask` creates a dossier and attaches the task in one batch; `attachTaskToDossier` and it share the attach checks; test in `dossiers.test.ts`
- [x] 4.2 `BulkActions`: "Add to a dossier…" picker for one open, editable task, with create from the typed name; test in `bulk.test.tsx` covers presence, absence and the attach
- [x] 4.3 Messages extracted; French values in `fr.json`

## 5. Checks

- [x] 5.1 `node scripts/i18n/extract.mjs --write` and `node scripts/i18n-check.mjs` pass
- [x] 5.2 `cd web && node_modules/.bin/vitest run` on the touched suites; `node_modules/.bin/tsc --noEmit -p .` passes
- [x] 5.3 `docs/resume-dossiers.md` describes Not now, the note and "Add to a dossier"
