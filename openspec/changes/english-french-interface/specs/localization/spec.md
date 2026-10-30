## MODIFIED Requirements

### Requirement: Interface language preference
Each user SHALL have an interface language preference whose value is `system` or the code of a shipped language. It SHALL default to `system`, which means the first of the browser's preferred languages that is shipped, else English. A client SHALL treat an unknown or missing value as `system` and SHALL leave the stored value unchanged.

#### Scenario: New account on a German browser
- **WHEN** a new account prefers only `de-CH`, which this fork does not ship
- **THEN** the interface is shown in English

#### Scenario: New account on a French browser
- **WHEN** a user whose browser prefers `fr-CH` opens the app without ever choosing a language
- **THEN** the interface is shown in French

#### Scenario: Browser language not shipped
- **WHEN** the browser prefers only Japanese
- **THEN** the interface is shown in English and no error is shown

#### Scenario: Unknown value from a newer client
- **WHEN** a device receives a language code it does not ship
- **THEN** it behaves as `system` and keeps the stored value unchanged

### Requirement: Language is personal, synced and offline
The preference SHALL be written as an operation on the user's personal data, so it applies on every device of that user and never on another user's, SHALL be editable offline and take effect at once on the editing device, SHALL converge by last-writer-wins, and SHALL be part of the JSON export like the date and time preferences.

#### Scenario: Change on one device
- **WHEN** the user sets the language to French on a laptop and a phone later syncs
- **THEN** the phone's interface switches to French without a reload

#### Scenario: Change offline
- **WHEN** the installed app is offline and the user picks French
- **THEN** the interface switches to French immediately and the change reaches the other devices on the next sync

#### Scenario: Concurrent edits
- **WHEN** device A picks French and device B picks English, both offline, and both sync
- **THEN** every device ends with the value written with the greater timestamp

#### Scenario: Not shared with project members
- **WHEN** a user who shares a project picks French
- **THEN** the other member's devices keep their own language

### Requirement: Interface text follows the language
Every text the client renders SHALL come from the active language: views, menus, dialogs, Settings, toasts, the shortcut overlay, placeholders, tooltips, screen-reader labels and names, relative date words, and the wording of activity and history entries. A message missing from the active catalog SHALL be shown in English. User-written content (titles, notes, comments, names) is never translated.

#### Scenario: Task list in German
- **WHEN** an older device stored German and the browser prefers only German
- **THEN** this fork shows the task list in English and preserves the stored preference and task content

#### Scenario: Task list in French
- **WHEN** the language is French and the user opens Today with an overdue task
- **THEN** the headings, the row's due label, the quick-add placeholder and the row menu are in French, and the task's title is as written

#### Scenario: Assistive technology
- **WHEN** a screen reader user in French moves over an icon-only button
- **THEN** its accessible name is announced in French

#### Scenario: Missing message
- **WHEN** a message has no entry in the active catalog
- **THEN** the English text is shown in its place and the rest of the screen stays translated

### Requirement: Plural and number forms follow the language
Messages with a count SHALL use the active language's plural categories, and counts SHALL be written with the language's digit grouping. Dates follow `date-time-preferences`.

#### Scenario: Singular and plural
- **WHEN** the language is French and a proposal has 1 change, then 2 changes
- **THEN** the texts read `1 modification` and `2 modifications`

#### Scenario: Grouped count
- **WHEN** the language is French and a search placeholder names 10000 tasks
- **THEN** the number is written as `10 000`

### Requirement: Document language
The document's `lang` attribute SHALL name the active language at first paint and whenever it changes, so browsers, screen readers and spell checkers use the right rules. The `dir` attribute SHALL NOT be changed by this capability.

#### Scenario: Screen reader voice
- **WHEN** the language is French and the page loads
- **THEN** the root element's `lang` is `fr` before the first screen is shown

#### Scenario: Change without reload
- **WHEN** the user switches from French to English
- **THEN** the root element's `lang` becomes `en` at once

### Requirement: Server errors translated by code
When the server answers with its error envelope, the client SHALL show a translated message for every error code it knows and the server's own message verbatim for a code it does not know. Server messages are English and are not changed by this capability.

#### Scenario: Known code
- **WHEN** the language is English and sign-in fails with code `invalid_credentials`
- **THEN** the form shows the English message for that code

#### Scenario: Unknown code
- **WHEN** a newer server answers with a code the client does not know
- **THEN** the client shows the server's message as received

### Requirement: Shipped languages and their catalogs
English and French SHALL be maintained in the repository and SHALL be complete in every release. A language SHALL be offered in Settings only when its catalog is complete. Shipped catalogs SHALL be written and reviewed by people; machine translation SHALL NOT be used for a shipped catalog. A community language follows the same rule.

#### Scenario: Complete languages offered
- **WHEN** the user opens the Language panel
- **THEN** the two shipped languages are listed, each in its own name

#### Scenario: Work-in-progress catalog
- **WHEN** a catalog in the repository is incomplete
- **THEN** it is not offered in Settings and the release check reports its missing messages

### Requirement: Translation checks
The project's checks SHALL fail when a new user-facing string in the web app is not routed through the message layer (naming the file and line, with an allow-list for proper nouns, codes and samples), when a shipped catalog misses a message or holds one no longer used, when a message is malformed, or when a translation's placeholders differ from the source. The untranslated-string check SHALL also catch a prop value that reads as a phrase without any two-letter word (such as a placeholder "e.g. 45m, 1h30") and text assembled in a template literal under an object key a view shows (such as a group's `note`).

#### Scenario: Untranslated string
- **WHEN** a change adds a button labelled with a bare literal
- **THEN** the check fails and names the file and line

#### Scenario: Missing translation
- **WHEN** a change adds a message without its French entry
- **THEN** the catalog check fails and names the message and the language

#### Scenario: Placeholder mismatch
- **WHEN** a French entry drops the `{name}` placeholder of its source message
- **THEN** the catalog check fails and names the entry

#### Scenario: Assembled group note
- **WHEN** a change builds a list group's note as `${n} done`
- **THEN** the check fails and names the file and line

