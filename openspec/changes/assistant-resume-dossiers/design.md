# Design

## D1. Same registry, so MCP gets the tools too

The in-app assistant and MCP share `internal/agenttools`. The dossier tools are registered there, behind the same write permission gate, limits, audit and untrusted-text marking, so an `agent` token can read and plan dossiers like it does projects. The on-device manifest lists its tools explicitly (`deviceTools`), so the three tools stay off the device until the planner there is ported.

## D2. Only the dossier's own fields

`update_dossier` patches `title`, `note`, `task_ids`, `waiting`, `waiting_for` and `follow_up`, nothing else, and skips fields whose value is unchanged. `task_ids` accepts at most 50 ids of tasks the caller can see and edit (a task of a read-only project is refused), keeps the given order and drops duplicates. A dossier never moves a task or changes its due date, as in `resume-dossiers` D4. A dossier created earlier in the same turn can be updated in the same turn.

## D3. "Dossier" is not a project

The word is a project to people who file tasks and a thread to the Reprendre le fil page. The tool descriptions say which is which, and the view label says that on the page "dossier" or "fil" means the thread. Elsewhere the assistant keeps its behaviour.

## D4. More steps

Reading, creating one project per call and moving tasks needed more than 8 model calls. The limit is 12 and the rules ask for batched, parallel tool calls. A turn that still runs out proposes nothing, as before.
