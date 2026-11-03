## ADDED Requirements

### Requirement: Mobile list prioritizes tasks
On phone-sized screens the list header SHALL place Inbox processing and duration filter choices in its overflow menu, leaving the task list prominent. An active duration filter SHALL remain visible and removable in the header.

#### Scenario: Inbox processing remains available
- **WHEN** a phone user opens a non-empty Inbox
- **THEN** the overflow menu offers Inbox processing

#### Scenario: Active duration filter remains apparent
- **WHEN** a phone user applies a duration filter
- **THEN** the header displays a chip identifying the filter with a control to clear it

### Requirement: Mobile task creation remains available
The floating add-task button SHALL remain available while the user scrolls a list on a phone.

#### Scenario: Scrolling through tasks
- **WHEN** the phone navigation bar minimises while scrolling
- **THEN** the add-task button remains visible and usable

### Requirement: Mobile task titles remain readable
On phone-sized screens a task's source information SHALL appear below its title, leaving the title the available row width.

#### Scenario: Inbox task with a source
- **WHEN** an Inbox task shows its source on a phone
- **THEN** its source appears below the task title rather than alongside it
