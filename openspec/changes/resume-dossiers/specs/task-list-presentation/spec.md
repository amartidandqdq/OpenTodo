## ADDED Requirements

### Requirement: Context actions respect dossier order and waiting
Pick up the thread SHALL offer independent open tasks and the current open step of active dossiers in its context actions. Later dossier steps and members of waiting dossiers SHALL NOT be presented as actions possible now. The featured dossier's next step SHALL appear in its card only.

#### Scenario: An ordered dossier in context actions
- **WHEN** a dossier has an open ordering step followed by reception and montage steps
- **THEN** reception and montage are absent from context actions until preceding steps are completed

#### Scenario: A waiting dossier in context actions
- **WHEN** a dossier is waiting for delivery
- **THEN** none of its member tasks is suggested in context actions, while independent open tasks remain available

### Requirement: My day holds dossiers and never duplicates a task
The Today view's **My day** section SHALL show the dossiers chosen for today before the chosen tasks, each with its next step, and SHALL keep the usual task rows for the chosen tasks. A chosen task that would also appear in Today's Earlier, Today, This Evening or Blocked groups SHALL be left out of those groups, so it is shown once. Completing or removing a chosen task or dossier SHALL make it leave the section as the stored selection changes.

#### Scenario: A focus task due today
- **WHEN** a task due today is chosen with the sun and the person opens Today
- **THEN** it appears once, in My day, and not again in Today's groups

#### Scenario: A focus dossier
- **WHEN** a dossier is chosen for today
- **THEN** My day shows its next open task and the dossier's progress

### Requirement: The briefing counts the chosen focus
The Today briefing SHALL count the open tasks chosen for today, including the next open task of a chosen dossier, in its open count and planned time. It SHALL NOT say that nothing is planned when a chosen task or dossier has no due date.

#### Scenario: Only a focus task
- **WHEN** nothing is due today and one undated task is in today's focus
- **THEN** the briefing says that task is planned, not that nothing is planned

#### Scenario: Only a focus dossier
- **WHEN** nothing is due today and one dossier is in today's focus
- **THEN** the briefing counts the dossier's next task

