## ADDED Requirements

### Requirement: Review actions stay in view
The review card's foot (the apply action, Discard and the keys) SHALL stay at the bottom of the scrolling panel while the card is taller than the panel, and SHALL sit on the surface so that rows scroll beneath it. The card SHALL NOT clip its content in a way that stops the foot from staying in view.

#### Scenario: Long proposal
- **WHEN** a change set has more rows than fit in the panel and the person scrolls down to the last row
- **THEN** the apply action and Discard stay visible at the bottom of the panel, and the apply action still applies the checked items
