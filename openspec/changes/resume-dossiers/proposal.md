# Reprendre le fil: dossiers of real tasks

## Why

The approved interactive reference (`maquettes/prochaine-action.html`) turns a
list of unrelated tasks into a thread: several existing tasks belong to one
dossier, the dossier says what the next real step is, and a genuine waiting
state holds the thread without pretending a task is late. The fork already has
the presentation, the capture field, labels, today's focus and the Open Loops
Waiting view. What is missing is the memory that links real tasks into an
ordered sequence, and the waiting state that is not a task due date.

The reference uses a BMW tyre example. It is reference only: this change seeds
nothing, mutates no existing task, and invents no context, date or progress.

## What Changes

- **A dossier is a real synced entity.** It holds a title, an optional note, an
  ordered list of existing task ids, an optional waiting state (`waiting`,
  `waiting_for`) and a follow-up date (`follow_up`). It is personal to the
  account and partitioned by workspace like a label. Tasks keep their list,
  due date, labels and completion state.
- **The next step is derived.** The current step is the first live, open task in
  the dossier's order; progress is the completed tasks among its live members.
  Completing or reopening a member task in any list changes the dossier without
  a second progress field.
- **Waiting is its own state.** Putting a dossier on hold records what is being
  waited for and an optional follow-up date. Neither writes a task's due date.
  Resuming clears the hold and shows the next open task again.
- **Dossiers are edited with real operations.** Create, rename, note, attach,
  detach, reorder, hold, resume and delete all write through `mutateMany`, keep
  an Undo inverse, and sync like every other row. Attaching is a local choice,
  works offline, and needs no model.
- **Capture can offer a dossier.** After a task is added from the Reprendre le
  fil capture, a deterministic local match against dossier titles, notes and
  member task titles can offer to attach it. The card says it is a local
  suggestion, nothing changes before the person confirms, and the attachment
  has an Undo. No model is called.
- **Ma journée holds dossiers too.** The sun on a dossier writes
  `review.focus_dossiers` (up to three) beside the existing task focus. Today
  shows the chosen dossiers in **My day**, without giving a task a due date.
- **New entry points.** **Pick up the thread** (`/resume`) and a dossier page
  (`/dossier/<id>`) join the sidebar and command palette; **Waiting** shows the
  dossiers on hold above its existing delegated and blocked tasks.

## Out of scope

- A new context entity or automatic context labels. The context chips read the
  labels already on open tasks; editing them stays the task's existing label
  picker.
- Automatic progress, automatic waiting, or a dossier that moves, dates or
  completes a task by itself.
- A model call, a seeded example dossier, or a change to the existing assistant
  consent, provider or proposal rules.
- Sharing a dossier with another account. Dossiers are personal memory; the
  tasks inside keep their own sharing scopes.

## Capabilities

### New Capabilities

- `task-dossiers`: an ordered personal thread of existing tasks, its waiting
  state, its next step, and the local capture offer.

### Modified Capabilities

- `open-loops`: Pick up the thread and Waiting expose dossiers; today's focus
  can hold dossiers.
- `task-list-presentation`: My day shows dossiers and never duplicates a task
  in Today's groups; the briefing counts the chosen focus.
- `app-shell`: two new destinations and one detail address.

