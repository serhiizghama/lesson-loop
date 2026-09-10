# shared-drawing Specification

## Purpose

Lets the teacher and the student mark the exercise they are both looking at — circling a
picture, underlining a word, joining two things with a line, writing a letter the exercise
does not contain — so that "this one" has something to point at in a lesson held over a
video call.

## Requirements

### Requirement: A mark is made on the exercise and lands in the same place on both screens

A participant SHALL be able to draw freehand over the exercise on screen. What is drawn
SHALL appear over the exercise's own content — its cards, pictures, words and buttons —
rather than beside it or in place of it.

A mark SHALL land on the same content on every screen showing that exercise. A circle drawn
around a picture SHALL be a circle around that same picture on the other screen, whatever
size that screen is and whichever of the two made it. Marks SHALL be legible over every
face an exercise can show — a picture, a coloured swatch, a word, an emoji — and SHALL NOT
obscure what they are pointing at to the extent that it can no longer be recognised.

Marks SHALL NOT capture, cover or interfere with the exercise's own feedback: a shake, a
tick, a revealed word and the completion celebration SHALL all remain visible and behave
as they do with nothing drawn.

#### Scenario: A circle means the same picture on both screens
- **WHEN** the teacher circles the third picture of an exercise on a wide screen, and the
  student is watching the same exercise on a narrow one
- **THEN** the student sees a circle around that same third picture

#### Scenario: A mark does not stop the exercise being read
- **WHEN** a card is underlined and then flipped
- **THEN** the revealed word is legible and the underline is still where it was drawn

### Requirement: Drawing and answering are never live at the same time

Drawing SHALL be a mode that is entered and left deliberately, and the app SHALL show
plainly which mode is in force.

While the mode is on, pointer input over the exercise SHALL make marks and SHALL NOT
operate the exercise: no card flips, no pair is made, no answer is given, and no exercise
is completed by a stroke. While it is off, pointer input SHALL operate the exercise exactly
as it does today, and SHALL NOT make marks.

Leaving the mode SHALL NOT erase anything: marks already made SHALL stay visible and inert
underneath the hand. The control that leaves the mode SHALL itself remain operable while
the mode is on, as SHALL the drawing tools; nothing else that belongs to the exercise
SHALL be.

This rule SHALL hold for each participant independently: whether the teacher is drawing
SHALL NOT decide whether the student is.

#### Scenario: A stroke is not an answer
- **WHEN** the drawing mode is on and a participant draws a line across two cards of a
  matching exercise
- **THEN** a mark is made, no pair is attempted, and the exercise's progress is unchanged

#### Scenario: Leaving the mode gives the exercise back
- **WHEN** a participant draws a mark, leaves the drawing mode, and taps a card
- **THEN** the card responds as normal and the mark is still on screen

#### Scenario: One person drawing does not stop the other answering
- **WHEN** the teacher is in the drawing mode and the student taps a card
- **THEN** the student's tap operates the exercise as normal

### Requirement: A stroke is the unit of everything done to the board

A stroke SHALL be one continuous mark, from the moment the pen goes down to the moment it
comes up, and SHALL be the smallest thing the board can hold. Every operation SHALL act on
whole strokes: a stroke SHALL be added whole, removed whole, and never split, trimmed or
partially altered.

A stroke SHALL be reproduced faithfully enough that its meaning survives — a circle SHALL
read as a circle around the thing it encloses and a letter SHALL read as that letter — but
SHALL NOT be required to reproduce every movement of the hand that made it. Smoothing a
stroke SHALL NOT change what it encloses or what it points at.

#### Scenario: A stroke arrives whole
- **WHEN** a participant draws one continuous line and lifts the pen
- **THEN** the other screen shows that line complete, and never shows a version of it that
  is missing its beginning

#### Scenario: Smoothing preserves meaning
- **WHEN** a circle is drawn around a picture with a mouse
- **THEN** the mark shown on both screens still encloses that picture and no other

### Requirement: The board offers a pen, an eraser, colours and sizes

The tools SHALL be a pen and an eraser, each in a small number of sizes, and the pen in a
small fixed set of colours. The colours SHALL be distinguishable from one another and
legible over the exercise's own content. The current tool, size and colour SHALL be visible
without opening anything.

The eraser SHALL remove whole strokes: touching any part of a stroke SHALL remove that
stroke entirely. The eraser's size SHALL govern how near a stroke a participant must come
to remove it, not how much of it is removed. The eraser SHALL remove only strokes the
person using it is allowed to remove.

A participant's chosen tool, size and colour SHALL be their own and SHALL NOT be changed by
what the other participant chooses.

#### Scenario: The eraser takes the whole mark
- **WHEN** a participant erases the middle of a long line
- **THEN** the entire line is gone and no fragment of it remains at either end

#### Scenario: Two people hold different pens
- **WHEN** the teacher selects one colour and the student another
- **THEN** each draws in their own colour and neither selection changed the other's

### Requirement: A mark belongs to whoever made it

Every stroke SHALL carry which participant made it, and the board SHALL make that visible:
the teacher's marks and the student's marks SHALL be distinguishable on both screens
without either of them being told which is which. Their default pen colours SHALL differ
for this reason.

Undo SHALL take back the most recent stroke made by the person who asked for it, and SHALL
NOT take back a stroke made by the other participant. Repeated undo SHALL walk back
through that person's own strokes in the order they were made. Undo SHALL have nothing to
take back once that person's strokes on the exercise are gone, and SHALL do nothing rather
than fail.

#### Scenario: Undo does not reach across
- **WHEN** the student draws a mark, then the teacher draws a mark, and the teacher undoes
- **THEN** the teacher's mark is gone and the student's mark is untouched on both screens

#### Scenario: Undo with nothing of one's own
- **WHEN** a participant who has drawn nothing on this exercise asks to undo
- **THEN** nothing changes on either screen and no error is shown

### Requirement: Marks belong to the exercise they were made on

The board SHALL be per exercise. Moving to another exercise SHALL show that exercise's own
marks, and returning SHALL show the marks made earlier exactly as they were left.

Resetting an exercise SHALL NOT clear its marks, and clearing its marks SHALL NOT reset it:
they are separate things and neither implies the other. Changing the room's lesson SHALL
discard the marks of the lesson being left, as it discards that lesson's state.

The board SHALL hold a bounded number of strokes per exercise. On reaching the bound the
oldest strokes SHALL give way so that drawing continues to work, rather than drawing being
refused.

#### Scenario: Marks stay with their exercise
- **WHEN** a participant marks the first exercise, moves to the second, and comes back
- **THEN** the first exercise's marks are shown as they were left and the second
  exercise's board was empty

#### Scenario: A reset leaves the marks alone
- **WHEN** an exercise carrying marks is reset
- **THEN** the exercise starts again and its marks are still on screen

### Requirement: Drawing belongs to a room

The board SHALL be offered only in a lesson held between two people. A lesson opened from
the home screen and played alone SHALL offer no pencil, no tools and no marks, because a
mark made there has nobody to reach: the person drawing it is the only person who can see
it, and she is looking at the exercise already.

A lesson **in a room** that loses its connection SHALL keep drawing. Marks made while
disconnected SHALL appear on the screen that made them, and the person drawing SHALL be
told that the other screen is not currently seeing them, in the same terms the app already
uses for a lost connection — the board is one of the things a room does, and a room whose
socket is down is still a room.

#### Scenario: A lesson played alone has no pencil
- **WHEN** a lesson is opened from the home screen
- **THEN** no drawing mode is offered anywhere in it

#### Scenario: Drawing with the room gone
- **WHEN** the connection drops and a participant draws
- **THEN** the mark appears on their own screen and the disconnection is shown
