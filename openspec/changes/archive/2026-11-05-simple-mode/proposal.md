# Proposal

## Why

People leaving Google Tasks want what they had: lists side by side, one-line tasks, a star, and nothing else to learn. OpenTodo can already capture, break down and plan with its assistant, but a newcomer meets dossiers, methods, sectors and frames before reaching a list. A real account observed for this change used Google Tasks with 11 lists named after areas of life and people (Admin, Home, Car, a partner, a child), short undated tasks, the star as the only priority, rare one-level subtasks and 319 completed tasks in a single list. Two of those lists, "To-do today" and "Open cases", existed only to work around missing features: a day plan and breaking a case into steps. The assistant can do both, so a minimal screen with the assistant behind one field covers that whole workflow.

## What Changes

- A new **Simple mode** screen at `/simple`: every list (the Inbox first, then the projects of the current workspace) as a column side by side, one-line tasks with a star, one level of subtasks, and a folded "Completed (n)" row per list. On a phone, one list at a time with the list names as tabs. No sidebar, no other view.
- **One field** at the top. Enter adds a task through the quick-add parser to the selected list. "Ask" (Ctrl/Cmd+Enter or its button) sends the text to the in-app assistant. The answer and any proposed change set open under the field and are reviewed and applied as usual. Without the assistant, the field only adds tasks.
- **Four AI actions** from the field's menu and a task's menu: *Plan my day*, *Break this down*, *Turn this into tasks* and *Tidy up*. Two of them are new assistant skills: `plan-day` picks 3 to 5 open tasks across all lists for today, and `tidy-up` proposes what to do with stale tasks and duplicates. `capture` now files each item in the list whose name or existing tasks clearly match it.
- **Star = priority 1.** Starring sets priority 1 and unstarring sets priority 4. Tasks with priority 2 or 3 show no star and keep their priority. No new task field.
- **A per-user preference** `simple_mode`. When it is on, the app opens on `/simple`. It is turned on from Settings and the command palette, and turned off from the Simple screen's menu ("All features"). Nothing is hidden for good: every task and project stays as it is in the full app. A second preference, `simple_hidden`, lists the lists left off the board.
- Migration path: Google Tasks users import with the existing Google Tasks importer (`more-importers`), then turn Simple mode on.

## Capabilities

### New Capabilities
- `simple-mode`: the Simple screen, its preference, columns and phone tabs, task rows, star, subtasks, completed rows, the single field and its add/ask behaviour, the AI actions menu, keyboard operation and offline behaviour.

### Modified Capabilities
- `assistant-skills`: the catalogue gains `plan-day` and `tidy-up`, and `capture` may file an item in a list that its existing tasks clearly match.

## Impact

- **Web:** a new lazily loaded `web/src/app/simple/` screen, a Simple mode row in Settings and a command palette entry. It reuses quick add, the assistant's turn and change-set components, the task panel's data functions and `mutateMany`. First-load bundle should be unchanged because the screen is a lazy route.
- **Server:** two skill definitions in `internal/assistant`, and two additive `user_prefs` fields in `internal/sync/ops.go` `Schema` (generated files regenerated). No new route, no new dependency, no new env var, no op format change.
- **Docs:** a Simple mode page in the user guide and a ROADMAP.md row.
- **Out of scope:** a separate app or binary; hiding features elsewhere in the full app; a new "starred" field; drag-and-drop between columns on phones; subtasks deeper than one level on the Simple screen (they stay reachable in the full app); onboarding that offers Simple mode at first run; Google Tasks two-way sync.
- **ROADMAP:** advances "Calm by default". There is no existing row, so this change adds one under the assistant section.
