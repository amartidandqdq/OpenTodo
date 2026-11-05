# Design

## Context

See proposal.md for the motivation. The pieces Simple mode needs already exist:

- **Quick add:** the parser in `web/src/lib/nlp`.
- **Assistant:** the turn, the composer and the change-set review in `web/src/app/assistant/` (`useAssistantConversation`, `ChangeSetReview`). Confirmed changes apply through `mutateMany`.
- **Skills:** defined as data in `internal/agenttools/skills.go`. The on-device copy, `web/src/lib/assistantDevice/manifest.json`, is kept equal by a test.
- **Preferences:** personal preferences are `user_prefs` fields in `internal/sync/ops.go`.
- **Precedent:** `display-mode` already serves a full-screen route outside the shell, loaded lazily (`DisplayScreen` in `App.tsx`).

## Goals / Non-Goals

**Goals:**
- The Simple screen is a separate lazy route that reuses data functions, not screens. It does not change the shell, the sidebar or any existing view.
- The data model does not change for tasks or projects. Two additive personal preferences only.
- The skills stay data: the new behaviour lives in two skill definitions and one instruction edit, with no new tool.

**Non-Goals:**
- Making the full app simpler, or a feature-flag system that hides parts of it.
- A new board engine. The Simple columns are not the `sections-and-boards` board, which groups one project by section.

## Decisions

**D1. A route, not a shell variant.** `/simple` is a top-level lazy route like `/display`, with its own small layout: the field, then columns or tabs. An alternative was a "simple" flag in the app shell that hides the sidebar and most views. It was rejected because every view and test would have to know about the flag, and the shell's three-column rules (`app-shell`) would need exceptions. A separate route keeps the full app's behaviour untouched and lets the whole screen be deleted cleanly if it fails.

**D2. Data model.** Two additive `user_prefs` fields in `Schema`, each with a comment pointing to this change:
- `simple_mode` (kString, default `""`): `"on"` means on, and anything else reads as off and is kept.
- `simple_hidden` (kStringList, default `[]`): ids of the lists left off the board. The id `"none"` is never stored: My tasks cannot be hidden.

Not content, not E2EE fields. Run `UPDATE_OP_SCHEMA=1 go test ./internal/sync -run TestGeneratedOpSchema` to regenerate `opSchema.ts`, `contentfields.go` and the fixture. No task field is added: the star is priority 1 (D4). The folded state of the completed rows and the last phone tab are device-local (`localStorage`, wrapped), like other per-device view state.

**D3. Columns are projects.** A column is a project of the current workspace, active and not archived, in `sidebar_order`. "My tasks" is open tasks with `project_id` empty. This is not the Inbox rule of `internal/inbox` (no project *and* not scheduled): Google Tasks users expect every task without a list in one place, dated or not. The difference is named in the spec so agents do not confuse the two. Sections are flattened by (section position, task position). Moving a task to another column writes `project_id` and clears `section_id` in one `mutateMany` batch (one undo).

**D4. Star = priority 1.** Alternatives were a new `task.starred` bool, or treating any priority below 4 as starred.
- A new field duplicates priority, needs CalDAV, import, filter and agent tool mapping, and conflicts with the priority sort.
- "Any priority below 4" would make unstarring destroy priorities 2 and 3 set in the full app.

The chosen rule is lossless for tasks the user never stars. Google's Task resource has no star field, so an imported Google Tasks account starts with no stars (task 2.5).

**D5. One field, two explicit intents.** Enter adds, Ctrl/Cmd+Enter or "Ask" asks. Guessing intent from the text (a question mark, a verb) was rejected. A misread would either create a junk task or send a private line to a model provider, and the second is a privacy failure. Adding goes through the existing quick-add create path (default reminder rule included, as in quick add). Asking opens the existing assistant panel over the Simple screen (`openAssistantWith`, the lazy `AssistantRoot`), so the turn, `ChangeSetReview`, apply and undo are the assistant's own. The conversation stays device-local, like the assistant's.

**D6. Skills.** Two new entries go in `skills.go` and the device manifest: `plan-day` and `tidy-up`. Both use existing read tools and `update_tasks` / `complete_tasks` proposals only.
- `plan-day` reads the Today limit from `today_summary` (which already reports `today_limit`) and today's date from the fixed instructions, so the turn carries nothing new.
- `tidy-up` needs a task's last change time. The read tools expose `created_at` only, so the task read view gains an additive `changed_at`: the newest winning field timestamp (`sync.Service.LastChanged`, already used by routines), read once per tool call and only when a task is rendered, rendered as ISO like `created_at`. The on-device read view takes it from the row's field clocks, and gains `created_at` too. This is the only change to the agent tool surface. It also benefits MCP readers, and it is listed in the `docs/api.md` tool table.
- The capture edit is instructions only: "file by subject when one project's tasks clearly share it".
- Skills stay out of the starter cards. The Simple screen's menu lists its four actions directly.

**D7. Interface budget** (`docs/interface-guide.md`):
- Chrome above the first item is two rows: the field, then the column header (desktop) or the tabs (phone).
- A task row shows 3 properties: checkbox, title and star, plus the due chip when set.
- No sidebar, so 0 primary destinations.
- One vertical scroll region (the board), plus the horizontal scroll of the columns. The editor is a sheet with its own scroller, so two regions while it is open.

The shortcuts `/ j k h l x s n Enter Alt+arrows` are registered in the registry under a `simple` scope. The registry's conflict test covers them. `x`, `s`, `j`, `k` and `Enter` keep their list meanings.

**D8. Size.** No dependency. The screen is a lazy chunk, estimated at 10 to 15 KB gzip, mostly reusing the already-lazy assistant chunk. The first-load budget (`web/bundle-budget.json`) should not move, and `make bundle-budget` confirms it. Server binary: two skill definitions, two schema fields and one read-view field, so negligible. No image size or memory change.

## Risks / Trade-offs

- [Users star a task with priority 2 and expect the star to show] → The spec states the rule, and the editor shows priority only through the star. Users who never leave Simple mode only ever create priorities 1 and 4.
- [Many lists make a very wide board] → Lists can be hidden from the menu, and columns have a fixed width with horizontal scroll, as in Google Tasks.
- [My tasks differs from the Inbox rule] → It is named in the spec and in code comments. The column is called "My tasks", never "Inbox".
- [Assistant quality for plan-day and tidy-up] → Both only propose, and every entry carries a reason. The skill tests pin the prompts' constraints: limits, blocked tasks, no trash.
- [Computing `changed_at` on large accounts] → The read is one indexed `MAX` over the op log per task in the page being read. It is checked against the 10,000-task perf seed in `internal/perfseed` tests.

## Migration Plan

Purely additive. Old clients ignore the new preference fields and skill ids, as existing fields and ids already require. Rollback is removing the route and the skills. The preference fields stay in the schema, since fields are never removed, and old values read as off.
