## ADDED Requirements

### Requirement: Direct workspace selection
When an account has multiple workspaces, the sidebar SHALL provide a directly selectable button for each cached workspace, with its name and mark. The current workspace SHALL be visibly distinguished and exposed to assistive technology. The buttons SHALL be keyboard operable, usable on a phone and in the collapsed sidebar, and accommodate more workspaces than fit in the available width. The existing switcher menu SHALL remain available for counts and management. Switching SHALL use the existing device-local choice and route behavior, including offline; it SHALL NOT sync the choice to other devices.

#### Scenario: Switch directly
- **GIVEN** Personal and Work are available and Personal is current
- **WHEN** the user selects Work in the sidebar
- **THEN** Work becomes current and its button is marked current

#### Scenario: Offline selection
- **GIVEN** cached workspaces and no network connection
- **WHEN** the user selects another workspace
- **THEN** the device switches using cached data and remembers its choice locally
