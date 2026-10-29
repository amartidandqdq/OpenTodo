## ADDED Requirements

### Requirement: Horizon switch
Next, Waiting, Anytime and Someday SHALL share one switch at the top of each of the four views: a row of four buttons in that order, the current one marked as the current page. Choosing a button SHALL open that horizon's view at once, with the same keys, offline behaviour and live updates as before. Each button SHALL be reachable with Tab and activated with Enter or Space. The More group SHALL offer one "Horizons" entry, opening Next, that is marked current while any of the four views is open. The `g` sequences and the command palette keep their four separate destinations, and the start view setting keeps offering each horizon.

#### Scenario: One entry for four horizons
- **WHEN** the user opens the More group on a device whose "Show every More section" preference is off
- **THEN** it lists "Horizons" once and not Next, Waiting, Anytime and Someday as separate items

#### Scenario: Switch between horizons
- **WHEN** the user opens Waiting from the Horizons entry and chooses the Anytime button
- **THEN** the Anytime view opens, the Horizons entry stays marked current, and the Anytime button is marked as the current page

#### Scenario: Keyboard
- **WHEN** the user tabs to the Waiting button and presses Enter
- **THEN** the Waiting view opens and its button is marked as the current page
