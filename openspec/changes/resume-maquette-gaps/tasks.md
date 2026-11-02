# Tasks

## 1. Specs

- [x] 1.1 Proposal, design and the `task-dossiers` delta for the waiting card and the capture keep wording

## 2. Screens

- [x] 2.1 `DossierCard`: follow-up editor for waiting threads, read-only when no step is editable
- [x] 2.2 `DossierView`: the card owns the follow-up editor; the hold block keeps its hold text and Change the hold
- [x] 2.3 `ResumeView`, `WaitingDossiers` and `TodayFocus` pass `canEdit` to the card
- [x] 2.4 `DossierLinkCard`: keep action reads "Keep as a separate task"

## 3. Copy and docs

- [x] 3.1 Messages extracted; French values for the new and retired keys in `fr.json`
- [x] 3.2 `docs/resume-dossiers.md` describes the editable card date

## 4. Tests and checks

- [x] 4.1 `dossierCard.test.tsx`: editing the date writes only the dossier; read-only when no step is editable
- [x] 4.2 Resume, dossier, Waiting, capture and My day suites
- [ ] 4.3 Full web suite, production build and bundle budget
- [x] 4.4 Browser pass for the waiting card (Storybook not run)

## Fixes found in browser testing

- [x] The dossier attach picker reopens when typing after a pick, and empties its field (Combobox).
- [x] A finished thread is not offered a new capture (`suggestDossiers`).
- [x] Pick up the thread lists only the other dossiers under the featured card.
- [x] A finished card on Pick up the thread no longer says the steps are "below".
