# Tasks

## 1. Sticky action bar

- [ ] 1.1 `ChangeSetReview`: the card drops `overflow-hidden` (clip instead) and the foot is `sticky bottom-0` on the surface; test `changeSetReview.test.tsx` checks the classes
- [ ] 1.2 Browser check in the Storybook or the running app: a long proposal keeps Apply in view while scrolling the sheet

## 2. Continue after the round limit

- [ ] 2.1 `useAssistantConversation`: `continueTurn` sends "Continue with the rest." as a follow-up, with the same history and no skill or pasted text
- [ ] 2.2 `AssistantPanelBody` shows the Continue button in the review foot only when the last message stopped at `round_limit` and a proposal is shown
- [ ] 2.3 Messages extracted; French value in `fr.json`

## 3. Checks

- [ ] 3.1 `changeSetReview.test.tsx` and `assistantPanel.test.tsx` cover the sticky foot and the Continue condition
- [ ] 3.2 `node scripts/i18n/extract.mjs --write` and `node scripts/i18n-check.mjs` pass; `tsc --noEmit -p web`; eslint on touched files
