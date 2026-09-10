# synced-rooms Specification

## Purpose

Lets a teacher and a student hold one lesson between two devices: either of them taps and
both screens follow, without either device being the special one. It also defines what
happens when the connection is not there — which, in a lesson with a child waiting, matters
more than the synchronisation itself.

## Requirements

### Requirement: A room is opened deliberately, never imposed

Opening a lesson SHALL NOT create a room or contact the network. A room SHALL come into
being only when a participant explicitly asks for one, and SHALL yield a link that can be
handed to the other participant.

Because asking for a room needs no account and no name, the app SHALL bound how often rooms
may be asked for from one source. The bound SHALL be set beyond any pace a lesson can
reach, so that a teacher is never refused; a refusal SHALL say plainly what happened, and
SHALL leave the lesson on screen playable and every existing room undisturbed.

#### Scenario: Playing alone stays local
- **WHEN** a lesson is opened from the home screen and played to the end
- **THEN** no room exists and no request leaves the device

#### Scenario: Asking for a room mid-lesson
- **WHEN** the teacher asks to invite a student while a lesson is in progress
- **THEN** a room is created carrying the lesson exactly as it stands, progress included,
  and a link for the student is offered for copying

#### Scenario: A teacher's own pace is never refused
- **WHEN** a teacher opens rooms as fast as teaching allows — a new room per lesson, a
  retry after a failure, a fresh room after changing her mind
- **THEN** every one of them is created

#### Scenario: Rooms asked for faster than a lesson could need them
- **WHEN** rooms are requested from one source far faster than any lesson could use
- **THEN** the further requests are refused, and the refusal is reported as such rather
  than as the room being broken

#### Scenario: A refusal does not cost the lesson
- **WHEN** a request for a room is refused
- **THEN** the exercise on screen stays exactly as it was and fully playable, and any room
  already open continues undisturbed

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

Any action that changes the state of the exercise on screen — revealing a card, attempting
a pair, placing an item, choosing a scaffold level, advancing a prompt — SHALL be applied
on both participants' screens, whichever of them performed it. Actions that change which
exercise is in play — moving between exercises, resetting one, changing the room's lesson
— SHALL be applied only when the teacher performs them, and SHALL likewise reach both
screens.

#### Scenario: The student acts and the teacher sees it
- **WHEN** the student makes a correct pair
- **THEN** the teacher's screen shows that pair as made, without the teacher acting

#### Scenario: The teacher navigates and the student follows
- **WHEN** the teacher moves to the next exercise
- **THEN** the student's screen shows that exercise

#### Scenario: Both are looking at one shuffle
- **WHEN** a shuffled exercise is reached in a room
- **THEN** both screens present its items in the same order

#### Scenario: A student's attempt to steer changes nothing
- **WHEN** a request to move between exercises or to reset one arrives from a student
- **THEN** the room refuses it, no screen moves, and the student's device is brought back
  into agreement with the room

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
### Requirement: A mark reaches the other screen without passing through the lesson's state

A stroke SHALL reach the other participant, and SHALL do so without becoming part of the
lesson's state, without passing through the action reducer, and without advancing the
lesson's version. Drawing SHALL NOT make the state message that carries every tap any
larger, on the exercise being drawn on or on any exercise afterwards.

The room SHALL relay and retain marks without interpreting them: it SHALL decide who may
draw, whose marks may be removed and how many are kept, and it SHALL NOT decide what a
mark means or where it lands.

A stroke SHALL be sent once, when the pen comes up, rather than continuously while it is
being drawn — except that a stroke long enough to keep the other screen waiting SHALL be
sent in parts, in order, so that no single mark leaves the other participant watching
nothing for an unreasonable time.

#### Scenario: Drawing does not inflate the lesson's traffic
- **WHEN** an exercise is marked repeatedly and then a card is tapped
- **THEN** the state message carrying that tap is no larger than it would have been with
  nothing drawn, and the lesson's version advanced only for the tap

#### Scenario: A stroke is sent when it is finished
- **WHEN** a participant draws one ordinary stroke
- **THEN** one mark reaches the other screen, and the room was not sent a message for
  every movement of the hand that made it

### Requirement: Two people drawing at once simply both drew

A stroke SHALL NOT be refused for arriving out of date. Where an action can be refused
because the state moved underneath it, a mark has nothing to conflict with: two
participants drawing at the same moment SHALL both end up with both marks on both screens.

The marks made by **one** participant SHALL appear in the order that participant made them,
on every screen. What is not guaranteed is how two participants' simultaneous marks
interleave with each other: each screen applies its own mark the moment it is made and
hears about the other's afterwards, so the two may be ordered differently on the two
screens. The consequence is confined to which of two overlapping marks is drawn on top,
and it does not reach anything a participant can act on — undo walks back through one
person's own marks, and those are in the same order everywhere.

Removing a mark SHALL be settled the same way: erasing, undoing or clearing a mark that is
already gone SHALL leave both screens agreeing that it is gone, rather than producing an
error or a mark that comes back.

#### Scenario: Simultaneous strokes
- **WHEN** the teacher and the student each complete a stroke at the same moment
- **THEN** both screens show both marks

#### Scenario: One participant's own marks keep their order
- **WHEN** the teacher makes three marks while the student is also drawing
- **THEN** the teacher's three marks are in the order she made them on both screens, and
  undo on her screen and the student's agree on which of them is her most recent

#### Scenario: Erasing what is already erased
- **WHEN** both participants erase the same mark at nearly the same moment
- **THEN** the mark is gone on both screens and neither is shown an error

### Requirement: The board is part of what a room holds

The room SHALL retain the marks of the lesson in play, so that they are not held only by
the browser that made them. A participant who reloads SHALL see the board as it stands, and
a participant who joins after marks were made SHALL be shown them on arrival, alongside the
exercise they were made on.

The board SHALL count towards the room's bounded size, and SHALL be discarded with the room
when it expires. A room stored before drawing existed SHALL load with an empty board and
with the student's pen granted.

#### Scenario: Reloading keeps the board
- **WHEN** a participant marks an exercise and reloads the page
- **THEN** the marks are shown again on that exercise

#### Scenario: Joining after the marks were made
- **WHEN** the teacher marks an exercise and the student then opens the student link
- **THEN** the student lands on that exercise and sees the marks already on it
