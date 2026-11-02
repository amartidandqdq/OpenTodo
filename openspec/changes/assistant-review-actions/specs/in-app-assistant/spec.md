## ADDED Requirements

### Requirement: Review actions stay in view
The review card's foot (the apply action, Discard and the keys) SHALL stay at the bottom of the scrolling panel while the card is taller than the panel, and SHALL sit on the surface so that rows scroll beneath it. The card SHALL NOT clip its content in a way that stops the foot from staying in view.

#### Scenario: Long proposal
- **WHEN** a change set has more rows than fit in the panel and the person scrolls down to the last row
- **THEN** the apply action and Discard stay visible at the bottom of the panel, and the apply action still applies the checked items

### Requirement: Continue after the round limit
When a turn stopped at the round limit and its partial proposal is on screen, the review card SHALL offer a Continue action. Continue SHALL send the follow-up user message "Continue with the rest." in the same conversation, with the same history as a normal turn, and SHALL NOT carry the composer's draft, skill or pasted text. It SHALL be disabled while a turn streams or the review is busy. Continue SHALL NOT apply anything: the new turn's proposal goes through the review like any other. Other stop reasons (refusal, cut off, error) and a shown result without a proposal SHALL NOT offer it.

#### Scenario: Partial proposal continued
- **WHEN** a turn stops with stop `round_limit`, a partial proposal is shown, and the person presses Continue
- **THEN** a user message "Continue with the rest." is added to the conversation, the assistant answers with its next changes, and nothing is applied until the person applies them

#### Scenario: No Continue after another stop
- **WHEN** a turn ends with stop `end_turn` and a proposal is shown
- **THEN** the review card has no Continue action

#### Scenario: Composer kept
- **WHEN** the person has typed a draft and presses Continue
- **THEN** the continuation is sent and the draft stays in the composer
