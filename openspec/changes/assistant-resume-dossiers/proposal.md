# Assistant: plug Reprendre le fil in

## Why

On the Reprendre le fil page the assistant answered that it found nothing called "Reprendre le fil": it could read projects, tasks, sections, labels and comments, but knew neither the page nor the dossiers it shows. Asked for a "dossier" it proposed projects, because the word meant a project to it.

## What changes

- The turn's context names the pages Reprendre le fil, En attente and a dossier's page, and says that a "dossier" or "fil" said there means a dossier, not a project.
- A read tool `list_dossiers` returns the user's dossiers: state, progress, steps, next action, waiting reason and follow-up date.
- Write tools `create_dossier` and `update_dossier` plan a dossier's title, note, ordered steps and hold (`waiting`, `waiting_for`, `follow_up`). They are proposals like every other write: the review screen describes each change, nothing is written before Apply, Undo puts it back.
- The assistant's round limit goes from 8 to 12 model calls, and its rules ask the model to send independent tool calls of a step together, because creating several threads and attaching tasks ran out of steps.

## Out of scope

The on-device assistant keeps its tool subset: it does not read or plan dossiers. Dossiers are not shared and never move a task, so no sharing rule changes.

## Impact

`internal/agenttools` (three tools), `internal/assistant` (view labels, limits), `web/src/lib/assistant.ts` (review wording), the generated on-device manifest, the MCP tool list and docs. No new dependency; no change to the op schema.
