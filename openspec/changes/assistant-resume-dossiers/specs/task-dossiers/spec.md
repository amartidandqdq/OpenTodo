## ADDED Requirements

### Requirement: The assistant reads and plans dossiers
The in-app assistant SHALL know the pages Reprendre le fil, En attente and a dossier's page as the context of a turn, and SHALL read the person's dossiers with `list_dossiers` (id, state active, waiting, finished or empty, steps done and total, the steps with their completion, the next open step, waiting flag, follow-up date, and title, note and waiting reason as untrusted text). It SHALL plan a new dossier with `create_dossier` and changes to one with `update_dossier`, limited to the dossier's title, note, ordered steps (at most 50 visible tasks the person can edit), `waiting`, `waiting_for` and `follow_up`. A planned dossier change SHALL be a proposal in the assistant's review: described in words, unchecked or applied item by item, written only after Apply as the normal ops, and undone with Undo. Planning SHALL NOT move a task or change its list, due date, deadline, start date or completion.

#### Scenario: The assistant sees the page
- **WHEN** the person asks about "Reprendre le fil" while on that page
- **THEN** the assistant lists their dossiers with `list_dossiers` instead of searching projects and tasks for the name

#### Scenario: A thread from existing tasks
- **WHEN** the person asks for a dossier called "Pneus avant" from three tasks, in order
- **THEN** the review shows "New dossier: Pneus avant" with its steps, and only Apply writes the dossier

#### Scenario: Putting a thread on hold
- **WHEN** the person asks the assistant to put a dossier on hold until a delivery, to look again on a date
- **THEN** the proposal changes the dossier's `waiting`, `waiting_for` and `follow_up` and no task's due date

#### Scenario: Unknown or read-only steps
- **WHEN** a proposal lists a task id that does not exist or sits in a read-only project
- **THEN** the tool answers an error and nothing from that call is proposed
