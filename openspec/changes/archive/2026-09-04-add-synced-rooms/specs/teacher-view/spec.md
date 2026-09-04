## Purpose

The half of the lesson only the teacher sees: what to say next, what the answer is, and the
controls that steer the session. It is the reason two links beat one shared screen — the
student's view stays a clean exercise while the teacher's carries everything needed to
teach it.

## ADDED Requirements

### Requirement: The student's screen carries the exercise and nothing else

The student's view SHALL show the exercise, its instruction and the lesson's progress, and
SHALL NOT show answer keys, teacher controls, room administration or any indication of what
the teacher can do.

#### Scenario: No teacher affordance leaks
- **WHEN** the student's view is shown for an exercise whose answers the teacher can see
- **THEN** nothing on the student's screen reveals the answers, and no control that only
  the teacher may use is present

### Requirement: The teacher steers the session

The teacher's view SHALL provide, alongside the exercise, the means to move between
exercises, to reset the exercise on screen, to change the room's lesson, and to obtain the
student's link again at any time.

#### Scenario: Restarting an exercise that went wrong
- **WHEN** the teacher resets the exercise on screen
- **THEN** it returns to its start with a fresh presentation order on both screens, and
  every other exercise keeps its progress

#### Scenario: Getting the link back
- **WHEN** the teacher asks for the student's link after having sent it
- **THEN** the same link is offered again, without creating a second room

### Requirement: The teacher can make the student's view read-only

The teacher SHALL be able to lock and unlock the student's ability to act. While locked,
the student SHALL continue to see everything the room shows and SHALL be told plainly that
it is the teacher's turn, and their taps SHALL change nothing on either screen. Locking
SHALL NOT restrict the teacher.

#### Scenario: A child running ahead
- **WHEN** the teacher locks student input and the student taps a card
- **THEN** neither screen changes and the student sees that it is the teacher's turn

#### Scenario: Handing control back
- **WHEN** the teacher unlocks student input
- **THEN** the student's next tap takes effect on both screens

#### Scenario: The lock does not lock the teacher
- **WHEN** student input is locked
- **THEN** the teacher can still act on every exercise as normal

### Requirement: The teacher sees the answer to the exercise on screen

The teacher's view SHALL show the answer to the current exercise, derived from the lesson's
own data rather than from anything a lesson author writes by hand: which items pair with
which, which bucket each item belongs in, which word is being asked, and the sentence a
scaffold level produces for the selected item. An exercise with nothing to be right about
SHALL show no key rather than an empty one.

#### Scenario: The key for a matching exercise
- **WHEN** a matching exercise is on screen in the teacher's view
- **THEN** the teacher sees which item on one side belongs with which on the other

#### Scenario: The key for a listening exercise
- **WHEN** a listening exercise is on screen
- **THEN** the teacher sees which picture the word currently being spoken names

#### Scenario: An exercise with no answer
- **WHEN** a physical-response exercise, which scores nothing, is on screen
- **THEN** no answer key is shown and the space is not left empty-looking

#### Scenario: A lesson file gains no new field
- **WHEN** a lesson that predates the teacher's view is opened in it
- **THEN** its answer keys are complete, having been computed from the vocabulary and the
  exercise's own settings

### Requirement: The teacher knows whether the student is there

The teacher's view SHALL show at all times whether a student is connected to the room and
whether the teacher's own connection is healthy.

#### Scenario: The student joins
- **WHEN** the student opens their link
- **THEN** the teacher's view shows that the student is present

#### Scenario: The student drops out
- **WHEN** the student's connection is lost
- **THEN** the teacher's view shows the student as absent rather than continuing to claim
  they are there

### Requirement: The teacher's extra surface does not crowd out the exercise

On a window as narrow as the student's, the teacher's controls and answer key SHALL remain
reachable without covering the exercise or forcing the page to scroll sideways, and SHALL
be dismissible so the teacher can see the exercise as the student sees it.

#### Scenario: The teacher on a narrow window
- **WHEN** the teacher's view is shown in a 380-pixel-wide viewport
- **THEN** the exercise remains fully visible and usable, controls do not overlap it, and
  the page does not scroll sideways

#### Scenario: Seeing what the student sees
- **WHEN** the teacher dismisses the extra surface
- **THEN** the exercise is shown as the student has it, and the surface can be brought back
