## MODIFIED Requirements

### Requirement: Progress is visible throughout

The player SHALL show overall lesson progress at all times as one mark per exercise, in
lesson order. Each mark SHALL show whether its exercise is complete, and the mark of the
exercise on screen SHALL be distinguishable from the others. Progress SHALL be derived
from which exercises are complete and from nothing else, and SHALL update the moment an
exercise completes. The closing screen is a slide rather than an exercise and SHALL have
no mark. The marks SHALL be the same on every screen showing the same lesson state.

#### Scenario: Progress advances on completion
- **WHEN** the learner completes an exercise in a lesson of five
- **THEN** the mark for that exercise shows it complete and the other four marks are
  unchanged

#### Scenario: The current mark follows the exercise on screen
- **WHEN** the lesson moves from the second exercise to the third
- **THEN** the third mark is shown as current and the second no longer is

#### Scenario: The closing screen has no mark
- **WHEN** a lesson of eight exercises and a closing screen is shown
- **THEN** exactly eight marks are shown, and none of them is current while the closing
  screen is on screen

#### Scenario: A reset returns the mark to open
- **WHEN** a complete exercise is reset and then completed again
- **THEN** its mark shows open after the reset and complete after the second completion

#### Scenario: Both screens show one trail
- **WHEN** the teacher and the student look at a shared lesson in which three exercises
  are complete
- **THEN** both screens show the same three marks as complete and the same mark as
  current

### Requirement: Completing a lesson is celebrated

When the closing screen is reached, the player SHALL show one star per exercise, gold
where the exercise is complete and unfilled where it is not, and the number of gold stars
SHALL be the number of complete exercises rather than a fixed count. The stars SHALL
arrive one after another, each with a note, followed by a visible burst, and the lesson's
closing message SHALL then be spoken. Leaving the closing screen SHALL stop whatever of
this is still playing.

#### Scenario: Finishing the last exercise
- **WHEN** the final incomplete exercise is completed
- **THEN** the closing screen is reachable and reports the lesson as finished

#### Scenario: Stars are earned, not given
- **WHEN** the closing screen is reached with one of eight exercises still incomplete
- **THEN** seven stars are gold and one is unfilled, and no star is gold for an exercise
  that is not complete

#### Scenario: The stars come in one at a time
- **WHEN** the closing screen is reached with five complete exercises
- **THEN** five gold stars appear in sequence, a note sounds with each, a burst follows
  the last, and the closing message is spoken after the burst

#### Scenario: Leaving the closing screen early
- **WHEN** the teacher moves back to an exercise while the stars are still arriving
- **THEN** the arrival stops, nothing further is spoken for the closing screen, and the
  exercise is shown as it was left

## ADDED Requirements

### Requirement: Completing an exercise is marked the moment it happens

When the exercise on screen becomes complete, the player SHALL mark it at once on every
screen showing it: its mark in the progress is earned with a visible flourish that
connects the exercise to its mark, a short sound plays, a brief celebration appears over
the exercise, and a word of praise is spoken. The moment SHALL last about a second and a
half. It SHALL NOT block, hide or disable the exercise, SHALL NOT move the lesson on, and
SHALL be the same on the teacher's screen and the student's. Praise SHALL follow any line
the exercise itself speaks for the completing tap rather than interrupting it, and both
screens SHALL speak the same phrase. The moment SHALL belong to the player: no exercise
type needs to know it exists, and an exercise that becomes complete while it is not on
screen SHALL earn its mark quietly.

#### Scenario: The last pair
- **WHEN** the learner makes the last pair of a matching exercise
- **THEN** within the same second the mark for that exercise is earned with a flourish, a
  sound plays, a celebration appears over the exercise, and the exercise stays on screen

#### Scenario: Praise after the exercise's own line
- **WHEN** the completing tap is one for which the exercise speaks a line, such as the
  sound an animal makes
- **THEN** that line is heard through to its end and the praise is heard after it

#### Scenario: Completed by the other participant
- **WHEN** the student makes the last pair in a shared lesson
- **THEN** the teacher's screen plays the same moment, with the same praise, without the
  teacher acting

#### Scenario: Joining a lesson already under way
- **WHEN** a screen joins a shared lesson in which three exercises are already complete
- **THEN** their marks are shown as earned and no moment plays for any of them

#### Scenario: Completing again after a reset
- **WHEN** a complete exercise is reset and completed a second time
- **THEN** the moment plays again in full

#### Scenario: A completion the screen was not looking at
- **WHEN** an exercise other than the one on screen becomes complete, such as when a
  screen catches up after losing its connection
- **THEN** its mark is earned and no moment plays

#### Scenario: Without sound or speech
- **WHEN** the device cannot play sound or cannot speak
- **THEN** the visible part of the moment plays unchanged and the lesson is unaffected

#### Scenario: Reduced motion
- **WHEN** the device asks for reduced motion
- **THEN** the mark is earned, the sound plays and the praise is spoken, and the moving
  parts of the moment settle at once instead of animating

### Requirement: The way forward draws attention once the exercise is done

On a screen that steers the lesson, every control that moves to the next exercise SHALL
draw attention while the exercise on screen is complete and there is a next exercise or
the closing screen to move to. It SHALL stop drawing attention once the lesson moves on.
It SHALL NOT move the lesson on by itself, and a screen that does not steer the lesson
SHALL show nothing for it.

#### Scenario: The teacher sees it is time
- **WHEN** the exercise on the teacher's screen becomes complete
- **THEN** her next controls draw attention until she moves the lesson on

#### Scenario: Nothing on the student's screen
- **WHEN** the same exercise completes on the student's screen
- **THEN** no control appears there and nothing draws attention to moving on

#### Scenario: A lesson played alone
- **WHEN** a learner playing alone completes the exercise on screen
- **THEN** their own next control draws attention, exactly as the teacher's does

#### Scenario: Already complete on arrival
- **WHEN** the teacher moves back to an exercise that was completed earlier
- **THEN** her next controls draw attention, because the exercise on screen is complete
