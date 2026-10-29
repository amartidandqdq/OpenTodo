## REMOVED Requirements

### Requirement: Open task counts

The sidebar count rule moves to the Inbox and Today counts requirement below: project rows show no count.

## ADDED Requirements

### Requirement: Pin a project
Every project menu (the sidebar row, the project header, the All projects page) SHALL offer a checkable "Pin to sidebar" that adds the project to, or removes it from, the user's favourites. The project SHALL stay in the Projects tree either way. Pinning SHALL be a change to the user's own preference, never to the project, so members of a shared project do not see each other's pins.

#### Scenario: Pin from the header
- **WHEN** the user opens a project's header menu and checks "Pin to sidebar"
- **THEN** the project appears in the Favourites group without a count, the item reads as checked in every menu of that project, and the project is still listed in the tree

#### Scenario: Shared project pinned by one member
- **WHEN** Ada pins a project shared with Bob
- **THEN** Bob's sidebar is unchanged and no project operation is written

### Requirement: Inbox and Today counts
The sidebar SHALL show the number of Inbox tasks (OpenSpec `project-organization`, "Inbox is the default container") and of open tasks for Today at all times, and no other count: project, favourite, view and label rows show none. The Inbox and Today rows SHALL carry their count in their accessible names. Counts SHALL be computed from local data so they are correct offline, and SHALL follow changes from other devices after sync; nothing is written for them.

#### Scenario: Counts update live
- **WHEN** a task due today is completed
- **THEN** the Today count decreases without a page reload

#### Scenario: Projects show no count
- **WHEN** "Website launch" has 5 open tasks, on a desktop with a mouse or on a touch screen
- **THEN** its row shows no number, whether or not it is hovered, and a screen reader reads the row as "Website launch"

#### Scenario: Inbox count follows scheduling
- **WHEN** the Inbox count reads 5 and the user schedules one of its tasks for tomorrow
- **THEN** the count reads 4 at once, offline too, and the tab bar on a phone shows the same number
