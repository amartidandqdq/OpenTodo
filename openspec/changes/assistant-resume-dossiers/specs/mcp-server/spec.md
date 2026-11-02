## ADDED Requirements

### Requirement: Dossier tools
`tools/list` SHALL advertise a read tool `list_dossiers` with the other read tools, and, when writes are allowed, the write tools `create_dossier` and `update_dossier`, with the arguments and limits of the task-dossiers requirement "The assistant reads and plans dossiers". They SHALL follow the write permission gate, limits, audit and untrusted-text marking of every other tool, and `create_dossier` SHALL accept `client_request_id` and `id` like `create_project`.

#### Scenario: Listed with the others
- **WHEN** an `agent` token lists tools with writes allowed
- **THEN** `list_dossiers` is listed with the read tools and `create_dossier` and `update_dossier` with the write tools

#### Scenario: Read-only token
- **WHEN** a `read` token lists tools
- **THEN** `list_dossiers` is listed and no dossier write tool is
