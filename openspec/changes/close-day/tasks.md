# Tasks

## 1. Planner (pure, lib)

- [x] 1.1 `web/src/lib/closeToday.ts`: `planCloseToday` reuses `planCarryOver` for the due dates (Tomorrow, a picked day; Not now writes nothing), removes the decided tasks from the My day selection and stamps `closed_at` and `closed_day` on the `review` row
- [x] 1.2 `closeToday` writes the plan as ONE `applyBatch` (label "Day closed") and records the carry-over on the same row so Reopen restores the moved dates
- [x] 1.3 `tomorrowPreview`: open tasks due tomorrow after the choices so far, the first timed appointment (a zoned time left out)
- [x] 1.4 `web/src/lib/closeToday.test.ts`: each choice's changes, one change per entity, the focus kept for other tasks, the preview counts and appointment, archived and completed tasks left out

## 2. Dialog and footer (app)

- [x] 2.1 `web/src/app/CloseTodayDialog.tsx`: the choices per task (a read-only task offers Not now only), Another day through the date picker, Done disabled until every task has a choice, the "See you tomorrow" confirmation
- [x] 2.2 `web/src/app/CloseDayRow.tsx`: the footer strip with the tomorrow line; "Close the day" and "Close again" open the dialog; "Reopen the day" unchanged
- [x] 2.3 `web/src/app/review/closeDay.test.tsx`: the row opens the dialog and keeps the Today path; the stepper and `g` then `Shift+D` still open `/review/close`

## 3. Tests

- [x] 3.1 `web/src/app/closeTodayDialog.test.tsx`: the footer line for an empty and a busy tomorrow; Done disabled until each choice; the preview follows the choices; Done writes the due dates, the My day selection, the close stamp and the carry-over record; an empty My day closes at once

## 4. Copy and checks

- [x] 4.1 Messages extracted (`node scripts/i18n/extract.mjs --write`); French values inserted in `fr.json`; `node scripts/i18n-check.mjs` passes
- [x] 4.2 `tsc --noEmit -p web`, eslint on the touched files, `vitest run` on the three test files
- [x] 4.3 `make openspec-validate` (the pinned openspec 1.13.2) passes
