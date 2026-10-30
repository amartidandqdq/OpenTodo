# Tasks

## 1. Specs and contracts

- [ ] 1.1 Proposal, design and delta specs for `task-dossiers`, `open-loops`, `task-list-presentation` and `app-shell`
- [ ] 1.2 Add `dossier` and `review.focus_dossiers` to `internal/sync/ops.go`; regenerate `opSchema.ts`, `contentfields.go` and the schema fixture
- [ ] 1.3 Server validation of `dossier.task_ids` against visible tasks; Go tests for personal scope, refused foreign ids, waiting fields and reload
- [ ] 1.4 Export and own-export import of dossiers

## 2. Data layer

- [ ] 2.1 `web/src/lib/types.ts`, `db.ts` (v25 table), `ops.ts` defaults, `localData.ts` live snapshots
- [ ] 2.2 `lib/dossierModel.ts`: derived step, progress, waiting, missing members, local capture match, focus helpers
- [ ] 2.3 `lib/dossiers.ts`: create, edit, attach, detach, reorder, hold, resume, delete, focus, capture offer; all through ops/applyBatch
- [ ] 2.4 Tests for persisted transitions, undo, deleted members, reordering, date rollover and remote ops

## 3. Screens

- [ ] 3.1 `/resume`: capture, local dossier offer, featured dossier card, context chips from existing labels, all dossiers
- [ ] 3.2 `/dossier/<id>`: title/note editing, ordered steps, attach picker, detach, reorder, hold/resume, finish step, delete
- [ ] 3.3 Waiting view: dossiers on hold above delegated and blocked tasks; resume action
- [ ] 3.4 Today's My day: dossier cards, no duplicate task, briefing counts focus; sun on a dossier
- [ ] 3.5 Sidebar and palette destinations, router paths, lazy chunk in the shell

## 4. Copy, docs and checks

- [ ] 4.1 Message catalogue and the five shipped translations; French wording checked against the approved reference
- [ ] 4.2 `docs/resume-dossiers.md`, CHANGELOG entry, size impact recorded
- [ ] 4.3 Focused web tests, full web suite, typecheck, lint, i18n, UI, OpenSpec validation, production build and bundle budget
- [ ] 4.4 Storybook stories for the resume, dossier and waiting states; browser pass notes for the parent

