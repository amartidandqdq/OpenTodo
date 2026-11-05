# Tasks

## 1. Preferences

- [x] 1.1 Add `user_prefs.simple_mode` (kString, `""`) and `user_prefs.simple_hidden` (kStringList, `[]`) to `Schema` in `internal/sync/ops.go` with comments citing this change, then regenerate with `UPDATE_OP_SCHEMA=1 go test ./internal/sync -run TestGeneratedOpSchema`; verify `go test ./internal/sync ./internal/e2ee` passes and the export test includes both fields
- [x] 1.2 Add readers in `web/src/lib` (`simpleMode(prefs)` reading only `"on"` as on, `hiddenLists(prefs)` ignoring unknown ids) and writers through `mutate()`; verify with vitest cases for empty, unknown and concurrent values (`npm test`)

## 2. Skills and agent tools

- [x] 2.1 Add the additive `changed_at` (time of the task's latest applied op) to the task read view in `internal/agenttools`, and document it in `docs/api.md`; verify with a read test on a task edited at a pinned clock, and a perfseed count test showing the read stays within its budget at 10,000 tasks (`go test ./internal/agenttools ./internal/perfseed`)
- [x] 2.2 Add `plan-day` and `tidy-up` to `internal/agenttools/skills.go` (ids, names, descriptions, examples, tool subsets, instructions); `plan-day` reads the Today limit from `today_summary` and today's date from the fixed instructions, so `internal/assistant/loop.go` needs no change; verify `skills_test.go` lists eight ids in order, `GET /api/v1/assistant/skills` returns eight, and the read-only/tool-subset tests cover both
- [x] 2.3 Edit the `capture` instructions to file an item by its subject when exactly one project's tasks share it, and to mark it as placed that way; verify with an assistant loop test using a scripted model that checks the instructions text and the change-set marker
- [x] 2.4 Regenerate `web/src/lib/assistantDevice/manifest.json` and the prompt vectors from the server skills, and give the device's task view `created_at` and `changed_at` (from the row's field clocks); verify the manifest equality test, the new prompt vectors and a device read test
- [ ] 2.5 Confirm the Google Tasks importer maps starred tasks to priority 1 (fix it if not); verify with an importer fixture test (`go test ./internal/importer`)

## 3. Simple screen: lists and rows

- [x] 3.1 Add the lazy `/simple` route in `web/src/app/App.tsx`, the root redirect while `simple_mode` is on, and `web/src/app/simple/SimpleScreen.tsx` with the field placeholder and the column layout; verify a route test (`/` → `/simple` when on, unchanged when off) and that `make bundle-budget` shows no first-load change
- [x] 3.2 Build the columns: My tasks (open tasks with no project), then active projects in sidebar order minus `simple_hidden`, sections flattened by section then task position; verify vitest cases on the derivation function and a happy-dom test of a live update from a remote op
- [x] 3.3 Build the task row (checkbox, one-line title, due chip when set, star) with completion, star (priority 1 ↔ 4, 2 and 3 untouched) and undo toast; verify interaction tests for complete, star, unstar and the priority-2 case, and the a11y names "Starred"/"Not starred"
- [x] 3.4 Show one level of subtasks with a child count for deeper ones, and the folded "Completed (n)" row with reopen; verify interaction tests and device-local fold state
- [x] 3.5 Add drag and drop within and between columns (`project_id` set and `section_id` cleared in one `mutateMany` batch); verify a test asserting one batch and one undo step
- [x] 3.6 Add the phone layout below 768 px (list tabs, swipe, last tab kept on the device) and check the interface budget (two chrome rows, one vertical scroller); verify `budget.test.tsx` cases for `/simple` at 390 and 1280 px and the layout check

## 4. Simple screen: field, editor, menu

- [x] 4.1 Build the field: Enter adds through the quick-add parser (list token, else selected column, else My tasks), Ctrl/Cmd+Enter and Ask send to the assistant, Ask absent when the assistant is unavailable, an offline message when asking offline; verify interaction tests for each scenario of "The single field"
- [x] 4.2 Open the assistant answer and `ChangeSetReview` in the assistant panel over the screen, and the AI actions menu (Plan my day, Break this down, Turn this into tasks, Tidy up) running the matching skills; verify interaction tests with a stubbed turn that apply and undo a change set
- [x] 4.3 Build the task editor sheet (title, notes, date, star, list, subtasks, menu with Break this down, Delete, Open in full app); verify interaction tests for offline edit, delete with undo and Open in full app keeping the preference
- [x] 4.4 Build the screen menu (list checkboxes, New list, All features) and the Settings switch and command palette entry "Simple mode"; verify interaction tests for hide list, new list offline, entering and leaving
- [x] 4.5 Register the shortcuts under the `simple` scope; verify the registry conflict test and a keyboard test for `j`, `s`, Alt+Right
- [x] 4.6 Check encrypted and demo accounts: decrypted titles shown, no Ask or AI menu without the on-device assistant; verify a happy-dom test with an encrypted fixture account
- [ ] 4.7 Add stories for the row, column, field and editor, and add the strings to every shipped catalog; verify `make ui-check`, `make ui-lint` and `make i18n-check`

## 5. Docs and integration

- [ ] 5.1 Add a Simple mode page to the user guide (switching from Google Tasks: import, then turn Simple mode on), a ROADMAP.md row and the screenshot entry; verify `make docs-check`
- [ ] 5.2 Run `cd web && npm test && npm run build`, `go test ./...` and `make check`; verify all pass, and smoke-test `/simple` in `./bin/opentodo` on desktop and phone widths with the assistant on and off
