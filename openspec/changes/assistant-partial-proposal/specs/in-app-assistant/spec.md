## MODIFIED Requirements

### Requirement: Model response checks
Before using a model response, the server SHALL check the stop reason: tool use continues the loop (at most 12 rounds), a refusal SHALL show "The model declined this request." with no partial content and no change set, and truncation SHALL mark the answer as cut off without proposing changes. When the round limit is reached, the changes drafted so far SHALL be proposed as a partial change set through the same checks as at the end of a turn, with a message saying the proposal is partial; when nothing was drafted, the message SHALL say that no changes were proposed. For Anthropic it SHALL use `tool_choice` auto, strict tool schemas, adaptive thinking and streaming.

#### Scenario: Refusal
- **WHEN** the provider ends a turn with stop reason `refusal`
- **THEN** the panel shows the refusal message, no partial text, no change set, and usage is still counted

#### Scenario: Truncated answer
- **WHEN** a turn ends with stop reason `max_tokens`
- **THEN** the answer is marked as cut off and no change set is proposed

#### Scenario: Provider key rejected
- **WHEN** the provider answers that the key is invalid
- **THEN** the turn ends with error `provider_auth`, the owner is pointed to Settings, and no key appears in the message

#### Scenario: Round limit with changes drafted
- **WHEN** a turn uses all its model calls after planning some changes
- **THEN** the planned changes are proposed for review and the message says the proposal is partial and that asking again continues with the rest

#### Scenario: Round limit with nothing drafted
- **WHEN** a turn uses all its model calls without planning any change
- **THEN** no change set is proposed and the message says that no changes were proposed
