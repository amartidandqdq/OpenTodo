# Design

## D1. One additive entity, not a task tree or a section

A dossier is its own personal op-log entity (`dossier`). Reusing a task parent
would make member tasks subtasks and change their lists, completion cascades and
counts. Reusing a project section would tie a dossier to one list even when its
steps live in several lists. A label would lose order, waiting state and a
follow-up date.

The entity is deliberately small:

| Field | Kind | Meaning |
| --- | --- | --- |
| `title` | content string | the dossier's name |
| `note` | content string | optional context, never a task |
| `task_ids` | id list | ordered member tasks, at most 50 |
| `waiting` | bool | the thread is on hold |
| `waiting_for` | content string | what is being waited for |
| `follow_up` | date | when to look again, never a task due |
| `workspace_id` | nullable string | the workspace partition, as on a label |
| `position`, `created_at`, `deleted_at` | numbers | ordering and tombstone |

The server schema is additive; the op log's generic `scope_fields` storage needs
no SQL migration. `title`, `note` and `waiting_for` are content fields, so an
encrypted account encrypts them like a label name. The generated contract
fixture, `web/src/generated/opSchema.ts` and `internal/e2ee/contentfields.go`
are regenerated from `internal/sync/ops.go`.

## D2. Personal scope, visible tasks only

A dossier resolves to its author's personal scope, like a label, a place or an
automation rule. It is never a sharing scope and never exposes a task to another
member. The server checks every id written to `task_ids`: the task must be
visible to the author (personal or a shared project they belong to). A viewer
may include a task they can see; the client still refuses to attach tasks in a
read-only project, because a dossier's actions complete tasks. A task that later
leaves the author's visibility is shown as unavailable, never silently removed
and never used to rewrite the user's tasks.

## D3. Derived progress and one next action

The dossier stores order, never progress. The current step is the first live,
open task in `task_ids`; completed steps stay in the timeline. Completing a step
from the dossier calls the ordinary completion path, so a member task completed
in its list, on another device or by the recurrence engine advances the dossier
after sync. Reopening an earlier task moves the current step back. Removing a
step, reordering or detaching rewrites only `task_ids`.

If every live member is completed, the dossier is finished. If there are no
live members, it is empty and invites the person to attach a task. Missing ids
are counted and named as unavailable; a cleanup action can remove them, but no
write happens on its own.

## D4. Waiting is not a due date

`waiting`, `waiting_for` and `follow_up` live on the dossier. Setting or clearing
them writes only dossier fields. The next task's `due` is untouched, no task is
parked, and no reminder is created. The Waiting view reads the same fields, so a
follow-up date that has arrived is a quiet prompt, not an overdue task. Resuming
clears the three fields as one undoable batch and the current step becomes
visible again.

## D5. Today's focus, extended without changing the task cap

The existing `review.focus` keeps up to three tasks and its `focus_date`. A new
`focus_dossiers` id list (at most three) shares the same date. Toggling either
kind after the date rolled over clears the other kind in the same write, so a
yesterday selection can never appear as today's. The dossier's own due dates and
the task cap are unchanged. Today renders dossiers first in **My day**, then the
chosen tasks; Today's ordinary groups leave out the chosen tasks so a task due
today is not shown twice. The briefing receives the chosen tasks (including the
next task of a chosen dossier) and counts them, so a focus-only day is not
described as having nothing planned.

## D6. Capture proposal: deterministic, local, confirmed

After a task is created from the Reprendre le fil capture, the device compares
its title's words with each live dossier's title, note and member task titles.
Only a positive local score offers a card; the best match is preselected and the
person can choose another dossier with the existing Combobox. The card says
**Local suggestion, no model**. Nothing is attached before the confirm action;
the attachment is one `mutateMany` batch with the standard Undo. Dismissing or
keeping the task as it is writes nothing. When no dossier matches, the existing
quick-add follow-up (the assistant's list card or suggestion, under its existing
consent) is unchanged.

## D7. Presentation and size

The new screens are one lazy chunk (`app/resume/ResumeBundle.tsx`), like the
review, help and assistant bundles. The first load gains only the route and
sidebar entries, the small card used by My day and the Waiting view, and the
generated field types. The screens use semantic tokens, `Icon`, `Combobox`,
`Button`, `Field`, `Dialog` and `DateField`; there is no new dependency, font or
remote asset. The reference's BMW copy is not seeded. Expected size impact is a
few KB in the first load and a new lazy chunk under the existing budget; the
exact figures are recorded in the change's task notes after the production
build.

## D8. Why not reuse the assistant proposal

The assistant proposal infrastructure is the right model for a model-written
change set, but this offer must work offline, with no assistant configured and
no consent, and must never look like a model spoke. It reuses the same
`applyBatch` inverse, Undo toast and `ProposedChange` shape, and keeps the
source explicit. A future model-assisted suggestion can be another source of
the same confirmed card without changing the dossier entity.


## D9. Navigation budget

Pick up the thread is a primary destination in every mode. This deliberately
raises MAX_PRIMARY_DESTINATIONS from six to seven: first mode retains its six
method destinations alongside the new dossier entry. Promotions still remain
in More in that mode. The sidebar delta modifies the existing structure
requirement so the budget, tests and specification agree.
