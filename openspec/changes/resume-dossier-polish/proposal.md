# Reprendre le fil: dossier polish

## Why

Four gaps remain in the Reprendre le fil and dossier screens after the maquette
pass (`resume-maquette-gaps`):

- The featured card can only be acted on or opened. A person who is not ready
  for the proposed thread has no one-gesture way to set it aside.
- A dossier is not explained where it is first created, so the "New dossier"
  action gives no hint of what it is for.
- The follow-up date on a dossier card ("Revoir le <date>") is low-contrast grey
  and, once passed, is worded "Look again since". Its state should read at a
  glance and say "Review since" (French "Revoir depuis le").
- A task can only be attached to a dossier from the capture offer. The task's
  own menu should offer "Add to a dossier…", attaching it to an existing dossier
  or to a new one.

## What Changes

- **Not now on the featured card.** The featured thread that is not on hold
  shows a "Not now" action. It postpones the thread with the existing dossier
  hold and follow-up date: the thread is put on hold, its follow-up date is
  tomorrow, and it leaves the top of Pick up the thread. One undoable batch, on
  the dossier only. The hold text is "Not now" (French "Pas maintenant") and can
  be changed like any hold.
- **One-time welcome note.** Under the "New dossier" action, a one-sentence note
  explains what a dossier is. It has a dismiss control; dismissal is kept on this
  device only (never synced) and the note does not come back.
- **Readable follow-up date.** The follow-up date text uses the default text
  token instead of the muted grey. A passed date uses the attention token and
  reads "Review since {date}" (French "Revoir depuis le {date}"). No wording says
  "overdue" or "en retard".
- **Add to a dossier.** The single-task Actions menu gains "Add to a dossier…",
  a picker over the workspace's live dossiers that can also create one from the
  typed name. Attaching or creating-and-attaching is one undoable batch written
  through the dossier ops. Offered only for an open task the person may edit.

## Out of scope

- Scheduling the return to the thread: the follow-up date is shown, no
  notification is sent (unchanged).
- Any change to the dossier data model, sync schema or op shapes. The note's
  dismissal is device storage, not data.
- Bulk "Add to a dossier" for several tasks; the first version is one task.

## Roadmap

Advances the "Reprendre le fil" maquette work (ROADMAP.md, dossiers).

## Capabilities

### Modified Capabilities

- `task-dossiers`: featured-card postponement, the first-use note, the follow-up
  date's wording and tone, and attaching a task from its menu.
