# Declutter: fewer sections, hidden by default

## Why

The sidebar and settings carry more than most people use. Four horizon lists
(Next, Waiting, Anytime, Someday) each take a row in the More menu. Loop home and
Statistics sit beside them. Vim keybindings and their extended shortcut sheet are
shown to everyone in the cheat sheet. The weekly and monthly review nudge, a due
dot and a toast, appears for people who never asked for reminders. The user wants
less clutter, and nothing removed: every section stays in the app and can be
brought back.

## What Changes

- **One Horizons entry.** The More menu lists "Horizons" once, in place of Next,
  Waiting, Anytime and Someday. It opens Next. The four views share one tab
  switch at their top, so each horizon is one tap away. Their routes, keys,
  command-palette entries and start view choices are unchanged. In Open Loops
  first, Next and Waiting stay primary as the method fixes them.
- **Loop home and Statistics hidden from More by default.** A device preference,
  "Show every More section" (Settings → Appearance → Sidebar, off by default),
  restores them and the four separate entries. It only changes what is listed.
- **Vim keybindings.** The Vim keymap and the Vim section of the
  cheat sheet are behind one device setting, "Vim keybindings"
  (Settings → General → Keyboard), off by default. A device that stored the
  earlier Vim switch on keeps Vim on until it writes its own value.
- **Review reminders off by default.** The due dot and text on the Review entry,
  and the Daily check toast, appear only when "Review reminders" (Settings →
  General → Start view and briefing) is on. The Review screen stays reachable in
  every mode.

All four are device preferences: stored in the browser, never synced, never a
field on the account, and no server change. No data is deleted, no op shape or
route changes, and no shortcut is removed from the registry.

## Out of scope

- Removing any destination, route, shortcut or saved preference; the Vim keymap
  itself is unchanged when the setting is on.
- Changing the Open Loops primaries in `first` mode (Loop home, Inbox, Today,
  Next, Waiting, Review): the method fixes them.
- Any change to the review data, the weekly digest or the reminders scheduler.
- A bulk "hide these" for other sections.

## Roadmap

Advances no ROADMAP.md item: it hides existing features by default. The sidebar
stays within the interface budget of docs/interface-guide.md (at most six primary
destinations, fewer rows in More).

## Capabilities

### Modified Capabilities

- `app-shell`: the More group's destinations (Horizons; Loop home and Statistics
  behind the switch) and the review-due marker's condition.
- `weekly-review`: the due marker and the Daily check toast are opt-in.
- `method-views`: the Horizon switch on the four horizon views.
- `keyboard-shortcuts`: the advanced shortcuts setting.
- `appearance-preferences`: the Show every More section preference.

No new capability.
