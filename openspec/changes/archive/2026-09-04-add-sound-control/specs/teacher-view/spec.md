## ADDED Requirements

### Requirement: The teacher decides whether the app speaks

In a shared lesson the teacher SHALL be able to turn the app's spoken output off and on,
and that decision SHALL apply to both screens. It exists because the teacher is the voice
of a live lesson: she models the words herself, and a synthesised voice repeating them on
two devices talks over her.

The control SHALL sit among the teacher's other lesson controls, alongside the one that
locks the student, SHALL show which of the two states is in force, and SHALL remain usable
on a window as narrow as the student's. Sound SHALL start on. There SHALL be exactly one
such control on a screen, so the teacher is never offered two switches for one setting.

The setting SHALL belong to the teacher alone. A student SHALL have no control for it and
SHALL NOT be able to change it by any route the page or the connection allows. A
participant who joins after it has been changed SHALL inherit it, it SHALL survive either
participant reloading, and it SHALL survive the teacher changing the room's lesson.

It SHALL be independent of the lock: turning sound off SHALL NOT restrict what the student
may tap, and locking the student SHALL NOT change whether the app speaks.

#### Scenario: Quieting the app mid-exercise
- **WHEN** the teacher turns sound off while a lesson is in progress
- **THEN** neither screen speaks unasked from that moment, and everything else about both
  screens is unchanged

#### Scenario: Bringing the voice back for one exercise
- **WHEN** the teacher turns sound on while a listening exercise is on screen
- **THEN** the word being asked is spoken on both screens without either of them being
  tapped

#### Scenario: The setting is not the student's
- **WHEN** a request to change the setting arrives from a student, by any route the page or
  the connection allows
- **THEN** it is refused and neither screen changes

#### Scenario: No control leaks onto the student's screen
- **WHEN** the student's view is shown with sound turned off
- **THEN** there is nothing on it that turns sound on or off, and nothing that reveals the
  teacher has such a control

#### Scenario: A student who joins after it was turned off
- **WHEN** the teacher turns sound off and a student then opens their link
- **THEN** the student's screen does not speak unasked either

#### Scenario: Surviving a reload
- **WHEN** the teacher turns sound off and then reloads her tab
- **THEN** sound is still off, on both screens

#### Scenario: Surviving a change of lesson
- **WHEN** sound is off and the teacher changes the room to another lesson
- **THEN** the new lesson starts with sound still off

#### Scenario: The setting is not the lock
- **WHEN** sound is off and the student has not been locked
- **THEN** the student can still tap the exercise as normal, and locking or unlocking them
  changes nothing about whether the app speaks

#### Scenario: Where the teacher looks for it
- **WHEN** the teacher's view is shown
- **THEN** the control sits beside the one that locks the student, labelled with which
  state the lesson is in, and it is the only such control on the screen

#### Scenario: Usable on a narrow window
- **WHEN** the teacher's view is shown in a 380-pixel-wide viewport
- **THEN** the control is reachable and usable, and the page does not scroll sideways
