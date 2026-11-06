# Spec Delta

## Purpose
A minimal screen for people who want lists side by side, one-line tasks and a star, with the in-app assistant behind a single field to plan the day, break tasks down, capture in bulk and tidy up. Every task and project stays fully available in the full app.

## ADDED Requirements

### Requirement: Simple mode preference
Each user SHALL have a "Simple mode" preference, on or off, off by default. It SHALL be an additive field of the user's personal preferences, written as an operation, synced to that user's devices only, editable offline with effect at once on the editing device, converging by last-writer-wins and included in the JSON export. An empty or unknown value SHALL read as off, and the client SHALL keep the stored value unchanged. While it is on, opening the app at its root or at the start view SHALL show `/simple`. Every other route SHALL stay reachable by its address. Turning it on or off SHALL write no operation on any task or project.

#### Scenario: Existing account after upgrade
- **WHEN** a user who had the app before this change opens it
- **THEN** Simple mode is off and the app opens on their usual start view

#### Scenario: Turn on offline
- **WHEN** the device is offline and the user turns Simple mode on in Settings
- **THEN** `/simple` opens at once, and after the next sync the user's other devices also open on `/simple`

#### Scenario: Concurrent toggles
- **WHEN** one device turns Simple mode on and another turns it off while both are offline
- **THEN** after both sync, every device of the user shows the value of the later write

### Requirement: Entering and leaving Simple mode
The app SHALL offer "Simple mode" as a switch in Settings and as a command palette entry, and both SHALL turn the preference on and open `/simple`. The Simple screen SHALL have a menu, reachable by keyboard and with a target of at least 44×44 px, whose "All features" item turns the preference off and opens the user's start view. Leaving SHALL not change any task, project, section or label.

#### Scenario: From the command palette
- **WHEN** the user runs "Simple mode" from the command palette
- **THEN** the preference is on and `/simple` is shown

#### Scenario: Back to all features
- **WHEN** the user chooses "All features" from the Simple screen's menu
- **THEN** the preference is off, the start view opens, and every project, section, dossier and date the user had is unchanged

### Requirement: Lists as columns
From 768 px wide the Simple screen SHALL show, below the field, one column per list side by side: first "My tasks" (open tasks of the current workspace with no project), then every active, non-archived project of the current workspace in sidebar order, leaving out the lists named in the user's "hidden lists" preference. Each column SHALL show the list's name, an "Add a task" row and its open top-level tasks in their manual order. Tasks in sections SHALL be shown in section order, then by position, with no section headers. The row of columns SHALL scroll horizontally, and the screen SHALL have one vertical scroll region. Columns SHALL grow with their content. The screen SHALL read local rows only, work offline and follow changes from other devices as they sync.

#### Scenario: Board of a Google Tasks user
- **WHEN** a user with projects Admin, Home and Car and two tasks without a project opens `/simple` on a 1280×800 screen
- **THEN** four columns are shown, in this order: My tasks (2 tasks), Admin, Home, Car

#### Scenario: Sections without headers
- **WHEN** the project Home has sections Kitchen then Garage with two tasks each
- **THEN** the Home column lists the Kitchen tasks then the Garage tasks with no section name between them

#### Scenario: Edit from another device
- **WHEN** another device renames a task in Car while `/simple` is open and online
- **THEN** the Car column shows the new title after the change syncs, without a reload

### Requirement: Choosing the lists shown
The Simple screen's menu SHALL list every list with a checkbox. Unchecking a list SHALL add its id to the "hidden lists" preference, an additive personal preference field with the same sync, offline, convergence and export behaviour as the Simple mode preference. Unknown ids in it SHALL be ignored. Hiding a list SHALL write no operation on the list or its tasks. "My tasks" SHALL always be shown. A new list SHALL be created from the menu's "New list" item as a new project, written as an operation.

#### Scenario: Hide a list
- **WHEN** the user unchecks Car in the menu
- **THEN** the Car column disappears from the Simple screen on all the user's devices after sync, and Car and its tasks are unchanged in the full app

#### Scenario: New list offline
- **WHEN** the device is offline and the user creates the list "Holidays" from the menu
- **THEN** a Holidays column appears at once at the end and the project reaches the server on the next sync

### Requirement: Phone layout
Below 768 px wide the Simple screen SHALL show one list at a time. The list names SHALL be shown as a horizontally scrolling row of tabs under the field, and the last list viewed SHALL be kept on the device. Swiping horizontally on the list SHALL move to the next or previous tab. The field and the tabs SHALL be the only chrome above the first task.

#### Scenario: Switch list on a phone
- **WHEN** the user taps the Car tab on a 390 px wide screen
- **THEN** only Car's tasks are shown, and reopening the app later shows Car again

### Requirement: Task rows
A task row on the Simple screen SHALL show a completion checkbox, the title on one line (cut with an ellipsis), the due date as a small chip only when one is set, and a star control at the end. It SHALL show no other property. Activating the checkbox SHALL complete the task and move it into the completed row. Activating the title SHALL open the task editor. Rows SHALL be reordered within a column and moved to another column by drag and drop with a pointer, and by keyboard. Moving to another column SHALL change the task's project (none for My tasks) and clear its section. Each of these actions SHALL be an operation applied locally first, work offline, converge by last-writer-wins and be undoable from the usual undo toast.

#### Scenario: Complete a task
- **WHEN** the user checks "Call the garage" in Car
- **THEN** it leaves the open tasks, the Car column's completed count goes up by one, and an undo toast is shown

#### Scenario: Move between lists
- **WHEN** the user drags "Buy paint" from My tasks to Home
- **THEN** the task's project becomes Home with no section, on every device after sync

### Requirement: The star
The star SHALL be filled when a task's priority is 1 and empty otherwise, and SHALL be named "Starred" or "Not starred" to assistive technology. Starring a task SHALL set its priority to 1, and unstarring it SHALL set its priority to 4. A task with priority 2 or 3 SHALL show an empty star and keep its priority until the user stars it. No other field SHALL be written by the star.

#### Scenario: Star a task
- **WHEN** the user stars "Close the bank account", which has priority 4
- **THEN** its priority becomes 1 and the star is filled on every device after sync

#### Scenario: Priority set in the full app
- **WHEN** a task has priority 2 from the full app
- **THEN** its star is empty on the Simple screen and its priority stays 2

### Requirement: Subtasks
Under a task with subtasks the Simple screen SHALL show its direct open subtasks, indented, with the same row as a task. Deeper subtasks SHALL not be shown on the Simple screen, and a subtask that has its own subtasks SHALL show their count instead. The task editor SHALL add a subtask to the task. Completing a task SHALL not complete its subtasks beyond what the full app does.

#### Scenario: Subtasks under a task
- **WHEN** "Close bank account" has two open subtasks and one of them has one subtask of its own
- **THEN** the two subtasks are shown indented under it, and the one with a child shows the count 1

### Requirement: Completed row
Each column SHALL end with a folded row "Completed (n)", where n is the number of completed tasks in that list. Unfolding it SHALL list them, the most recently completed first, each with a checked box that reopens the task when activated. A list with no completed tasks SHALL show no completed row. The folded state SHALL be kept on the device.

#### Scenario: Reopen a task
- **WHEN** the user unfolds "Completed (319)" in Admin and unchecks "Close account CA"
- **THEN** the task is open again in Admin and the row reads "Completed (318)"

### Requirement: Task editor
Activating a task's title SHALL open an editor over the Simple screen with the title, notes, due date (the date picker, with time optional), the star, its list, its subtasks with an "Add subtask" row, and a menu with "Break this down", "Delete" and "Open in full app". Every edit SHALL be an operation applied locally first and SHALL converge like an edit in the full app. "Delete" SHALL move the task to the trash as a tombstone, with an undo toast.

#### Scenario: Add notes offline
- **WHEN** the device is offline and the user writes notes on "Order tyres"
- **THEN** the notes are saved at once and reach other devices on the next sync

#### Scenario: Open in full app
- **WHEN** the user chooses "Open in full app" in the editor
- **THEN** the task opens in its project in the full app, and the Simple mode preference is unchanged

### Requirement: The single field
The Simple screen SHALL have one text field above the lists. Pressing Enter SHALL add the text as a new task through the quick-add parser, which reads dates, priority and project tokens as in quick add. The task goes to the list named in the text if there is one, otherwise to the selected column (on a phone, the current tab), otherwise to My tasks. Ctrl+Enter (Cmd+Enter on a Mac), or the field's "Ask" button, SHALL send the text as a message to the in-app assistant. The answer and any proposed change set SHALL open in the assistant panel over the Simple screen, where they are reviewed, applied and undone exactly as assistant change sets are. While the assistant is not available to the user, the Ask button and shortcut SHALL be absent and the field SHALL only add tasks. Adding works offline. Asking needs a connection, except where the on-device assistant applies, and SHALL say so when offline.

#### Scenario: Add a task with a date
- **WHEN** Car is selected and the user types "BMW wheel alignment thursday" and presses Enter
- **THEN** the task "BMW wheel alignment" is added to Car due on the coming Thursday

#### Scenario: Ask the assistant
- **WHEN** the user types "what is still open for the move?" and presses Ctrl+Enter
- **THEN** the assistant panel opens with the answer, and no task is added

#### Scenario: Assistant off
- **WHEN** the owner has not enabled the assistant
- **THEN** the field shows no Ask button, Ctrl+Enter adds the task like Enter, and no assistant request is made

#### Scenario: Ask while offline
- **WHEN** the device is offline and the user asks a question with a server assistant
- **THEN** the screen says the assistant needs a connection, the text stays in the field, and nothing is written

### Requirement: AI actions
While the assistant is available, the field SHALL have a menu with four actions, each running an assistant skill on the user's tasks: "Plan my day" (`plan-day`), "Break this down" (`break-down`, on the selected task, or on the field's text when no task is selected), "Turn this into tasks" (`capture`, on the field's text) and "Tidy up" (`tidy-up`). A task's editor menu SHALL offer "Break this down" for that task. Each action SHALL end in a reviewed change set or an answer, with the assistant's existing review, apply, offline, undo, limits and project exclusion behaviour. No action SHALL write anything before the user applies.

#### Scenario: Plan my day
- **WHEN** the user chooses "Plan my day" with 40 open tasks across five lists
- **THEN** a change set proposes 3 to 5 tasks due today, and nothing changes until the user applies it

#### Scenario: Bulk capture filed in lists
- **WHEN** the user types "BMW new tyres, call the furniture store, print diploma" and chooses "Turn this into tasks", and Car holds other BMW tasks
- **THEN** the change set proposes "BMW new tyres" in Car and the other two in My tasks unless a list clearly matches them

### Requirement: Keyboard operation of the Simple screen
Every action on the Simple screen SHALL be reachable without a mouse: `/` focuses the field, `j`/`k` move between tasks in a column, `h`/`l` move between columns, `x` completes, `s` toggles the star, Enter opens the editor, `n` adds a task in the selected column, and Alt with the arrow keys moves the selected task up, down or to the neighbouring column. These shortcuts SHALL be registered in the shortcut registry, scoped to the Simple screen, with no conflict, and listed in the shortcuts help.

#### Scenario: Star and move by keyboard
- **WHEN** the user selects "Buy paint" with `j`, presses `s`, then Alt+Right
- **THEN** the task is starred and moved to the next column, as two undoable operations

### Requirement: Simple screen on encrypted and demo accounts
On an end-to-end encrypted account the Simple screen SHALL show decrypted titles and notes on the device like the rest of the app, and the AI actions and Ask SHALL follow the assistant's encrypted-account behaviour: they are available only through the on-device assistant, and absent otherwise. On a demo instance the Simple screen SHALL work in the visitor's sandbox like the rest of the app.

#### Scenario: Encrypted account without on-device assistant
- **WHEN** a user with an encrypted account opens `/simple` and the owner does not allow the on-device assistant
- **THEN** the lists and tasks are shown decrypted, and the field has no Ask button and no AI actions menu
