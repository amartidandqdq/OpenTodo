## Why
The date editor's Done button can be mistaken for completing the task (upstream issue #801).

## What Changes
Label the date editor's dismissal button Close. Task completion and other dialogs are out of scope. This is a usability fix rather than a roadmap feature; no breaking changes or mandatory configuration.

## Capabilities
### Modified Capabilities
- `task-management`: clarify the date editor dismissal label.

## Impact
The task date editor and its tests; existing translations supply the label.
