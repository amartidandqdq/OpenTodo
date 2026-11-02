## ADDED Requirements

### Requirement: Density is reachable from a list
Every list except Completed SHALL show a density control in its page actions, naming the current choice, Comfortable or Compact, with `aria-pressed` while Compact. Choosing it SHALL write the same synced `user_prefs.density` as Settings → Appearance, SHALL apply the compact row styling immediately, and SHALL reflect a change made in Settings or on another device.

#### Scenario: Compact from the list
- **WHEN** the person chooses the density control while it reads Comfortable
- **THEN** the preference becomes Compact, rows tighten, and the control reads Compact with `aria-pressed="true"`

#### Scenario: Comfortable again
- **WHEN** the person chooses the control while it reads Compact
- **THEN** the preference becomes Comfortable and the rows return to their usual height

#### Scenario: Changed elsewhere
- **WHEN** another device or Settings changes the density
- **THEN** the list's control reads the new choice without a reload
