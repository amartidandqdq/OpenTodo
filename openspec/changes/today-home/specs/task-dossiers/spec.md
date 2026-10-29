## ADDED Requirements

### Requirement: Today shows the featured thread under My day
Today SHALL show a compact card for the featured dossier of Pick up the thread (the same choice: today's chosen dossier, else the first thread still to advance, else the first on hold) below My day. The card SHALL show the thread's title and its next action, with "Open the thread" opening the dossier and "Not now" postponing it exactly as on Pick up the thread (the hold text "Not now", the follow-up date tomorrow, one undoable batch on the dossier only). A waiting thread shows its hold and only "Open the thread". The card SHALL be hidden when there are no dossiers. The navigation item "Pick up the thread" is unchanged.

#### Scenario: One thread on Today
- **WHEN** the person has one dossier with a next step and opens Today
- **THEN** the card shows its next action, and "Open the thread" opens the dossier

#### Scenario: No dossier
- **WHEN** the person has no dossier
- **THEN** no card is shown under My day

#### Scenario: Not now from Today
- **WHEN** the person chooses "Not now" on the Today card, then Undo
- **THEN** the thread is on hold until tomorrow and Undo restores it, and no task changes
