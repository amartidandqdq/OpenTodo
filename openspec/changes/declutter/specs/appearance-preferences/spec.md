## ADDED Requirements

### Requirement: Show every More section preference
Settings → Appearance → Sidebar SHALL offer one switch, "Show every More section", off by default. It is a device preference, stored on the device only, never synced, and needs no field on the account. Off, the More group follows app-shell "Sidebar structure" with its Horizons entry and without Loop home or Statistics. On, the More group restores Loop home and Statistics and lists Next, Waiting, Anytime and Someday as separate items in place of Horizons. The switch changes only what is listed: no destination, route or saved data changes, and a promoted destination stays primary either way. The preference applies at once, without a reload.

#### Scenario: Restore the sections
- **WHEN** the user turns "Show every More section" on in Settings → Appearance → Sidebar
- **THEN** the More group lists Loop home, Statistics, Next, Waiting, Anytime and Someday, and Horizons is no longer listed

#### Scenario: Other devices unchanged
- **WHEN** the user turns the switch on on a phone and opens the app on a laptop
- **THEN** the laptop still hides Loop home and Statistics until its own switch is turned on
