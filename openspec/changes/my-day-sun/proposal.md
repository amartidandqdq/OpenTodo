# My day, chosen with the sun

## Why

The mockup (`maquette-opentodo`, version 2) makes today's selection a gesture: a sun on any task puts it in **Ma journée**, without inventing a due date. OpenTodo already has that selection: the Daily check's **Today's focus**, up to three tasks, stored on the synced `review` row and read by Focus. It is buried in the Daily check, and the mockup's gesture is missing.

## What Changes

- **A sun action on a task.** In the revealed row actions and in the task's Actions menu, the sun adds the task to today's focus or takes it out. The cap stays three; a fourth says so in a toast. The due date never changes.
- **A My day section on Today.** The chosen tasks appear above Today's Earlier and Today groups, with a sun mark and a link to the Daily check. Rows are the usual list rows: complete, open, project and labels.
- **One stored selection.** The feature reads and writes `review.focus` / `review.focus_date` through `lib/review.ts` (`storedFocus`, `focusTasks`, `toggleFocus`). No new field, route, migration or server endpoint; the selection follows the account across devices and rolls over at the user's day start.

## Out of scope

- A separate `/my-day` route and a sidebar destination; Today carries the section for now.
- Raising the three-task cap or reordering the selection; the Daily check keeps both.
- A card or a model call; the sun is a direct, reversible write.

## Capabilities

### Modified Capabilities

- `task-list-presentation`: a revealed row action and an Actions menu item put a task in or out of today's focus.
- `open-loops`: today's focus is reachable from any list and shown on Today, not only in the Daily check.
