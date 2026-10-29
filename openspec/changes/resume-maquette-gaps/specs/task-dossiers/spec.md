## ADDED Requirements

### Requirement: A waiting card edits the follow-up date of its thread
A dossier on hold SHALL show its follow-up date on its card as an editable date field, labelled "Look again on", with the hint "Follow-up date, no due date on the task.". Changing the field SHALL write only the dossier's `follow_up` field through the same op path as the dossier page, as one undoable batch. The field SHALL be read-only when the person cannot edit any live step of the thread, and then the card SHALL show the date as text. Changing the date SHALL NOT change any task's due date, deadline, start date, reminder or completion. The same card SHALL be used in Pick up the thread, My day and Waiting; the dossier page SHALL NOT show a second follow-up field.

#### Scenario: Change the date on the card
- **WHEN** the person types a new follow-up date on a waiting thread's card in Waiting
- **THEN** the dossier's follow-up date changes, every member task keeps its due date, and Undo restores the previous date

#### Scenario: No editable step
- **WHEN** every live step of a waiting thread is in a read-only project
- **THEN** the card shows the follow-up date as text and offers no field

#### Scenario: One editor on the dossier page
- **WHEN** the person opens a waiting dossier's page
- **THEN** the follow-up date is edited on the card only, and the hold block shows the hold text and its Change the hold action

## MODIFIED Requirements

### Requirement: Capture can offer an existing dossier
After a task is added from the Reprendre le fil capture, the device SHALL compare the title with the titles, notes and member task titles of the live dossiers on the device. A positive match SHALL offer a card naming the task and one proposed dossier, with a Combobox for another dossier, a confirm action, a keep-as-separate-task action labelled "Keep as a separate task", and a close action. The card SHALL say the suggestion is local and uses no model. Nothing SHALL be attached before the confirm action; confirming SHALL attach the existing task as one undoable batch. Closing or keeping the task as a separate task SHALL write nothing. When no dossier matches, the existing quick-add follow-up SHALL be unchanged.

#### Scenario: A matching dossier
- **WHEN** the person captures "BMW garage confirmed" and a dossier mentions BMW
- **THEN** a local card offers that dossier, and only its confirm action attaches the task

#### Scenario: Another dossier
- **WHEN** the person chooses another dossier in the card and confirms
- **THEN** the task is attached to the dossier they chose

#### Scenario: Dismiss
- **WHEN** the person closes the card or keeps the task as a separate task
- **THEN** no op is written and the task stays where it was created

#### Scenario: Offline and no assistant
- **WHEN** the device is offline and the assistant is off
- **THEN** the local card still works, and no model is called
