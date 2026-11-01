# Design

## Context

The toast primitive (design-system) guarantees one toast at a time, a new one replacing the previous: batch offers hold ten seconds, one task's own action five. The undo offer lives in a single module (toastStore.ts) so any list can raise it and the Shell renders it once. The audit's fix added a second host for background failures beside it and a longer window for Trash offers; the review found the host could overlay the offer's Undo control and that the longer window and the new confirmation had no spec backing.

## Decisions

### D1. Longer window only for named destructive offers

The base requirement's ten-second batch window stays. A bulk Trash offer holds 15 s: the audit showed a large delete needs more than ten seconds to decide, and the offer already replaces any previous one, so a shorter normal window would cut off a pending undo. The window is a parameter of the offer (BulkToast.ttl), not a change to the primitive.

### D2. Confirm above twenty

The shared confirmation dialog (design-system "Confirmation dialog") asks when trashing more than BULK_TRASH_CONFIRM_FROM (20) ticked tasks - matching the project-delete flow's confirm - and never below it, so the common small trash stays immediate. The threshold is a constant in BulkActions.tsx, checked before the batch starts.

### D3. Show Trash as the second control

The offer gains a "Show Trash" control that navigates to the Trash view. It is the second control the primitive allows, gives a path back even after the undo window closes, and reuses the existing navigation.

### D4. The failure message is an action toast, not an undo offer

A failed time-entry write has nothing to undo: it is a message with a tone and a dismiss, held in the same module so its timing and reset stay in one place. It never offers Undo and never enters the undo state machine.

### D5. Keep Trash offers longer than the base requirement

15 s is 5 s longer than the guideline's long toast, the size of the added window, and it is what the audit's fix validated (toast.test.tsx).

### D6. The failure message waits for the offer

ToastActionHost does not render its own ToastRegion while the Undo offer (UndoToast) shows one: the spec's one-toast guarantee is the requirement, and an overlay can hide the Undo control. The host returns null while a bulk toast is up, starts the action message's window when it first renders and pauses the timer while the pointer is over it or focus is inside, reusing UndoToast's useToastTimer (moved to toastStore.ts so the two hosts share it without importing from each other). When the offer leaves, the waiting message takes the region with its full window.

## Risks

- A person who relies on the older 10 s window loses a third of the batch Undo window when the toast names a Trash; the wait still starts over after the hover that pauses it, and the Show Trash control is a second way back.
- A failure message waits while an Undo offer shows. On a screen where the offer never leaves (hover held), the message stays delayed; the offer is the thing the person is reading, so this is the wanted order.

