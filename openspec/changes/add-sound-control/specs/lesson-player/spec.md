## ADDED Requirements

### Requirement: A lesson played alone can be told to be quiet

A lesson opened on its own SHALL carry the same control over the app's spoken output that a
teacher has in a room, for the one person playing it. Sound SHALL start on, and the control
SHALL show which of the two states is in force.

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
