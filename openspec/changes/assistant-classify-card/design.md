# Design

## D1. A route, not an assistant turn

A turn runs the agent loop with every read tool and the view's context, 24,000 to 33,000 input tokens in our measurements. Classifying a title needs the title and the list names. The route sends exactly those, with no tools and a bounded answer, so one add costs a few hundred tokens and the same model works for it.

## D2. The model proposes, the server filters, the person decides

The prompt tells the model the title is data. Whatever the title says, the answer is parsed as JSON and kept only if `project_id` is one of the ids the browser sent; anything else is "no proposal". The task text can therefore at worst choose between the person's own lists, and the person confirms on a card.

## D3. Where the card sits

`createTaskThenSuggest` already wraps `createTask` for the three quick-add entries. It now tries the list card first and the suggestion panel only when no card was offered, so one add never opens both. Moving uses `moveWithUndo`, so filing has the same Undo as every other move.

## D4. Defaults

On by default per device because it needs the assistant's consent and does nothing otherwise. Under 0.5 confidence the task simply stays in the Inbox.
