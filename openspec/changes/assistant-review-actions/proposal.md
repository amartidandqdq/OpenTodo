# Assistant: keep the review's actions in view, and continue past the round limit

## Why

A long proposal can be taller than the panel. Apply and Discard sit at the foot of
the card, so a person who reviews the top of a long change set has to scroll down to
apply it. And when a turn stops at the round limit with a partial proposal
(`assistant-partial-proposal`), the message asks the person to "ask again to continue
with the rest", which means typing the request. A one-tap Continue removes that step.

## What Changes

- **Sticky action bar.** The review card's foot (Apply, Discard, the keys) stays at the
  bottom of the scrolling panel while the card is taller than the panel, and sits on the
  surface so the rows scroll under it. The card no longer clips its content with
  `overflow: hidden`, which would have stopped the sticky foot from working.
- **Continue after the round limit.** When the proposal on screen came from a turn that
  stopped at the round limit (`round_limit`), the review card shows a Continue button.
  It sends the follow-up user message "Continue with the rest." in the same conversation,
  with the same history, as a normal turn. Nothing is applied without the review.

## Out of scope

- Raising the round limit, or continuing by itself without the person pressing Continue.
- Continue for a turn that stopped for another reason (refusal, cut off, error).
- Changes to the server loop, the on-device loop or the op schema.

## Impact

`web/src/app/assistant/ChangeSetReview.tsx`, `AssistantPanelBody.tsx`,
`AssistantPanel.tsx`, `AssistantPage.tsx`, `useAssistantConversation.ts`; tests in
`web/src/app/changeSetReview.test.tsx` and `assistantPanel.test.tsx`; French
messages in `web/src/locales/fr.json`. No server change, no new dependency, no op
schema change, no new route.

## Capabilities

### Modified Capabilities

- `in-app-assistant`: the reviewable change set keeps its foot in view, and a
  round-limit proposal offers Continue.
