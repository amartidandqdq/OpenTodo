## ADDED Requirements

### Requirement: Coloured section header tint
A project list's named section with a colour SHALL show its group bar in the corresponding theme-aware soft hue. The section's task rows, uncoloured and No section headers, other groupings and board columns SHALL retain their existing surfaces. The high-contrast theme SHALL preserve its soft-tint accessibility treatment.

#### Scenario: Section colour changes
- **WHEN** a section's colour is set, changed or removed
- **THEN** its list header immediately uses the matching soft hue or returns to the normal group bar when removed

#### Scenario: Board and other groups
- **WHEN** a project is displayed as a board or grouped by another property
- **THEN** its existing column or group surfaces remain unchanged
