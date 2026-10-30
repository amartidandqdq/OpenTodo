## ADDED Requirements

### Requirement: A dossier is an ordered personal thread of existing tasks
The app SHALL store a dossier as a synced personal entity with a title, an optional note, an ordered list of existing task ids, an optional waiting state (`waiting`, `waiting_for`) and an optional follow-up date (`follow_up`). A dossier SHALL belong to the current workspace like a label. Creating, renaming, noting, attaching, detaching, reordering, holding, resuming and deleting a dossier SHALL write through the op log, work offline, sync to the account's other devices, and keep an Undo for the batch. A dossier SHALL never move a task, change its list, due date, labels, priority or completion state by itself.

#### Scenario: A dossier of tasks from two lists
- **WHEN** the person creates "Kitchen" and attaches "Get three quotes" from Home and "Book the fitters" from Errands
- **THEN** both tasks stay in their lists, and the dossier lists them in the order chosen

#### Scenario: Reload and another device
- **WHEN** the person creates a dossier and attaches two tasks offline, then reloads
- **THEN** the dossier and its order are still there; after sync the same dossier appears on the account's other device

#### Scenario: Undo an attachment
- **WHEN** the person attaches a task and chooses Undo
- **THEN** the task leaves the dossier and stays in its list

### Requirement: The next step and progress are derived from real tasks
The dossier SHALL show the first live, open task in its order as the next action, and the number of completed live members over the number of live members as its progress. It SHALL NOT store a progress or stage field. Completing or reopening a member task in any list, on any device, SHALL change the dossier's next step and progress after the op applies. The next step and progress SHALL be derived from the live task rows, never from a separate stored stage.

#### Scenario: Complete the current step
- **WHEN** the person completes the current task from the dossier
- **THEN** the task is completed through the ordinary completion path, the dossier shows the following open task, and Undo reopens the task and restores the previous step

#### Scenario: Reopen an earlier step
- **WHEN** the person reopens an earlier completed task
- **THEN** the dossier's next action becomes that earlier task again

#### Scenario: Complete it in its list
- **WHEN** the current task is completed in its own list on another device and syncs
- **THEN** the dossier advances without a reload or a second write

### Requirement: Attaching uses live, editable tasks
The attach picker SHALL offer only live, open tasks of the current workspace that the person may edit, and SHALL leave out tasks already in the dossier. A deleted task, a task of a deleted project, a task the person can no longer see, and a task in a read-only shared project SHALL NOT be attachable. A member that later becomes unavailable SHALL be shown as unavailable and SHALL NOT be removed, reordered or completed automatically; the person may remove it explicitly.

#### Scenario: A read-only project
- **WHEN** the person opens the attach picker on a dossier while a shared project is read-only
- **THEN** that project's tasks are not offered

#### Scenario: A deleted member
- **WHEN** a task in a dossier is deleted in its list
- **THEN** the dossier names one unavailable task, the remaining steps keep their order, and no write happens by itself

#### Scenario: A foreign id
- **WHEN** a device writes a task id the author cannot see into a dossier
- **THEN** the server refuses that field and the dossier keeps its previous order

### Requirement: Waiting is distinct from a task's due date
A dossier SHALL have a waiting state with what is being waited for and an optional follow-up date. Setting, changing or clearing the waiting state SHALL write only dossier fields: no task due date, deadline, start date, reminder or completion SHALL change. The Waiting view SHALL list dossiers on hold with their follow-up date and a resume action. Resuming SHALL clear the waiting state and show the current open task again, as one undoable batch. A follow-up date that has arrived SHALL be a quiet prompt, never an overdue task.

#### Scenario: Put a thread on hold
- **WHEN** the person holds "Tyres" for "the delivery" with a follow-up date
- **THEN** the dossier shows the wait and the date, the Waiting view lists it, and every member task keeps its due date

#### Scenario: The wait resolves
- **WHEN** the person resumes the dossier
- **THEN** the wait and follow-up date are cleared, the next open task is shown, and Undo restores the wait

#### Scenario: Follow-up date passes
- **WHEN** the follow-up date is before the logical today
- **THEN** the Waiting view says it is due to look again, without marking any task late

### Requirement: Dossiers in today's focus
The sun on a dossier SHALL add it to or remove it from today's focus without changing a due date. The selection SHALL be stored on the synced personal review row as `focus_dossiers`, dated by the same `focus_date` as the task focus, and SHALL hold at most three dossiers. Choosing a dossier or a task after the day rolled over SHALL clear the other kind of selection from the previous day in the same write. Today's **My day** section SHALL show the chosen dossiers before the chosen tasks.

#### Scenario: Choose a dossier for today
- **WHEN** the person presses the sun on a dossier and opens Today
- **THEN** My day shows the dossier with its next step, and the dossier's tasks keep their own dates

#### Scenario: The day rolls over
- **WHEN** yesterday's focus held a dossier and the person chooses a task today
- **THEN** yesterday's dossier is not shown as today's focus

#### Scenario: A fourth dossier
- **WHEN** three dossiers are in today's focus and the person presses the sun on a fourth
- **THEN** a toast says the focus holds three dossiers and nothing is written

### Requirement: Capture can offer an existing dossier
After a task is added from the Reprendre le fil capture, the device SHALL compare the title with the titles, notes and member task titles of the live dossiers on the device. A positive match SHALL offer a card naming the task and one proposed dossier, with a Combobox for another dossier, a confirm action, a keep-as-task action and a close action. The card SHALL say the suggestion is local and uses no model. Nothing SHALL be attached before the confirm action; confirming SHALL attach the existing task as one undoable batch. Closing or keeping the task SHALL write nothing. When no dossier matches, the existing quick-add follow-up SHALL be unchanged.

#### Scenario: A matching dossier
- **WHEN** the person captures "BMW garage confirmed" and a dossier mentions BMW
- **THEN** a local card offers that dossier, and only its confirm action attaches the task

#### Scenario: Another dossier
- **WHEN** the person chooses another dossier in the card and confirms
- **THEN** the task is attached to the dossier they chose

#### Scenario: Dismiss
- **WHEN** the person closes the card or keeps the task separate
- **THEN** no op is written and the task stays where it was created

#### Scenario: Offline and no assistant
- **WHEN** the device is offline and the assistant is off
- **THEN** the local card still works, and no model is called

