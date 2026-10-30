# My day: replace one of three

## Why

My day holds at most three tasks, chosen with the sun (change `my-day-sun`). A
fourth sun currently shows a toast that refuses it ("Today's focus holds 3
tasks. Take one out first."), so the person has to find the task to take out,
press its sun, and then come back to the one they wanted. The refusal is a dead
end at the moment the person most wants the choice. The cap of three is the
point of My day and stays; only the refusal changes.

## What Changes

- **Replace which one?** When the sun is pressed on a fourth open task, a small
  popover opens at the sun (or beside the task's Actions menu) listing the three
  tasks in My day, under the heading "Replace which one?". Choosing one takes it
  out of My day and puts the pressed task in, in one step.
- **One undoable batch.** The swap is one write to the synced `review` row
  (`focus` and `focus_date`), applied through `applyBatch`, so it appears in the
  device's undo history and the toast offers Undo like any other batch.
- **Escape cancels.** Escape or a tap outside closes the popover with no write.
- **The cap stays three.** Nothing is ever written that would make four.
  Adding while there is room behaves as before, with its toast.
- **No new fields, routes or stored values.** The popover reads the same
  selection `storedFocus` / `focusTasks` already read; due dates are untouched.

## Out of scope

- Raising the cap, reordering the selection, or a fourth "later" slot.
- Changing the Daily check's own "holds 3 tasks" message: its choice is made by
  the list there, not by the sun.
- Animation beyond the existing overlay motion tokens; no new colours or tokens.
- Any change to the `review` op format or to sync.

## Dependency

This change modifies the requirement "A task can be put in today's focus from its
row" added by `my-day-sun`, which is not archived yet. Apply and archive
`my-day-sun` first, so the requirement exists in `openspec/specs/` when this
delta is merged.

## Roadmap

Advances the My day work of `my-day-sun` and the Today page (ROADMAP.md, Today
home and "Reprendre le fil").

## Capabilities

### Modified Capabilities

- `task-list-presentation`: the sun on a fourth task offers a choice of the three
  in My day instead of refusing it.
