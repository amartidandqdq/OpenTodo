## 1. Server and device

- [x] 1.1 `internal/assistant`: at the round limit, finalise the draft; partial message when it is not empty.
- [x] 1.2 `web/src/lib/assistantDevice/loop.ts`: the same, with the message from the manifest.
- [x] 1.3 Regenerate the manifest and the goldens.

## 2. Panel and docs

- [x] 2.1 `useAssistantConversation.ts`: show a proposal that arrives with stop `round_limit`.
- [x] 2.2 `docs/api.md`: the `changeset` event can come with `round_limit`.

## 3. Tests

- [x] 3.1 Go: round limit with a drafted change and with none.
- [x] 3.2 Device loop and panel tests for the same two cases.
