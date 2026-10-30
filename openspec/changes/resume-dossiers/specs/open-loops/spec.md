## ADDED Requirements

### Requirement: Pick up the thread
The app SHALL offer **Pick up the thread** at `/resume`, reachable from the sidebar, the command palette and the phone drawer. It SHALL show a bordered quick-add capture, an optional local dossier offer for the task just added, one dossier to advance with its next real step, the context chips of the labels already on open tasks, and a list of the account's dossiers. The page SHALL read the local rows, work offline and reflect remote changes live. It SHALL invent no dossier, context, date or progress, and it SHALL not seed the reference's example.

#### Scenario: Open the page
- **WHEN** the person opens Pick up the thread with two dossiers
- **THEN** the page shows one dossier to advance, its next open task and both dossiers in the list

#### Scenario: Nothing yet
- **WHEN** the account has no dossier
- **THEN** the page explains what a dossier is and offers to create one, without creating anything by itself

#### Scenario: Context chips
- **WHEN** open tasks carry the labels Calls and Home
- **THEN** the page offers those labels as context filters, and choosing one lists only the matching open tasks

### Requirement: Waiting shows dossiers on hold
The Waiting view SHALL list the dossiers on hold above its delegated and blocked task groups, each with what is being waited for, its follow-up date and a resume action. It SHALL say that a wait is not a late task. When a wait is resumed, the dossier leaves the list and its next open task is shown. When the Waiting view has only dossiers, it SHALL NOT say that nothing is waiting on anyone.

#### Scenario: A dossier on hold
- **WHEN** a dossier waits for a delivery until 2 November and the person opens Waiting
- **THEN** the dossier is listed with the delivery and the date, and the delegated and blocked groups follow

#### Scenario: Resume from Waiting
- **WHEN** the person resumes the dossier from Waiting
- **THEN** the wait is cleared with an Undo, the dossier leaves Waiting, and its next open task is available

