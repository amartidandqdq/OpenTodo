## ADDED Requirements

### Requirement: Advanced keyboard shortcuts are opt-in
The Vim keybindings and every shortcut listed under the Vim section SHALL be behind one device setting, "Advanced keyboard shortcuts (vim)", in Settings → General → Keyboard, off by default. Off, the Vim keymap SHALL NOT be registered, the Vim layer SHALL NOT be loaded, the cheat sheet and the guide SHALL list only the basic shortcuts, and the cheat sheet's hint about Vim keybindings SHALL name this setting. The setting is stored on the device only, never synced, and never sent to the server. A device that stored the earlier Vim keybindings switch on (the value kept under `opentodo.vim`) and has no value for the new setting SHALL keep Vim on: the earlier value is read until the new setting is written. Turning the setting off SHALL take effect at once, without a reload. No shortcut is removed from the registry.

#### Scenario: Fresh device
- **WHEN** a device has never stored the setting and has never stored the earlier Vim switch
- **THEN** the Vim keymap is not registered, the cheat sheet lists no Vim rows, and the Keyboard page shows the setting off

#### Scenario: Existing Vim user
- **WHEN** a device stored the earlier Vim switch on and has no value for the new setting
- **THEN** Vim stays on, the Keyboard page shows the setting on, and turning it off stores the choice on the device

#### Scenario: Turned off in use
- **WHEN** the user turns the setting off while a list is open
- **THEN** the Vim keys stop at once, the cheat sheet loses the Vim section, and the basic shortcuts keep working
