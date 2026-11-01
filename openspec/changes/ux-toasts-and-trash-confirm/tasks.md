## 1. Trash offer window

- [x] 1.1 BulkActions: TRASH_TOAST_MS = 15_000 for trash offers; other actions keep the base window
- [x] 1.2 Trash offers gain a "Show Trash" control navigating to the Trash view
- [x] 1.3 Tests pin the 15 s window and the second control

## 2. Confirmation for a large trash

- [x] 2.1 trashTicked asks the shared confirmation dialog above BULK_TRASH_CONFIRM_FROM (20) tasks and trashes at once below it; both keyboard Delete paths route through it
- [x] 2.2 Tests: small set immediate, large set asks with the count and trashes on confirm

## 3. Failures never cover the offer

- [x] 3.1 ToastActionHost waits while the Undo offer shows, takes the region when it leaves, starts its window when first shown and pauses on hover or focus (shared useToastTimer)
- [x] 3.2 Tests: waiting behind an offer, taking the place after, expiry from show not mount

