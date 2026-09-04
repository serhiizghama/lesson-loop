## MODIFIED Requirements

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
