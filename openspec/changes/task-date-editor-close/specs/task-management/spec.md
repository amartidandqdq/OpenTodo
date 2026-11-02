## ADDED Requirements

### Requirement: Date editor dismissal is clearly named
The task date editor SHALL label its dismissal control Close, distinguishing it from completing the task. Closing the editor SHALL preserve the existing locally saved changes, including while offline; it SHALL introduce no additional writes or change convergence.

#### Scenario: Close the date editor
- **WHEN** a person selects Close in the task date editor
- **THEN** the editor closes without marking the task complete
