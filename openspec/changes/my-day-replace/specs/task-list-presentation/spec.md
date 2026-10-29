## MODIFIED Requirements

### Requirement: A task can be put in today's focus from its row
An open task the person may edit SHALL offer a sun action in its revealed row actions and in its Actions menu. Choosing it SHALL add the task to today's focus, or take it out when it is already there, without changing its due date. The action SHALL be pressed while the task is in the focus, SHALL use the synced `review.focus` selection rather than a second store, and SHALL report the change in the shared toast. When the focus already holds three open tasks, the sun on a fourth SHALL NOT write and SHALL NOT be refused by a toast: it SHALL open a choice, titled "Replace which one?", that lists the three tasks in today's focus. Choosing one of them SHALL take it out of today's focus and put the pressed task in, in one batch that the person can undo; the focus SHALL never hold more than three tasks. Escape or a tap outside the choice SHALL close it without a write.

#### Scenario: Add with the sun
- **WHEN** the person chooses the sun on "Appeler le garage", which has no due date
- **THEN** the task is in today's focus, the sun reads as pressed, and a toast says so; the task keeps no due date

#### Scenario: Take it out
- **WHEN** the person chooses the sun again on a task in today's focus, or the matching Actions menu item
- **THEN** the task leaves today's focus and a toast says so

#### Scenario: Replace one of three
- **WHEN** today's focus already holds three open tasks and the person chooses the sun on a fourth, then chooses one of the three in "Replace which one?"
- **THEN** the chosen task leaves today's focus, the fourth is in it, the focus still holds three tasks, and one undo offer restores the previous selection in one step

#### Scenario: Cancel the replacement
- **WHEN** the person opens "Replace which one?" and presses Escape or taps outside it
- **THEN** nothing is written, and today's focus is as it was

#### Scenario: Room left
- **WHEN** today's focus holds fewer than three open tasks and the person chooses the sun on another
- **THEN** the task is added without any choice being offered

#### Scenario: Not offered
- **WHEN** the task is completed, in the Trash, or read-only in a shared project
- **THEN** no sun action is offered
