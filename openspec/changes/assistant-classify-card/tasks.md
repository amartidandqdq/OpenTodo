## 1. Server

- [x] 1.1 `POST /api/v1/assistant/classify` (`internal/httpapi/assistant_classify.go`): same gates as a turn, no tools, answer kept only when the id was offered; usage counted; tests in `assistant_classify_test.go`

## 2. Web

- [x] 2.1 `lib/classifyAfterAdd.ts`: the device switch, `classifyAfterAdd`, the offer store; `classifyAfterAdd.test.ts`
- [x] 2.2 `app/ClassifyCard.tsx` mounted in the Shell: File it, another list, Later, Esc; `classifyCard.test.tsx`
- [x] 2.3 `createTaskThenSuggest` offers the card first and the suggestion panel otherwise

## 3. Setting and docs

- [x] 3.1 The "Propose a list" row and switch (this device); copy within the style limits; message catalogue and the five shipped translations
- [x] 3.2 Assistant settings guide and CHANGELOG `### Added`
