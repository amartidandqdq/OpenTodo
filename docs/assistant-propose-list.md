---
title: Propose a list
summary: After you add a task without a list, a card proposes where it belongs; file it, choose another list or leave it in the Inbox.
audience: user
section: Reference
specs: []
screens: []
order: 80
---
# Propose a list

You can type a task as plain words ("Call the garage tomorrow") without naming a list. It lands in the Inbox as always. Then, when the [assistant](assistant.md) is available to you, a small card asks **File “Call the garage tomorrow” in a list?** and shows the list it thinks fits.

- **File it** moves the task there. **Undo** appears, like for any move.
- The list field lets you choose another list before you file.
- **Later**, the × and <kbd>Esc</kbd> leave the task in the Inbox exactly as you typed it.

Nothing moves before you choose. No card appears when the assistant is unsure, when no list fits, when you named a list yourself, or for a subtask. Dates stay with the quick-add line, which already reads "tomorrow".

## What is sent

Only the task's title and the names of your lists (at most 60, from the workspace you are in) go to the assistant's provider, in one short call without access to your other tasks. It counts toward the monthly limit, far less than a conversation turn.

## Turn it off

**Settings → Integrations → Assistant → Propose a list** is a switch for this device, on by default. If **Suggest after adding** is also on, its panel only opens when no card was shown.
