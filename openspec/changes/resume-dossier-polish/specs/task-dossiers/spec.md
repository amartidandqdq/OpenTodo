## ADDED Requirements

### Requirement: The featured thread can be postponed in one gesture
The featured thread on Pick up the thread SHALL offer "Not now" while it is not on hold. Choosing it SHALL put the thread on hold with the follow-up date set to the next day, as one undoable batch that writes only the dossier. The thread then leaves the featured position and appears in Waiting. The hold text SHALL be "Not now" and SHALL be editable like any hold. No task SHALL be written.

#### Scenario: Not now
- **WHEN** the person chooses "Not now" on a featured thread that is advancing
- **THEN** the thread is on hold with tomorrow's follow-up date, no task changes, and Undo restores the thread

#### Scenario: Already on hold
- **WHEN** the featured thread is on hold
- **THEN** no "Not now" action is shown

### Requirement: A first-use note explains a dossier
Under the "New dossier" action on Pick up the thread SHALL be a one-sentence note saying what a dossier is, with a dismiss control. Dismissing it SHALL be remembered on the device only, never synced, and the note SHALL NOT appear again on that device.

#### Scenario: Dismissed once
- **WHEN** the person dismisses the note and reopens the screen
- **THEN** the note is not shown

### Requirement: The follow-up date reads clearly and says when it has passed
A follow-up date on a dossier card SHALL use the default text colour. A date before today SHALL use the attention colour and read "Review since {date}" (French "Revoir depuis le {date}"). No dossier wording SHALL say a date is overdue or late.

#### Scenario: Passed date
- **WHEN** a waiting thread's follow-up date is before today
- **THEN** the card shows "Review since" with that date in the attention colour

### Requirement: A task can be added to a dossier from its menu
The Actions menu of one open task the person may edit SHALL offer "Add to a dossier…", a picker over the live dossiers of the workspace with an option to create a dossier from the typed name. Choosing a dossier SHALL attach the task at the end of its order; creating one SHALL create the dossier and attach the task in one undoable batch. The task itself SHALL NOT be written. The action SHALL NOT be offered for a completed, deleted or read-only task, or for several tasks.

#### Scenario: Attach to an existing dossier
- **WHEN** the person picks a dossier for an open task
- **THEN** the dossier's order gains the task, the task keeps its list and dates, and Undo removes it again

#### Scenario: Create and attach
- **WHEN** the person types a name with no matching dossier and chooses to create it
- **THEN** one dossier is created with the task as its only step, and Undo removes both

#### Scenario: Not offered
- **WHEN** the selection is several tasks, or the task is completed or read-only
- **THEN** "Add to a dossier…" is not offered
