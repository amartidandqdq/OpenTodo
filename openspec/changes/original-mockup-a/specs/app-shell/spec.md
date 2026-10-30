## ADDED Requirements

### Requirement: Original mockup shell
The desktop shell SHALL use a top application bar with the instance brand,
workspace context, search and the assistant when available. Navigation SHALL
start at 12 rem wide, resizable from 10.5 to 22.5 rem, and keep collapse support.
The content SHALL be a continuous surface without the upstream inset card frame.
Existing stored sidebar widths SHALL be respected. Phone navigation SHALL remain
available with accessible controls and no desktop top-bar duplication.

#### Scenario: Desktop launch
- **WHEN** the shell opens on a device without a stored sidebar width
- **THEN** a narrow sidebar and the content appear beneath the application bar

#### Scenario: Existing device
- **WHEN** a device has a stored sidebar width
- **THEN** its choice is retained within the new resize limits

#### Scenario: Current destination on a phone
- **WHEN** a person chooses the already active destination in the phone drawer
- **THEN** the drawer closes and that destination remains open
