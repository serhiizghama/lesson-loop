## Purpose

Lets a teacher and a student hold one lesson between two devices: either of them taps and
both screens follow, without either device being the special one. It also defines what
happens when the connection is not there — which, in a lesson with a child waiting, matters
more than the synchronisation itself.

## ADDED Requirements

### Requirement: A room is opened deliberately, never imposed

Opening a lesson SHALL NOT create a room or contact the network. A room SHALL come into
being only when a participant explicitly asks for one, and SHALL yield a link that can be
handed to the other participant.

#### Scenario: Playing alone stays local
- **WHEN** a lesson is opened from the home screen and played to the end
- **THEN** no room exists and no request leaves the device

#### Scenario: Asking for a room mid-lesson
- **WHEN** the teacher asks to invite a student while a lesson is in progress
- **THEN** a room is created carrying the lesson exactly as it stands, progress included,
  and a link for the student is offered for copying

### Requirement: Two links carry two roles

A room SHALL be reachable through two distinct links: one that opens the teacher's view
and one that opens the student's view. Holding the student's link SHALL NOT grant the
teacher's view by any means available on the page.

#### Scenario: The student link opens the student view
- **WHEN** the student's link is opened
- **THEN** the exercise is shown without any teacher control or answer key

#### Scenario: The two links address the same room
- **WHEN** both links are opened on separate devices
- **THEN** both show the same lesson at the same exercise

### Requirement: Every action by either participant reaches the other

Any action that changes lesson state — revealing a card, attempting a pair, placing an
item, choosing a scaffold level, advancing a prompt, moving between exercises, resetting an
exercise — SHALL be applied on both participants' screens, whichever of them performed it.

#### Scenario: The student acts and the teacher sees it
- **WHEN** the student makes a correct pair
- **THEN** the teacher's screen shows that pair as made, without the teacher acting

#### Scenario: The teacher navigates and the student follows
- **WHEN** the teacher moves to the next exercise
- **THEN** the student's screen shows that exercise

#### Scenario: Both are looking at one shuffle
- **WHEN** a shuffled exercise is reached in a room
- **THEN** both screens present its items in the same order

### Requirement: A tap responds locally without waiting for the room

A participant's own action SHALL be reflected on their screen immediately, without waiting
for a round trip. Where the room's account of the state differs from the device's, the
room's account SHALL win and the device SHALL adopt it.

#### Scenario: No lag on one's own tap
- **WHEN** a participant taps a card on a slow connection
- **THEN** the card reveals at once rather than after the room answers

#### Scenario: Divergence is settled in the room's favour
- **WHEN** a device's state disagrees with the room's after two participants act at the
  same moment
- **THEN** the device adopts the room's state and both screens end up identical

### Requirement: Joining mid-lesson lands on the current screen

A participant opening a room already in progress SHALL be shown the exercise currently in
play, with all progress made so far, without the other participant doing anything.

#### Scenario: The student arrives late
- **WHEN** the student opens their link after the teacher has completed two exercises and
  is partway through a third
- **THEN** the student sees the third exercise in its current state, and the two completed
  exercises count as complete

#### Scenario: Rejoining after closing the tab
- **WHEN** a participant closes the page and opens the same link again
- **THEN** the lesson resumes where it stands, not from the beginning

### Requirement: A room outlives any one lesson

A room SHALL NOT be bound to the lesson it was created with. Changing to another lesson
SHALL move every participant to it and start it fresh, and the links SHALL keep working
across the change, so one link covers a whole teaching session.

#### Scenario: Switching lesson in place
- **WHEN** the teacher changes the room to a different lesson
- **THEN** the student's screen moves to that lesson at its first exercise, using the same
  link they were given

#### Scenario: Returning to a lesson already played
- **WHEN** the room is changed back to a lesson played earlier in the session
- **THEN** it starts fresh rather than restoring the earlier progress

### Requirement: A lesson survives losing the room

Loss of the connection SHALL leave the lesson fully playable on every device that already
has it, with every exercise still completable. The app SHALL make the unsynced condition
visible, SHALL attempt to restore the connection on its own, and SHALL bring the screens
back into agreement once it does.

#### Scenario: The connection drops mid-exercise
- **WHEN** the connection is lost while an exercise is half done
- **THEN** the exercise remains fully usable, the screen is never blanked or blocked, and
  the participant is told they are working unsynced

#### Scenario: Coming back
- **WHEN** the connection is restored after a drop
- **THEN** the notice clears and the device is brought into agreement with the room

#### Scenario: A room that was never reachable
- **WHEN** a room link is opened while the service cannot be reached at all
- **THEN** the participant is told sync is unavailable and can still play the lesson

### Requirement: A room is short-lived, small and anonymous

A room SHALL be identified by a short code that is easy to read aloud and to type, drawn
from characters that cannot be confused for one another. A room SHALL hold a small, bounded
number of participants, SHALL be discarded after a period of inactivity, and SHALL require
no account, no name and no personal data from anyone joining it.

#### Scenario: Joining costs nothing
- **WHEN** a participant opens a room link
- **THEN** they are in the lesson with no sign-up, no name to enter and no permission to
  grant

#### Scenario: An unknown or expired code
- **WHEN** a link for a room that has expired or never existed is opened
- **THEN** the participant is told the room is not available and is offered the lesson
  list, rather than being shown a blank or broken screen

#### Scenario: One more participant than the room holds
- **WHEN** a join would exceed the room's participant limit
- **THEN** the join is refused with a plain explanation and the existing participants are
  undisturbed
