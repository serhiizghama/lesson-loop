# lesson-player Specification

## Purpose

The shell that runs a lesson from start to finish: which exercise is on screen, how the
learner moves between them, how much is done, and the closing celebration. It is also the
guarantee that a lesson never depends on the network to be usable.

## Requirements

### Requirement: A lesson plays as an ordered sequence of exercises

The player SHALL show exactly one exercise at a time, in the order the lesson declares,
and SHALL make it plain which exercise is showing and how many there are.

#### Scenario: Opening a lesson
- **WHEN** a lesson is opened
- **THEN** its first exercise is shown, along with an indication of position within the
  lesson

### Requirement: Navigation is free in both directions and preserves work

A learner playing a lesson on their own SHALL be able to move to the next or the previous
exercise at any time, regardless of whether the current one is complete. In a shared
lesson, moving between exercises SHALL belong to the teacher, and a student SHALL have no
means of moving between them. Returning to an exercise SHALL restore it exactly as it was
left, whoever moved.

#### Scenario: Skipping ahead and coming back
- **WHEN** the learner leaves a half-finished matching exercise, moves forward, and comes
  back
- **THEN** the pairs already made are still made and the shuffled order is unchanged

#### Scenario: Moving on from an unfinished exercise
- **WHEN** the learner advances from an incomplete exercise
- **THEN** the next exercise is shown and no warning blocks the move

#### Scenario: Navigation while locked
- **WHEN** a learner whose input a teacher has locked tries to move to another exercise
- **THEN** the lesson stays on the exercise the room is showing

#### Scenario: A lesson opened alone keeps every control
- **WHEN** a lesson is opened from the home screen
- **THEN** the learner can move in both directions and reset an exercise as before

#### Scenario: The student in a shared lesson does not navigate
- **WHEN** a student in a shared lesson wants the next exercise
- **THEN** the lesson stays where the room is showing until the teacher moves it

### Requirement: Progress is visible throughout

The player SHALL show overall lesson progress at all times, derived from how many
exercises are complete, and SHALL update it the moment an exercise completes.

#### Scenario: Progress advances on completion
- **WHEN** the learner completes an exercise in a lesson of five
- **THEN** the visible progress increases accordingly

### Requirement: Completing a lesson is celebrated

When every exercise in a lesson is complete, the player SHALL show a closing screen that
marks the achievement.

#### Scenario: Finishing the last exercise
- **WHEN** the final incomplete exercise is completed
- **THEN** the closing screen is reachable and reports the lesson as finished

### Requirement: An exercise can be reset without disturbing the lesson

Resetting an exercise SHALL return it to its initial state, including a freshly decided
presentation order, and SHALL leave every other exercise's progress untouched.

#### Scenario: Resetting one exercise
- **WHEN** an exercise is reset in a lesson where two others are already complete
- **THEN** that exercise is empty again and the two completed ones remain complete

### Requirement: A lesson played alone can be told to be quiet

A lesson opened on its own SHALL carry the same control over the app's spoken output that a
teacher has in a room, for the one person playing it. Because such a lesson has none of the
teacher's extra surface, the control SHALL be present on the lesson itself. Sound SHALL
start on, and the control SHALL show which of the two states is in force.

The setting SHALL be local to that lesson: it reaches no network, and opening the lesson
again starts it on, since nothing about a lesson played alone is stored between visits.

#### Scenario: Silencing a lesson opened from the home screen
- **WHEN** a lesson is opened from the home screen and its sound is turned off
- **THEN** the exercises stop speaking unasked, and every one of them stays playable and
  completable

#### Scenario: No network is needed to be quiet
- **WHEN** the network is unavailable after the application has loaded and sound is turned
  off and on again
- **THEN** both take effect immediately and no request is made

#### Scenario: Inviting a student from a quieted lesson
- **WHEN** sound has been turned off in a lesson played alone and the teacher then invites
  a student
- **THEN** the room opens with sound on, and the teacher turns it off there if she wants
  it off for the lesson she is about to teach

### Requirement: The player works with no network at all

A lesson played alone SHALL be startable, playable and completable with no network request
after the application has loaded. Where a lesson is shared between two devices, the
connection SHALL carry only what the two screens need to agree: no exercise SHALL depend on
a remote service in order to function, and the exercise on screen SHALL remain fully
playable and completable while the connection is down. Because the teacher paces a shared
lesson, a student SHALL NOT be expected to reach the rest of the lesson while the
connection is gone; the teacher, who steers, SHALL be able to.

#### Scenario: Playing offline
- **WHEN** the network is unavailable after the page has loaded
- **THEN** every exercise in the lesson behaves normally from first tap to closing screen

#### Scenario: A shared lesson when the connection dies
- **WHEN** the connection is lost partway through a shared lesson
- **THEN** the exercise on screen stays fully usable and completable on both devices, and
  neither screen is blanked or blocked

#### Scenario: The teacher carries on through the outage
- **WHEN** the connection is lost and the teacher moves through the remaining exercises
- **THEN** her own screen plays them normally through to the closing screen

#### Scenario: The student waits for the room rather than walking on
- **WHEN** the connection is lost and the student finishes the exercise on screen
- **THEN** they are not offered the next one, and the lesson resumes together once the
  connection returns

### Requirement: The layout serves a narrow window on a tablet

The player SHALL be usable in a window as narrow as 380 logical pixels without horizontal
scrolling or overlapping controls, because the learner most often has it beside a video
call.

#### Scenario: A narrow window
- **WHEN** the player is shown in a 380-pixel-wide viewport
- **THEN** all controls remain reachable, nothing overlaps, and the page does not scroll
  sideways
