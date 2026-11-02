# Assistant: propose what is ready when the steps run out

## Why

A request that needs many reads and writes (create several dossiers after analysing the tasks) can use all the model calls of a turn. The turn then ended with "needed too many steps … No changes were proposed", and everything the assistant had already prepared was thrown away, so the person had to start again with nothing to show for the tokens spent.

## What changes

- When a turn reaches its round limit, the assistant keeps the changes it had drafted: they go through the same gate as at the end of a normal turn (limits, shared-project marking, at most 50 items) and are shown for review as a partial proposal.
- The message says the proposal is partial and that asking again continues with the rest. With nothing drafted, the message stays as it was.
- Nothing else changes: the limit stays 12 model calls, nothing is applied without the review, the on-device assistant behaves the same.

## Out of scope

Raising the limit, or letting the assistant continue by itself after the limit.

## Impact

`internal/assistant` (loop, messages), `web/src/lib/assistantDevice/loop.ts` and the generated manifest, `web/src/app/assistant/useAssistantConversation.ts` (accepts a proposal after a round-limit stop), `docs/api.md`. No new dependency; no change to the op schema.
