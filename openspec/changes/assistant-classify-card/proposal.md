# Assistant: propose a list after adding a task

## Why

A task typed as plain words ("Appeler le garage demain") lands in the Inbox unless the person types `#List`. Typing the list name is the friction that keeps the Inbox full. The assistant already knows how to read a title and the names of the lists; asking it one short question per add costs far less than an assistant turn, and a card the person confirms keeps them in control.

## What Changes

- **A card after the add.** When a task typed in a quick-add line has no list and no parent, the assistant names the list it probably belongs in and a card asks "File “title” in a list?" with the proposed list in a picker, **File it** and **Later**. **File it** is the usual move (one Undo toast). **Later**, the × and Esc leave the task in the Inbox as typed. Nothing moves before a choice.
- **A per-device switch, on by default,** "Propose a list" in Settings → Integrations → Assistant, stored on the device. It needs the assistant to be available to the account (on, consented, not an encrypted account), so the consent already covers it.
- **A small server route** `POST /api/v1/assistant/classify`: one model call with no tools. The browser sends the title and the names and ids of at most 60 live lists of the task's workspace; the answer is `{project_id, confidence}`. The server keeps only an id that was offered, so a model cannot name anything else. Same gates as a turn (assistant on, not encrypted, consent for the provider, monthly cap, one at a time per person), same usage counting, session only, refused on the demo instance. Logs hold provider, duration and token counts, never the task.
- **No card** when the model is unsure (confidence under 0.5), names no list, the call fails, or the person already filed the task. The card replaces "Suggest after adding" for the same add; that panel still opens when no card is offered.
- Dates are not part of the card: the quick-add parser already reads them from the line.

## Out of scope

- Tasks created by import, the API, CalDAV, email or another device.
- Choosing the model: the card uses the assistant's configured provider.
- Re-filing tasks already in the Inbox; "Triage my inbox" does that.

## Roadmap

Extends ROADMAP "in-app-assistant"; no new roadmap item.

## Capabilities

### Modified Capabilities

- `in-app-assistant`: a quick-add line can propose a list for the task it just created.
