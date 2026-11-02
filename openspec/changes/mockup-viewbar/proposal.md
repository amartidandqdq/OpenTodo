# View bar: density where the list is

## Why

The mockup (`maquette-opentodo`, version 2) puts a density control in the list's view bar, next to the tasks. OpenTodo already stores a synced density preference, but only Settings → Appearance exposes it, so changing it is a detour from the list being read.

## What Changes

- **Comfortable / Compact in the list header.** Every list except Completed shows the current density; one click writes the same `user_prefs.density` field through `setAppearance`, and the control follows changes made in Settings or on another device.
- **No new preference or layout.** The control is a button with a pressed state and the existing labels; the CSS that tightens rows under `data-density="compact"` is unchanged.

## Out of scope

- The mockup's **Completed** tab and its global **Subtasks** toggle; both are separate behaviour changes.
- A per-list density; the preference stays account-wide.

## Capabilities

### Modified Capabilities

- `appearance-preferences`: the density preference is also reachable from a list's header.
