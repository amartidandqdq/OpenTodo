# Tasks

## 1. Today summary

- [x] 1.1 `lib/todaySummary.ts`: pure `todaySummary(...)` (chosen count, next timed task at or after the given time, earlier count from `earlierIds`) with unit tests in `todaySummary.test.ts`, covering empty parts, a passed appointment, archived projects and completed tasks
- [x] 1.2 `TaskListView` / `Briefing`: the summary line under the Today title, hidden when empty; test in `todayFocus.test.tsx` checks the line's text for a chosen task and an earlier task
- [x] 1.3 Messages extracted; French values in `fr.json` (no "en retard" or "overdue")

## 2. Counts on Inbox and Today only

- [x] 2.1 `Sidebar.tsx` and `FavouritesGroup.tsx`: project, label and view rows show no count; the Inbox and Today rows keep theirs; `sidebar.test.tsx` updated for the new rule (Inbox and Today keep their counts, project rows none)
- [x] 2.2 Other tests asserting project or label counts in the sidebar updated (`sidebar.test.tsx`, `favouritesMenus.test.tsx`, `deadlineViews.test.tsx`, `inboxRule.test.tsx`)

## 3. Resume the thread on Today

- [x] 3.1 `app/resume/dossierPostpone.ts`: the "Not now" write shared by Pick up the thread and the Today card (`ResumeView` uses it; test in `resume.test.tsx` still passes)
- [x] 3.2 `app/task-list/TodayResume.tsx`: the featured dossier card below My day, actions "Open the thread" and "Not now", hidden with no dossiers; test in `todayFocus.test.tsx` covers hidden with none, shown with one, and Not now puts it on hold
- [x] 3.3 Messages extracted; French values in `fr.json`

## 4. Checks

- [x] 4.1 `node scripts/i18n/extract.mjs --write` and `node scripts/i18n-check.mjs` pass
- [x] 4.2 `cd web && node_modules/.bin/vitest run` on the touched suites; `node_modules/.bin/tsc --noEmit -p .` passes; eslint on touched files
- [x] 4.3 `make openspec-validate` (or the cached openspec 1.13.2 with `validate --all --strict`) passes
