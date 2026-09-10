## ADDED Requirements

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
