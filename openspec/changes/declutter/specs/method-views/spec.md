## ADDED Requirements

### Requirement: Horizon switch
Next, Waiting, Anytime and Someday SHALL share one switch at the top of each of the four views, with the four horizons as tabs in that order, the current one selected. Choosing a tab SHALL open that horizon's view at once, with the same keys, offline behaviour and live updates as before. The switch SHALL be reachable by keyboard with the arrow keys and Home and End, as a tab list. The More group SHALL offer one "Horizons" entry, opening Next, that is marked current while any of the four views is open. The `g` sequences and the command palette keep their four separate destinations, and the start view setting keeps offering each horizon.

#### Scenario: One entry for four horizons
- **WHEN** the user opens the More group on a device whose "Show all sections in More" preference is off
- **THEN** it lists "Horizons" once and not Next, Waiting, Anytime and Someday as separate items

#### Scenario: Switch between horizons
- **WHEN** the user opens Waiting from the Horizons entry and chooses the Anytime tab
- **THEN** the Anytime view opens, the Horizons entry stays marked current, and the Anytime tab is selected

#### Scenario: Keyboard
- **WHEN** the switch has focus on the Next tab and the user presses the right arrow key
- **THEN** the Waiting view opens and its tab takes focus
