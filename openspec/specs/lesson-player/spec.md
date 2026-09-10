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

The player SHALL show overall lesson progress at all times as one mark per exercise, in
lesson order. Each mark SHALL show whether its exercise is complete, and the mark of the
exercise on screen SHALL be distinguishable from the others. Progress SHALL be derived
from which exercises are complete and from nothing else, and SHALL update the moment an
exercise completes. The closing screen is a slide rather than an exercise and SHALL have
no mark; on that screen the marks SHALL NOT be shown at all, because the same stars are
already the whole of that page. The marks SHALL be the same on every screen showing the
same lesson state, and SHALL NOT be a control: they report where the lesson is, they do
not move it.

#### Scenario: Progress advances on completion
- **WHEN** the learner completes an exercise in a lesson of five
- **THEN** the mark for that exercise shows it complete and the other four marks are
  unchanged

#### Scenario: The current mark follows the exercise on screen
- **WHEN** the lesson moves from the second exercise to the third
- **THEN** the third mark is shown as current and the second no longer is

#### Scenario: Eight exercises, eight marks
- **WHEN** an exercise of a lesson of eight exercises and a closing screen is shown
- **THEN** exactly eight marks are shown, one per exercise

#### Scenario: The closing screen shows the stars once
- **WHEN** the closing screen is on screen
- **THEN** the marks are not shown alongside it, and the stars it shows are the only ones
  on the page

#### Scenario: A reset returns the mark to open
- **WHEN** a complete exercise is reset and then completed again
- **THEN** its mark shows open after the reset and complete after the second completion

#### Scenario: Both screens show one trail
- **WHEN** the teacher and the student look at a shared lesson in which three exercises
  are complete
- **THEN** both screens show the same three marks as complete and the same mark as
  current

#### Scenario: The trail is not a way to navigate
- **WHEN** a learner presses the marks
- **THEN** the lesson stays on the exercise it was showing

### Requirement: Completing a lesson is celebrated

When the closing screen is reached, the player SHALL show one star per exercise, gold
where the exercise is complete and unfilled where it is not, and the number of gold stars
SHALL be the number of complete exercises rather than a fixed count. The stars SHALL
arrive one after another, each with a note, followed by a visible burst. The lesson's
closing message SHALL be shown, and SHALL be the screen's heading rather than sitting
beneath a separate title repeating it. Nothing SHALL be spoken. Leaving the closing screen
SHALL stop whatever of this is still playing.

The notes are something the app volunteers, and SHALL therefore obey the lesson's sound
setting: with the setting off the stars still arrive and the burst still happens, in
silence.

#### Scenario: Finishing the last exercise
- **WHEN** the final incomplete exercise is completed
- **THEN** the closing screen is reachable and reports the lesson as finished

#### Scenario: Stars are earned, not given
- **WHEN** the closing screen is reached with one of eight exercises still incomplete
- **THEN** seven stars are gold and one is unfilled, and no star is gold for an exercise
  that is not complete

#### Scenario: The stars come in one at a time
- **WHEN** the closing screen is reached with five complete exercises
- **THEN** five gold stars appear in sequence, a note sounds with each, and a burst
  follows the last

#### Scenario: The closing message is said once, on the screen
- **WHEN** the closing screen is reached
- **THEN** the lesson's closing message is shown once, with no separate title above it
  repeating it, and nothing is spoken aloud

#### Scenario: Leaving the closing screen early
- **WHEN** the teacher moves back to an exercise while the stars are still arriving
- **THEN** the arrival stops, the notes stop with it, and the exercise is shown as it was
  left

#### Scenario: A closing screen in a quiet lesson
- **WHEN** the closing screen is reached with the lesson's sound setting off
- **THEN** the stars still arrive and the burst still happens, and no note sounds

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

### Requirement: Completing an exercise is marked the moment it happens

When the exercise on screen becomes complete, the player SHALL mark it at once on every
screen showing it: its mark in the progress is earned with a visible flourish that
connects the exercise to its mark, a short sound plays, and a brief celebration appears
over the exercise. The moment SHALL last about a second and a half. It SHALL NOT block,
hide or disable the exercise, SHALL NOT move the lesson on, and SHALL be the same on the
teacher's screen and the student's.

The moment SHALL NOT speak. It congratulates with a sound and a picture and never with a
word, because the teacher is the voice of a live lesson and praise belongs to her; an app
saying "well done" over her is the app talking across her. It SHALL NOT interfere with a
line the exercise itself speaks for the completing tap.

The moment SHALL belong to the player: no exercise type needs to know it exists, and an
exercise that becomes complete while it is not on screen SHALL earn its mark quietly.

The moment SHALL mark an exercise finished while the screen was showing it. An exercise
that is already complete when the lesson arrives at it SHALL earn its mark quietly,
however it arrives — a teacher stepping back to it, or a screen catching up on work done
while it was disconnected.

The chime is something the app volunteers, and SHALL therefore obey the lesson's sound
setting. With the setting off the visible moment plays in full and in silence; the moment
SHALL NOT be treated as evidence that the device cannot make sound.

#### Scenario: The last pair
- **WHEN** the learner makes the last pair of a matching exercise
- **THEN** within the same second the mark for that exercise is earned with a flourish, a
  sound plays, a celebration appears over the exercise, and the exercise stays on screen

#### Scenario: The exercise's own line is left alone
- **WHEN** the completing tap is one for which the exercise speaks a line, such as the
  sound an animal makes
- **THEN** that line is heard through to its end, and nothing is spoken over it or after
  it on the moment's account

#### Scenario: Completed by the other participant
- **WHEN** the student makes the last pair in a shared lesson
- **THEN** the teacher's screen plays the same moment, without the teacher acting

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

#### Scenario: Arriving at an exercise that is already finished
- **WHEN** the lesson moves to an exercise that is already complete — because the teacher
  stepped back to it, or because a reconnecting screen learns of the move and the
  completion together
- **THEN** its mark is shown as earned and no moment plays

#### Scenario: A moment in a quiet lesson
- **WHEN** an exercise is completed with the lesson's sound setting off
- **THEN** the flourish, the earned mark and the celebration all play as usual, nothing is
  heard, and no offer to turn sound on appears on account of the silence

#### Scenario: Without sound
- **WHEN** the device cannot play sound
- **THEN** the visible part of the moment plays unchanged and the lesson is unaffected

#### Scenario: Reduced motion
- **WHEN** the device asks for reduced motion
- **THEN** the mark is earned and the sound plays, and the moving parts of the moment
  settle at once instead of animating

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

#### Scenario: Nowhere left to go
- **WHEN** the closing screen is on screen
- **THEN** nothing draws attention to moving on, because there is no next exercise
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
