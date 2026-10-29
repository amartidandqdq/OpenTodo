## ADDED Requirements

### Requirement: A task can be put in today's focus from its row
An open task the person may edit SHALL offer a sun action in its revealed row actions and in its Actions menu. Choosing it SHALL add the task to today's focus, or take it out when it is already there, without changing its due date. The action SHALL be pressed while the task is in the focus, SHALL use the synced `review.focus` selection rather than a second store, and SHALL report the change in the shared toast. When the focus already holds three tasks, a fourth SHALL be refused with a message naming the cap.

#### Scenario: Add with the sun
- **WHEN** the person chooses the sun on "Appeler le garage", which has no due date
- **THEN** the task is in today's focus, the sun reads as pressed, and a toast says so; the task keeps no due date

#### Scenario: Take it out
- **WHEN** the person chooses the sun again on a task in today's focus, or the matching Actions menu item
- **THEN** the task leaves today's focus and a toast says so

#### Scenario: Full focus
- **WHEN** today's focus already holds three open tasks and the person chooses the sun on a fourth
- **THEN** nothing is written and a toast says that the focus holds three tasks

#### Scenario: Not offered
- **WHEN** the task is completed, in the Trash, or read-only in a shared project
- **THEN** no sun action is offered
