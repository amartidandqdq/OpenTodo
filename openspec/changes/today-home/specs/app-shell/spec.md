## MODIFIED Requirements

### Requirement: Sidebar structure
The sidebar SHALL show, top to bottom: the workspace control (the current workspace's icon or colour and name, opening the workspace switcher; the app name is shown beside it only while the account has one workspace) with a search button beside it (search and commands), the primary destinations Inbox, Today, Upcoming, Calendar (Day or Week, as last used) pinned at the top; then, in one scroller, a "More" group collapsed by default (Anytime, Someday, Assigned to me, Completed, Updates, Locations, Trash, New view, Ask when available), the Favourites group when the user has pinned anything in the current workspace, then Projects, Labels and Views, each collapsible with its state remembered on the device and its item count on the header while collapsed; then one pinned footer row holding the account (avatar and name, opening the account menu), the assistant launcher when the assistant is available, notifications and the sync status. Every group, row and count SHALL be those of the current workspace. On a device that has not stored a state for a group, Projects SHALL start open and Labels and Views SHALL start closed. From 768 px with a fine pointer, More SHALL instead be a row after the primary destinations that opens a menu of those destinations, carrying the same marker on the row. The Views group SHALL be shown only once the user has a saved view in the current workspace and the Labels group only once the user has a label there; an empty group shows nothing, not a placeholder sentence.

Open-task counts SHALL be visible at all times on Inbox and Today only, and each SHALL carry its count in its accessible name. Project, favourite, view and label rows SHALL show no count. Collapsed group headers keep their item count. The unread badges of shared projects and of Updates are governed by `activity-feed` and are unchanged. The workspace control SHALL carry one accent dot while another workspace has unread updates, with the workspace names in its tooltip and accessible name.

The primary destinations and the More group SHALL depend on the user's "How you work" preference:

| Preference | Primary destinations | More group |
| --- | --- | --- |
| `lists` and `companion` | Inbox, Today, Upcoming, Calendar (Day or Week, as last used) | Loop home, Next, Waiting, Anytime, Someday, Assigned to me, Completed, Updates, Locations, Trash, New view, Review, Statistics, Ask when available |
| `first` | Loop home, Inbox, Today, Next, Waiting, Review | Upcoming, Calendar, Anytime, Someday, Assigned to me, Completed, Updates, Locations, Trash, New view, Statistics, Ask when available |

In `first` mode the primary destinations SHALL never exceed six. Promoted destinations SHALL be listed in the More group, and the stored promotion list SHALL be kept unchanged. The workspace control is not a destination and SHALL not count against the six.

#### Scenario: Default sidebar
- **WHEN** a user with projects, labels, saved views and no favourites opens the app on a 1280×800 screen on a device that never stored a group state
- **THEN** the workspace control, five primary destinations and the More group are visible above Projects (open), Labels (closed, "Labels 3") and Views (closed, "Views 2"), no Favourites group is shown, the footer is one row that is visible without scrolling, and only the middle part scrolls when the project tree is long

#### Scenario: One workspace
- **WHEN** an account that never created a workspace opens the app
- **THEN** the control reads "OpenTodo · Personal" and opens the switcher with the one workspace, "New workspace" and "Manage workspaces"

#### Scenario: Groups follow the workspace
- **WHEN** the user switches from "Personal" (4 projects, 2 labels, 1 filter) to "Work" (6 projects, no labels, no filters)
- **THEN** the Projects group lists Work's six projects, no Labels or Views group is shown, the Favourites group shows Work's pinned items or nothing, and Inbox and Today show Work's counts

#### Scenario: Only two numbers at rest
- **WHEN** the same user has 8 Inbox tasks, 10 due today, projects with open tasks, labels in use and saved views with matches, and nothing is hovered or focused
- **THEN** the only visible counts in the sidebar are "8" on Inbox and "10" on Today (plus the item counts on the closed Labels and Views headers), and the Upcoming row shows no number

#### Scenario: Labels are reachable
- **WHEN** the user has forty projects and three labels
- **THEN** scrolling the middle part of the sidebar reaches the Labels group, and nothing inside it scrolls separately

#### Scenario: Promote a destination
- **WHEN** the user turns on "Show in sidebar" for Someday in Settings → Appearance
- **THEN** Someday appears among the primary destinations on every device of that user after sync, and leaves the More group

#### Scenario: Collapse a group
- **WHEN** the user has six saved views and collapses the Views group, then reloads the app on the same device
- **THEN** the Views header reads "Views 6" with no rows under it, and on the user's other devices the Views group keeps its own state

#### Scenario: Stored state wins over the default
- **WHEN** the user opened the Labels group on this device before this version, so the device stores it as open, and the app is updated
- **THEN** the Labels group is still open on this device, and a device that never stored a state shows it closed

#### Scenario: Two groups closed
- **WHEN** the user collapses Views and Labels
- **THEN** the Projects group has the whole height of the scroller, and its "All" and add actions still work on the collapsed groups' headers

#### Scenario: More open on a phone
- **WHEN** a user with 25 projects opens the drawer on a 390×640 phone, opens More and swipes up on the drawer
- **THEN** the drawer's scroller, which holds More and the groups below it, scrolls and reaches the last project, the workspace control, the primary destinations and the footer stay in place, and the page behind the drawer does not move

#### Scenario: More on a desktop
- **WHEN** a user on a 1280×600 screen with a mouse selects More
- **THEN** a menu lists the More destinations below the row, the projects keep their place in the scroller, choosing Someday opens it and closes the menu, and the More row is marked current while Someday is open

#### Scenario: No empty groups
- **WHEN** a new account with no saved view and no label opens the app
- **THEN** the sidebar shows no Views or Labels group and no placeholder sentence, and saving a first view brings the Views group back, closed, with its All action and "Views 1" on its header

#### Scenario: Favourites first
- **WHEN** the user has pinned a project, a label and a saved view
- **THEN** the Favourites group is the first group of the scroller, above Projects, the pinned project, label and view show no count, and the Labels and Views groups are collapsed on a device that never stored a group state

#### Scenario: Open Loops first sidebar
- **WHEN** a user picks Open Loops first and opens the app on a 1280×800 screen
- **THEN** the primary destinations are Loop home, Inbox, Today, Next, Waiting and Review in that order, Upcoming and Calendar are in the More group, the workspace control sits above them without counting as a seventh, and the Review entry carries its rhythm marker as a dot

#### Scenario: Promotions kept across modes
- **WHEN** a user who promoted Someday switches to Open Loops first and later back to Companion
- **THEN** Someday is in the More group while in Open Loops first, and is a primary destination again after switching back, on every device after sync

#### Scenario: Unread in another workspace
- **WHEN** the user is in "Personal" and a shared project in "Work" receives activity the user has not seen
- **THEN** the workspace control shows one accent dot, its tooltip reads "Updates in Work", and the dot leaves once the user has seen the updates

#### Scenario: Locations in More
- **WHEN** the user opens the More group, in any "How you work" mode
- **THEN** Locations is listed after Updates and before Trash, and it is never a primary destination

#### Scenario: Rules in More
- **WHEN** the user opens the More group, in any "How you work" mode
- **THEN** Rules (OpenSpec `automation-rules`) is listed after Locations and before Trash, and it is never a primary destination

### Requirement: Compact sidebar on a desktop
From 768 px the sidebar footer SHALL be one row: the account control (the person's avatar and name, truncated when the row is narrow) that opens the account menu, then, as icon buttons each with its name as tooltip and accessible name, the assistant launcher when the assistant is available, notifications, the sync dot and, while the sidebar is the collapsed rail, an Expand control (the page header's sidebar toggle collapses it). The account menu SHALL offer Settings, Help and Keyboard shortcuts, each with its registered shortcut shown, and after a separator Sign out, which opens the same confirmation as Settings → Account. Below 768 px the footer SHALL be the same row with touch-height targets. With a fine pointer, sidebar rows SHALL be 32 px high and group headings tighter; with a coarse pointer rows keep their touch height. The sidebar's scroller SHALL have a thin scrollbar in the theme's border colour, stronger while the pointer or focus is inside it, and SHALL fade its top or bottom edge only while content is hidden past that edge, leaving the scrollbar itself unfaded.

#### Scenario: Short desktop window
- **WHEN** a user with twelve projects opens the app in a 1280×600 window with a mouse
- **THEN** at least eight projects are visible in the sidebar without scrolling, the footer takes one row, and the bottom edge of the scroller fades while projects are hidden below it

#### Scenario: Footer names
- **WHEN** a screen reader user moves through the footer row on a desktop
- **THEN** each control announces its name (the person's name as the account menu button, Notifications with its unread count, the sync status), and the account menu's items announce Settings, Help, Keyboard shortcuts and Sign out with their shortcuts as descriptions

#### Scenario: Help from the account menu
- **WHEN** the user opens the account menu and chooses Help, then later presses `g` then `?` from the Inbox
- **THEN** the Help page opens both times, the account control is marked current while Help, Settings or Import is open, and the page header's Help action and the command palette's "Open Help" still open it too

#### Scenario: Sign out from the sidebar
- **WHEN** the user chooses Sign out in the account menu
- **THEN** the "Sign out of this device?" confirmation opens with focus on Cancel, Escape returns focus to the account control, and confirming proceeds exactly as from Settings → Account

#### Scenario: Narrow sidebar
- **WHEN** the sidebar is at its minimum width of 15 rem and the account name is "Alexandra Konstantinopoulou"
- **THEN** the name truncates with an ellipsis, every icon button of the row stays visible and at least 32 × 32 px, and nothing wraps to a second row

#### Scenario: Touch keeps its targets
- **WHEN** the sidebar is shown on a 768 px touch screen
- **THEN** More is the inline group, rows keep their touch height, the footer is one row, and every control in the sidebar is at least 44 × 44 px

### Requirement: Sidebar tones
Sidebar rows SHALL use three tones. An inactive row and its icon SHALL use the quiet text tone (the step below `muted` in the tone scale); while hovered or focused the row SHALL raise its label and icon to the default text tone over the sunken surface; the active row SHALL be a pill on the neutral selected surface with the strong text tone, its icon in the same tone and its count in the muted tone (precision-shell D5: colour is kept for state). Group headers SHALL use the quiet tone at the hint size, uppercase. Counts SHALL use the quiet tone and tabular figures. Every tone on every sidebar surface SHALL meet 4.5:1 for text and 3:1 for icons, measured by the token contrast test in both themes, on the sidebar surface and the selected surface. The tones are tokens, so a theme or accent change switches them without a reload.

#### Scenario: Three tones in one list
- **WHEN** Today is open and the pointer rests on Upcoming
- **THEN** Today is a pill on the selected surface with strong text and icon, Upcoming shows default-tone text and icon on the sunken surface, and every other row shows quiet-tone text and icons

#### Scenario: Contrast on the tinted sidebar
- **WHEN** the token contrast test runs
- **THEN** it measures the quiet, default and strong text tones against the sidebar surface token, and the default, strong and muted tones against the selected surface, in light, dark and high contrast, and fails naming the pair when one is under its minimum

#### Scenario: Keyboard shows the raised tone
- **WHEN** a keyboard user presses Tab onto a project row
- **THEN** the row shows the default tone and the focus ring, exactly as on hover

### Requirement: Favourites group
The Favourites group SHALL list the user's pinned projects, labels and saved filters in the user's order, each with the icon or colour, opening the same destination, and none shows a count. Items SHALL be reorderable from their menus and by keyboard, and unpinnable from their menus. The group SHALL reflect pins, order and renames from the user's other devices after sync, and SHALL render from local data so it is correct offline.

#### Scenario: Mixed kinds in order
- **WHEN** the user pins "Website launch" (project, 5 open), "Deep work" (filter, 4 matches) and "errand" (label, 3 open) and moves "Deep work" to the top
- **THEN** the group reads "Deep work", "Website launch", "errand" on this device now and on other devices after sync, and each row opens its view

#### Scenario: Pinned item removed
- **WHEN** a pinned project is archived or deleted on another device and this device syncs
- **THEN** it leaves the Favourites group without a reload and reappears if it is restored

#### Scenario: Pinned offline
- **WHEN** the device is offline and the user pins a label
- **THEN** it appears in Favourites at once, survives a reload, and reaches the user's other devices when the network returns

### Requirement: Quiet markers in the sidebar
State in the sidebar SHALL be marked with one language: a small dot in the accent colour, with the meaning in the element's tooltip and accessible name, never a filled or coloured badge with text. The rhythm marker on the Review entry SHALL be such a dot. The danger colour SHALL be reserved for errors. Markers are derived from local data, so they are correct offline and follow every sync; nothing is written for them.

#### Scenario: More on a desktop
- **WHEN** a user with a mouse on a 1280 px screen has a weekly review nine days overdue in Companion mode
- **THEN** the More row shows "MORE" with a chevron and no dot, opening it lists the destinations with a dot on Review whose accessible description reads "Review due · last weekly review 9 days ago", and the Updates item carries its unread badge

#### Scenario: Count on hover
- **WHEN** the user moves the pointer over "Website launch" (5 open tasks) in the Projects group
- **THEN** no number appears on the row, and a screen reader reads the row as "Website launch"

#### Scenario: Error marks stay
- **WHEN** a saved filter's query no longer parses and sync fails
- **THEN** the filter row keeps its error mark with the message in its accessible name, and the sync dot turns to the danger colour with "Sync error" beside it
