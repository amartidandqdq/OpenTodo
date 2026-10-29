## ADDED Requirements

### Requirement: Today's focus is visible on Today
The Today view SHALL show a **My day** section above its Earlier and Today groups, listing the tasks of today's focus with the usual row actions and a link to the Daily check. The section SHALL read the same synced focus as the Daily check and Focus, so choosing a task with the sun anywhere makes it appear there, and completing or removing it makes it leave.

#### Scenario: A task chosen with the sun appears on Today
- **WHEN** the person puts "Appeler le garage" in today's focus from its row and opens Today
- **THEN** a My day section above the other groups lists the task, with its project and labels

#### Scenario: The selection follows the day
- **WHEN** the day rolls over at the person's day start
- **THEN** yesterday's focus is no longer shown as today's, exactly as the Daily check already treats it
