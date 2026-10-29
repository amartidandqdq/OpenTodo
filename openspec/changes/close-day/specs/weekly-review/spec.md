## MODIFIED Requirements

### Requirement: Close the day is reachable
The app SHALL offer Close the day at `/review/close`, reachable in every mode from the Loop home's Review move, from the command palette and by `g` then `Shift+D`. The row at the end of Today SHALL open the Close the day dialog ("Close the day from Today") instead, SHALL add no row above the list's first item, and SHALL read "Day closed, <time>" after a close on the user's local date. Opening the screen SHALL need no connection; it reads local rows only.

#### Scenario: From the end of Today
- **WHEN** Today lists five tasks and the user moves past the last row and activates "Close the day"
- **THEN** the Close the day dialog opens over Today, listing the open tasks of My day; the Close the day page at `/review/close` is not opened

#### Scenario: Keyboard path
- **WHEN** focus is not in a text field and the user presses `g` then `Shift+D`
- **THEN** the Close the day screen opens, and the cheat sheet lists the shortcut under "Go to a view"

#### Scenario: Already closed today
- **WHEN** the day was closed at 18:42 on this device's local date
- **THEN** the row at the end of Today reads "Day closed, 18:42", offers "Reopen the day", and "Close again" opens the dialog, so a second close is possible

## ADDED Requirements

### Requirement: Close the day from Today
Closing the day from Today SHALL be one small dialog over the open tasks of My day for the user's local today. Each task SHALL have one choice: **Tomorrow** moves its due date to tomorrow and keeps its time; **Another day** opens the date picker and moves its due date to the chosen day; **Not now** leaves its due date untouched. Every choice SHALL take the task out of My day. Done SHALL stay disabled until every task has a choice; with nothing in My day, Done SHALL be available at once. A task the person may not edit SHALL offer Not now only.

Done SHALL write every choice, the My day selection and the close stamp on the `review` row as ONE undoable batch through the bulk path, so one Undo offer reverts the whole close. The same batch SHALL record the carry-over so that "Reopen the day" restores the moved due dates. The write SHALL be local and offline-safe and SHALL sync as ordinary ops; the My day selection and the close stamp are the personal `review` row. After Done the dialog SHALL read "See you tomorrow" with tomorrow's preview.

The footer strip at the end of Today SHALL read "Tomorrow: N things · nothing planned" when N tasks are due tomorrow and nothing timed is due, "Tomorrow: N things · next appointment HH:MM Title" when the first timed task due tomorrow has a time without a zone, and "Tomorrow: nothing planned" when nothing is due tomorrow. The dialog's tomorrow line SHALL follow the choices made so far. The strip SHALL keep the "Close the day" button and SHALL add no row above the list's first item.

#### Scenario: Close with one choice each
- **WHEN** My day holds "Write the report" (due today at 10:00), "Book the dentist" and "Water the plants", and the person chooses Tomorrow, Not now and Not now, then Done
- **THEN** "Write the report" is due tomorrow at 10:00, the other two keep their due dates, My day is empty, the day is closed, and the dialog reads "See you tomorrow" with tomorrow's preview

#### Scenario: Another day
- **WHEN** the person chooses Another day on a task and picks Friday in the date picker
- **THEN** the task is due Friday, it is out of My day, and the tomorrow line counts it only when Friday is tomorrow

#### Scenario: Done waits for every choice
- **WHEN** one of two tasks has no choice yet
- **THEN** Done is disabled and nothing is written

#### Scenario: One undo
- **WHEN** the person closes the day with three choices and then presses Undo on the toast
- **THEN** the three due dates, the My day selection and the close stamp return to their values before the close in one step

#### Scenario: Read-only task
- **WHEN** a task in a shared project the person may not edit is in My day
- **THEN** only Not now is offered for it, and the close never changes its due date

#### Scenario: Footer with nothing tomorrow
- **WHEN** nothing is due tomorrow
- **THEN** the footer reads "Tomorrow: nothing planned" beside "Close the day"

#### Scenario: Footer with an appointment
- **WHEN** two tasks are due tomorrow and the earlier has the time 09:15
- **THEN** the footer reads "Tomorrow: 2 things · next appointment 09:15 <title>"

#### Scenario: Offline close
- **WHEN** the device has no connection and the person closes the day
- **THEN** the batch is written to the local outbox, the dialog confirms, and the close reaches other devices when the connection returns
