# Close the day from Today

## Why

Closing the day today means leaving Today for a three-step review page to decide
what happens to the tasks still in My day. The decision is small: for each open
task of My day, move it to tomorrow, pick another day, or leave it for now. The
page makes the person pass through a summary and a note first. The footer at the
end of Today should carry the close itself, with tomorrow in view, so the day ends
where the work is.

## What Changes

- **A footer strip on Today.** The row at the end of Today reads
  "Tomorrow: N things · nothing planned" (or "· next appointment HH:MM Title") and
  keeps "Close the day". A closed day reads "Day closed, 18:42" beside it, with
  "Reopen the day" and "Close again" as before.
- **A small dialog, not a page.** "Close the day" opens a dialog listing the open
  tasks of My day. Each has one choice: **Tomorrow** (its due date moves to
  tomorrow, its time kept), **Another day** (opens the date picker and moves its
  due date there), or **Not now** (it leaves My day and its due date stays).
  Every choice takes the task out of My day. Done stays disabled until each task
  has a choice. The tomorrow line in the dialog follows the choices.
- **One undoable batch.** Done writes every choice, the My day selection and the
  close stamp (`closed_at`, `closed_day`) as ONE batch through the bulk path, with
  the carry-over record so "Reopen the day" still restores moved due dates. One
  Undo offer reverts the whole close.
- **A calm confirmation.** The dialog then reads "See you tomorrow" with
  tomorrow's preview line.
- **The stepper stays.** The Close the day page at `/review/close` (summary, carry
  over, note) stays reachable from the Review move, the command palette and
  `g` then `Shift+D`. Only the Today row changes what it opens.

No new route, navigation destination, stored field or op format. The "Close again"
and "Reopen the day" behaviour of a closed day is unchanged.

## Out of scope

- Removing or changing the Close the day page or its steps.
- A "See" link to Upcoming from the footer.
- Dossiers in My day (only the tasks chosen with the sun are offered).
- Changes to the design tokens or any new colour.

## Roadmap

Advances the Today home work (ROADMAP.md, "Today home") and the close of the day
in the weekly-review capability.

## Capabilities

### Modified Capabilities

- `weekly-review`: the row at the end of Today opens the Close the day dialog
  instead of the page; the page stays reachable from the other entry points.
  Adds the dialog and the footer strip requirements.
