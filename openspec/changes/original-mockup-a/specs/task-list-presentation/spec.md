## ADDED Requirements

### Requirement: Approved original composition
The fork SHALL present task lists using approved mockup A: continuous surface,
prominent title, bordered quick capture, separate view toolbar, hairline task
separators and metadata stacked below titles at desktop and phone widths.
Compact density SHALL reduce spacing while preserving touch targets.
Existing task, sharing, sync, keyboard and panel operations SHALL remain usable.

#### Scenario: Project list
- **WHEN** a person opens a project list
- **THEN** the title, capture and view toolbar precede the separated task rows

#### Scenario: Completed project tasks
- **WHEN** a person chooses Completed in a project list toolbar
- **THEN** only that project's completed tasks are shown and they can be reopened
- **WHEN** the person returns to To do or changes project
- **THEN** the open-task list is shown

#### Scenario: Phone and dark theme
- **WHEN** a task list is used on a phone or in dark theme
- **THEN** titles and metadata remain readable without horizontal overflow and navigation remains usable
