## MODIFIED Requirements

### Requirement: Navigation is free in both directions and preserves work

The learner SHALL be able to move to the next or the previous exercise at any time,
regardless of whether the current one is complete, except while a teacher has locked their
input. Returning to an exercise SHALL restore it exactly as it was left.

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

### Requirement: The player works with no network at all

A lesson played alone SHALL be startable, playable and completable with no network request
after the application has loaded. Where a lesson is shared between two devices, the
connection SHALL carry only what the two screens need to agree: no exercise SHALL depend on
a remote service in order to function, and every exercise SHALL remain completable while
the connection is down.

#### Scenario: Playing offline
- **WHEN** the network is unavailable after the page has loaded
- **THEN** every exercise in the lesson behaves normally from first tap to closing screen

#### Scenario: A shared lesson when the connection dies
- **WHEN** the connection is lost partway through a shared lesson
- **THEN** every remaining exercise still behaves normally through to the closing screen on
  each device that has it
