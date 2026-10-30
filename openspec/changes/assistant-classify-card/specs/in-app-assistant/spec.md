## ADDED Requirements

### Requirement: A quick-add line can propose a list for the task it just created
When a device keeps "Propose a list" on and the assistant is available to the account (turned on by the owner, consented, not an encrypted account), a task added from a quick-add line with no list and no parent SHALL be followed by one assistant call, without tools, that receives only the task's title and the ids and names of at most 60 live lists of its workspace. The server SHALL keep the answer only if its list is one of those offered. When a list is proposed with a confidence of at least 0.5, the app SHALL show a card naming the task and the list, with a picker for another list, **File it** and **Later**; the task SHALL NOT move before a choice. **File it** SHALL move the task with an Undo; **Later**, the close button and Esc SHALL leave it as typed. The switch SHALL be stored on the device and be on by default.

#### Scenario: A list is proposed and confirmed
- **WHEN** the person adds "Appeler le garage demain" in a quick-add line and the assistant proposes the list Voiture
- **THEN** the task is created in the Inbox, a card offers Voiture, and **File it** moves the task to Voiture with an Undo toast

#### Scenario: Later
- **WHEN** the person chooses **Later**, closes the card or presses Esc
- **THEN** the task stays in the Inbox, exactly as typed

#### Scenario: Another list
- **WHEN** the person picks a different list in the card and chooses **File it**
- **THEN** the task moves to the list they picked

#### Scenario: No proposal
- **WHEN** the model names no list, a list that was not offered, or answers with a confidence under 0.5, or the call fails
- **THEN** no card is shown and the task stays in the Inbox

#### Scenario: Already placed
- **WHEN** the line named a list, the task is a subtask, or the person filed the task before the answer arrived
- **THEN** no card is shown

#### Scenario: Not available
- **WHEN** the switch is off, the owner has not enabled the assistant, the account has not consented or the account is encrypted
- **THEN** no request is made

#### Scenario: Only what is needed leaves the device
- **WHEN** the classify route runs
- **THEN** the provider receives the title and the list names, offers the model no tools, and the server logs only the provider, the duration and the token counts

#### Scenario: One add, one follow-up
- **WHEN** both "Propose a list" and "Suggest after adding" are on and a card is shown
- **THEN** the suggestion panel does not open for that add
