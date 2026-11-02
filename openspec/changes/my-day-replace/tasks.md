# Tasks

## 1. The replace choice

- [x] 1.1 `app/todayFocusAction.ts`: `toggleTodayFocus` returns the outcome and shows no refusal for a fourth task; `replaceTodayFocus` writes the swapped selection as one `applyBatch` on the `review` row (`focus`, `focus_date`) and offers its Undo
- [x] 1.2 `app/FocusReplace.tsx`: "Replace which one?" popover listing the three tasks in My day (`Popover`, `role="menu"`, `useRovingMenu`); Escape and outside taps close it with no write
- [x] 1.3 Wired at the three sun sites: `app/task-list/RowActionCluster.tsx`, `app/task-detail/TaskActionsMenu.tsx` and `app/bulk/BulkActions.tsx` (the Actions menu, anchored to its own place or the row's More button)

## 2. Tests

- [x] 2.1 `app/focusReplace.test.tsx`: a fourth sun opens the choice and writes nothing; choosing one swaps the two in one batch with one Undo offer and keeps the due date; Escape cancels; a task added while there is room gets no choice (the cap stays three)

## 3. Copy and checks

- [x] 3.1 Messages extracted (`node scripts/i18n/extract.mjs --write`); French values in `fr.json` for "Replace which one?", "Makes room for {title}" and the swap toast; `node scripts/i18n-check.mjs` passes
- [x] 3.2 `tsc --noEmit -p web`, eslint on the touched files, `vitest run` on `focusReplace.test.tsx` and the suites that touch the sun (`todayFocus.test.tsx`, `bulk.test.tsx`)
- [x] 3.3 `make openspec-validate` (the pinned openspec 1.13.2, `validate --all --strict`) passes
