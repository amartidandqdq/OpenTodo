## 1. The gesture

- [x] 1.1 `app/task-list/RowActionCluster.tsx`: a sun button for an open, editable task, pressed when the task is in today's focus; calls `toggleFocus` and reports added, removed or full in the shared toast
- [x] 1.2 `app/bulk/BulkActions.tsx`: the same action in one task's Actions menu (keyboard and touch path); `app/bulk/bulk.test.tsx`
- [x] 1.3 `app/task-detail/TaskActionsMenu.tsx`: the same action in the task's header menu, the touch path that has no hover actions

## 2. The section

- [x] 2.1 `app/task-list/TodayFocus.tsx`: today's focus above Today's groups, with the usual `TaskRow`, a sun mark and a link to the Daily check
- [x] 2.2 Mounted once for `{ view: 'today' }` in `TaskListView`; `app/todayFocus.test.tsx`

## 3. Copy and checks

- [x] 3.1 **My day**, **Add to today's focus**, **Remove from today's focus** in the message catalogue and the five shipped translations
- [x] 3.2 CHANGELOG `### Added`; focused web tests, typecheck, lint
