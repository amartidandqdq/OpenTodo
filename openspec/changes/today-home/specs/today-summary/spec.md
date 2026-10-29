## ADDED Requirements

### Requirement: The Today page opens with a one-line summary
Under the Today title SHALL be one computed line of the day, with no AI and no stored value: how many things are chosen for today (My day's threads and tasks), the next timed task due today whose time has not passed, shown as its time and title, and how many open tasks are in Today's Earlier group, or that there are none. A part with nothing to say SHALL be left out, except the earlier part, which reads "nothing earlier" when there are none. The line SHALL be built from the local rows, so it is correct offline and follows every sync. It SHALL say "earlier", never "overdue" or "late". Nothing is written for it.

#### Scenario: Chosen work, an appointment and nothing earlier
- **WHEN** three tasks are in My day, a task due today at 14:30 has not passed, and no open task is due before today
- **THEN** the line reads "3 chosen for today · next appointment 14:30 Dentist · nothing earlier"

#### Scenario: Empty parts are left out
- **WHEN** nothing is chosen for today and no task has a time today, and two open tasks are earlier
- **THEN** the line reads "2 earlier" alone

#### Scenario: A passed appointment
- **WHEN** the only timed task due today was at 09:00 and it is 12:00
- **THEN** no appointment part is shown
