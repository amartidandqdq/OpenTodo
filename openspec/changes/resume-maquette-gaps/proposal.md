# Reprendre le fil: maquette gaps

## Why

The approved reference (`maquettes/prochaine-action.html`, "Reprendre le fil")
shows two things the shipped dossier screens do not yet do the same way:

- A waiting dossier shows its follow-up date as an editable field on the card
  ("Revoir le [date]"), with the hint that it is a follow-up date and not a due
  date on the task. Today the date is only editable on the dossier page, so the
  card in **Reprendre le fil**, **Ma journée** and **En attente** is read-only.
- After a capture, the dossier offer keeps the task "as a separate task" and
  closes without writing. The shipped label is "Keep as a task", which does not
  say the task stays where it was created.

Checking the shipped code showed the dismissal already exists: the close button
(`Later`, with Escape) writes nothing. The featured card's "Not now" needs a
per-session dismissal state, so it is out of scope here.

## What Changes

- **The waiting card edits the follow-up date.** A dossier on hold shows
  "Look again on" with the existing date field and the hint "Follow-up date, no
  due date on the task." Changing it calls the same `setDossierFollowUp` as the
  dossier page (one undoable batch on the dossier only). The field is read-only
  when no step of the thread can be edited by the person, and the card keeps its
  text version of the date then.
- **One editor per dossier page.** The dossier page's own follow-up field moves
  to the card, so the date is edited in one place on that page.
- **Keep wording.** The capture offer's keep action reads "Keep as a separate
  task" (French: "Garder comme tâche séparée"). Its behaviour is unchanged: no
  write, the task stays where it was created.

## Out of scope

- "Not now" on the featured card. It would need a session dismissal state that
  does not exist; it is not added here.
- A destructive "cancel the entry" that deletes the task. The existing close
  control already dismisses the offer without touching the task.
- Any change to the dossier data model, sync schema or op shapes.

## Capabilities

### Modified Capabilities

- `task-dossiers`: the waiting card edits the follow-up date; the capture offer
  names its keep action "Keep as a separate task".
