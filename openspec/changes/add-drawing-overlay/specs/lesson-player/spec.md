## ADDED Requirements

### Requirement: The player carries the pencil and its tools

The player SHALL offer the drawing mode and its tools on every exercise of a lesson held in
a room, and SHALL do so without the lesson file declaring anything about drawing. A lesson
played alone SHALL offer none of it.

The pencil SHALL sit among the controls in the header, which is the one surface both
participants have — the student draws as well and has no panel — and SHALL show plainly
whether it is down. The tools SHALL be out of the way while nobody is drawing and reachable
in one action when somebody wants to draw, and SHALL NOT stand in the part of the stage
that is drawn on. They SHALL NOT displace the exercise, cover its content, or take
space from it in a narrow window; the way out of the lesson, the progress marks and the way
forward SHALL remain reachable while the drawing mode is on.

The closing screen and the home screen SHALL NOT be drawable: the pencil belongs to an
exercise, and there is no exercise on either.

The exercise SHALL be given a fixed amount of room beneath it, the same on both screens,
rather than being cropped to whatever the content happens to need. A mark is made around
and beside the content as often as on it — an arrow from a card to a written word, a line
under the row — and a board that stops at the last picture has nowhere to put either.

#### Scenario: The pencil is there without being in the way
- **WHEN** an exercise is shown in a room and nobody is drawing
- **THEN** the exercise occupies the space it does today and the pencil is reachable in
  one action

#### Scenario: There is room to draw beneath the exercise
- **WHEN** an exercise whose content is shorter than the stage is shown
- **THEN** the space beneath it can be drawn on, and is the same space on both screens

#### Scenario: The closing screen has no pencil
- **WHEN** the lesson reaches its closing screen
- **THEN** no drawing mode is offered and nothing on it can be marked

## MODIFIED Requirements

### Requirement: The layout serves a narrow window on a tablet

The player SHALL be usable in a window as narrow as 380 logical pixels without horizontal
scrolling or overlapping controls, because the learner most often has it beside a video
call.

The header SHALL keep the way out at its leading edge and SHALL centre everything else it
carries — the lesson's name, the progress marks and the teacher's controls — on the page
rather than on the space left over, at every width and on every slide. Where a lesson has
more exercises than the width comfortably allows, the marks SHALL give way rather than
push a control off the screen, force the page sideways, or run into one another.

The exercise itself SHALL be laid out to one fixed shape and scaled to the space available,
rather than reflowed to it. Two screens of different sizes SHALL therefore show the same
arrangement of the same exercise at different scales — the same number of cards to a row,
in the same order, in the same relative positions — so that a position on one screen names
the same content on the other. Scaling SHALL preserve the exercise's proportions, SHALL NOT
crop it, and SHALL leave every tap target large enough for a young child using a finger at
the narrowest supported width.

#### Scenario: A narrow window
- **WHEN** the player is shown in a 380-pixel-wide viewport
- **THEN** all controls remain reachable, nothing overlaps, and the page does not scroll
  sideways

#### Scenario: A long lesson in a narrow window
- **WHEN** a lesson of fourteen exercises is shown in a 380-pixel-wide viewport
- **THEN** every mark is visible and none overlaps its neighbour, no control is pushed out
  of reach, and the page does not scroll sideways

#### Scenario: The header's group is centred whatever it holds
- **WHEN** lessons of five and of fourteen exercises are shown, and then the closing
  screen where no marks are shown at all
- **THEN** in each case the way out sits at the leading edge and the group beside it is
  centred on the page

#### Scenario: The same arrangement at two sizes
- **WHEN** the same ten-item exercise is shown in a 1280-pixel-wide viewport and in a
  380-pixel-wide one
- **THEN** both show the items in the same number of rows and the same order, and the
  item in a given position is the same item on both
