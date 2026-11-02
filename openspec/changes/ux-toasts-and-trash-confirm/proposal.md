# UX toasts and trash confirm

## Why

A UX audit found two reliability gaps in the client's destructive-action feedback. First, deletes from the command palette, vim mode and list views skipped the undo offer entirely, and a quick series of Undo offers replaced each other after five seconds - too short to undo a large trash. Second, a background failure (a focus time entry that could not be written) surfaced nowhere, and a naive fix that rendered a second toast region could cover the Undo control of the offer already showing.

## What Changes

- **Bulk Trash offers last 15 seconds** (three times the one-action window) and carry a "Show Trash" control that navigates to the Trash view. Every other toast keeps the base windows.
- **Trashing more than 20 ticked tasks asks the shared confirmation dialog** first; smaller sets behave exactly as before. Both keyboard Delete paths (the list's Delete and the selection bar's) route through it.
- **A background failure never covers the Undo offer:** the failure message waits while the offer shows, takes the toast region when it leaves, and its window starts when it is actually shown, pausing on hover or focus like the offer's own.
- Docs: the design-system toast requirement is amended for the longer named-action windows, and the bulk-actions undo requirement for the confirmation and the control.

## Out of scope

- Changing single-task action windows (five seconds stays).
- Any change to the Trash itself (restore, purge, retention).
- Server-side behavior of any kind: this is device interface state only.

## Roadmap

Extends ROADMAP "bulk-edit" and "design-system"; no new roadmap item.

## Capabilities

### Modified Capabilities

- `design-system`: a toast for a named destructive action MAY hold a longer, explicitly specified window, and the one-toast guarantee is spelled out for the failure-message host.
- `bulk-actions`: the Undo requirement gains the large-trash confirmation and the "Show Trash" control.

