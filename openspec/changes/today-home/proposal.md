# Today home

## Why

The Today page is the day's working surface, but it starts without a sentence
that says what the day holds, the sidebar repeats open-task counts on every
project row, and the featured dossier of Pick up the thread is only one click
away from the day (it is not seen while planning it). The maquette
(`/tmp/today-home.html`) shows three small changes that make Today read as a
summary of the day and bring the thread back into it:

- A one-line summary under the Today title: how many things are chosen for
  today, the next timed item, and whether anything is earlier.
- Counts only where they answer a question: Inbox and Today. Project rows drop
  their counts, which were visible on hover and on touch screens.
- A compact "Resume the thread" card under My day, with the featured dossier's
  next action, so the thread is one click from the day without a second
  navigation.

## What Changes

- **Today summary.** A computed line under the Today title (no AI, no new
  data): "N chosen for today · next appointment HH:MM Title · nothing earlier".
  N counts My day's threads and tasks; the appointment is the earliest task due
  today with a time that has not passed; "earlier" counts the open tasks in the
  Earlier group. Empty parts are left out, except that a zero earlier count reads
  "nothing earlier". The line says "earlier", never "overdue" or "late".
- **Counts on Inbox and Today only.** Project, favourite, view and label rows
  show no count; their accessible names carry none. Inbox and Today keep their
  counts. Collapsed group headers keep their item counts, as before.
- **Resume the thread on Today.** Below My day, a compact card shows the
  featured dossier (the same choice as Pick up the thread) with its next action,
  an "Open the thread" action and "Not now", which postpones it as on the
  Pick up the thread page. Hidden when there are no dossiers. The navigation item
  "Pick up the thread" stays as it is.

## Out of scope

- Any AI wording, any new stored value, any sync or op change.
- Bulk or per-list counts on group headers, and counts on Upcoming, Calendar or
  any other destination.
- An inbox count in the summary (the Inbox count stays in the sidebar).
- Changes to the colour theme or the design tokens.

## Roadmap

Advances the "Reprendre le fil" and Today work (ROADMAP.md, dossiers and the
Today page).

## Capabilities

### New Capabilities

- `today-summary`: the one-line summary under the Today title.

### Modified Capabilities

- `app-shell`: the sidebar shows open-task counts on Inbox and Today only.
- `project-organization`: the open-task count requirement and the pinned project
  row lose their project counts.
- `task-dossiers`: the Today page shows the featured thread's card under My day.
