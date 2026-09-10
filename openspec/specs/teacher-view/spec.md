# teacher-view Specification

## Purpose

The half of the lesson only the teacher sees: what to say next, what the answer is, and the
controls that steer the session. It is the reason two links beat one shared screen — the
student's view stays a clean exercise while the teacher's carries everything needed to
teach it.

## Requirements

### Requirement: The student's screen carries the exercise and nothing else

The student's view SHALL show the exercise, its instruction and the lesson's progress,
including where in the lesson they are, and SHALL NOT show answer keys, teacher controls,
room administration, the means to move between exercises or to reset one, or any
indication of what the teacher can do.

#### Scenario: No teacher affordance leaks
- **WHEN** the student's view is shown for an exercise whose answers the teacher can see
- **THEN** nothing on the student's screen reveals the answers, and no control that only
  the teacher may use is present

#### Scenario: No way to move the lesson on
- **WHEN** the student's view is shown partway through a lesson
- **THEN** there is nothing on it that moves to another exercise or resets this one

#### Scenario: Knowing where you are without steering
- **WHEN** the student's view is shown on the third exercise of nine
- **THEN** the student can see that they are on the third of nine, and how much of the
  lesson is complete

### Requirement: The teacher steers the session

The teacher's view SHALL provide, alongside the exercise, the means to move between
exercises, to reset the exercise on screen, to change the room's lesson, and to obtain the
student's link again at any time. In a room, these SHALL be the teacher's alone: the
lesson SHALL NOT move on, restart an exercise or change lesson at a student's request,
whether or not the teacher has locked their input.

#### Scenario: Restarting an exercise that went wrong
- **WHEN** the teacher resets the exercise on screen
- **THEN** it returns to its start with a fresh presentation order on both screens, and
  every other exercise keeps its progress

#### Scenario: Getting the link back
- **WHEN** the teacher asks for the student's link after having sent it
- **THEN** the same link is offered again, without creating a second room

#### Scenario: A student who asks for the next exercise anyway
- **WHEN** a request to move to another exercise or to reset one arrives from a student,
  by any route the page or the connection allows
- **THEN** neither screen moves, and the student's screen continues to show what the room
  is showing

#### Scenario: Steering is not the lock
- **WHEN** the teacher has not locked student input
- **THEN** the student can still act freely within the exercise on screen, and still
  cannot move the lesson off it

### Requirement: The teacher can make the student's view read-only

The teacher SHALL be able to lock and unlock the student's ability to act. While locked,
the student SHALL continue to see everything the room shows and SHALL be told plainly that
it is the teacher's turn, and their taps SHALL change nothing on either screen. Locking
SHALL NOT restrict the teacher.

#### Scenario: A child running ahead
- **WHEN** the teacher locks student input and the student taps a card
- **THEN** neither screen changes and the student sees that it is the teacher's turn

#### Scenario: Handing control back
- **WHEN** the teacher unlocks student input
- **THEN** the student's next tap takes effect on both screens

#### Scenario: The lock does not lock the teacher
- **WHEN** student input is locked
- **THEN** the teacher can still act on every exercise as normal

### Requirement: The teacher decides whether the app speaks

In a shared lesson the teacher SHALL be able to turn the app's spoken output off and on,
and that decision SHALL apply to both screens. It exists because the teacher is the voice
of a live lesson: she models the words herself, and a synthesised voice repeating them on
two devices talks over her.

The control SHALL sit among the teacher's other lesson controls, alongside the one that
locks the student, SHALL show which of the two states is in force, and SHALL remain usable
on a window as narrow as the student's. Sound SHALL start on. There SHALL be exactly one
such control on a screen, so the teacher is never offered two switches for one setting.

The setting SHALL belong to the teacher alone. A student SHALL have no control for it and
SHALL NOT be able to change it by any route the page or the connection allows. A
participant who joins after it has been changed SHALL inherit it, it SHALL survive either
participant reloading, and it SHALL survive the teacher changing the room's lesson.

It SHALL be independent of the lock: turning sound off SHALL NOT restrict what the student
may tap, and locking the student SHALL NOT change whether the app speaks.

#### Scenario: Quieting the app mid-exercise
- **WHEN** the teacher turns sound off while a lesson is in progress
- **THEN** neither screen speaks unasked from that moment, and everything else about both
  screens is unchanged

#### Scenario: Bringing the voice back for one exercise
- **WHEN** the teacher turns sound on while a listening exercise is on screen
- **THEN** the word being asked is spoken on both screens without either of them being
  tapped

#### Scenario: The setting is not the student's
- **WHEN** a request to change the setting arrives from a student, by any route the page or
  the connection allows
- **THEN** it is refused and neither screen changes

#### Scenario: No control leaks onto the student's screen
- **WHEN** the student's view is shown with sound turned off
- **THEN** there is nothing on it that turns sound on or off, and nothing that reveals the
  teacher has such a control

#### Scenario: A student who joins after it was turned off
- **WHEN** the teacher turns sound off and a student then opens their link
- **THEN** the student's screen does not speak unasked either

#### Scenario: Surviving a reload
- **WHEN** the teacher turns sound off and then reloads her tab
- **THEN** sound is still off, on both screens

#### Scenario: Surviving a change of lesson
- **WHEN** sound is off and the teacher changes the room to another lesson
- **THEN** the new lesson starts with sound still off

#### Scenario: The setting is not the lock
- **WHEN** sound is off and the student has not been locked
- **THEN** the student can still tap the exercise as normal, and locking or unlocking them
  changes nothing about whether the app speaks

#### Scenario: Where the teacher looks for it
- **WHEN** the teacher's view is shown
- **THEN** the control sits beside the one that locks the student, labelled with which
  state the lesson is in, and it is the only such control on the screen

#### Scenario: Usable on a narrow window
- **WHEN** the teacher's view is shown in a 380-pixel-wide viewport
- **THEN** the control is reachable and usable, and the page does not scroll sideways

### Requirement: The teacher sees the answer to the exercise on screen

The teacher's view SHALL show the answer to the current exercise, derived from the lesson's
own data rather than from anything a lesson author writes by hand: which items pair with
which, which bucket each item belongs in, which word is being asked, the sentence a scaffold
level produces for the selected item, the phrases a phrase list contains and which of them
have been heard, the item a quiz prompt names, both answers a description is asking for,
where on a drawing each word belongs, where the two halves of a face-down pair are lying,
and the sentence being assembled. An exercise with nothing to be right about SHALL show no
key rather than an empty one.

The key SHALL keep the one uniform shape it already has — a title and rows of a label
against its answer, each row marked open, current or done — so that a block type added later
is teachable without a new branch in the panel.

Where the answer is a position rather than a word — a place on a drawing, a card on a board
— the key SHALL name it in words the teacher can say out loud over a video call, not as
coordinates.

#### Scenario: The key for a matching exercise
- **WHEN** a matching exercise is on screen in the teacher's view
- **THEN** the teacher sees which item on one side belongs with which on the other

#### Scenario: The key for a listening exercise
- **WHEN** a listening exercise is on screen
- **THEN** the teacher sees which picture the word currently being spoken names

#### Scenario: The key for a quiz
- **WHEN** a quiz is on screen
- **THEN** the teacher sees the prompt being asked against the choice that answers it, with
  the prompts already answered marked done and the one on screen marked current

#### Scenario: The key for a description
- **WHEN** a description exercise is on screen
- **THEN** the teacher sees both answers for the item being described, each marked
  according to whether it has been given yet

#### Scenario: The key for a phrase list
- **WHEN** a phrase-list exercise is on screen
- **THEN** the teacher sees every phrase the exercise contains, with the ones already heard
  marked done, so she can read ahead and model the next one

#### Scenario: The key for a diagram-labelling exercise
- **WHEN** a diagram-labelling exercise is on screen
- **THEN** the teacher sees each word with where on the drawing it belongs, said in words,
  and which words have already been placed

#### Scenario: The key for a memory exercise
- **WHEN** a memory exercise is on screen
- **THEN** the teacher sees each pair with where its two cards are lying on the board, and
  which pairs have already been found

#### Scenario: The key for a sentence-assembly exercise
- **WHEN** a sentence-assembly exercise is on screen
- **THEN** the teacher sees the sentence being built right now, in full, and which
  sentences are already done

#### Scenario: An exercise with no answer
- **WHEN** a physical-response exercise, which scores nothing, is on screen
- **THEN** no answer key is shown and the space is not left empty-looking

#### Scenario: A lesson file gains no new field
- **WHEN** a lesson that predates the teacher's view is opened in it
- **THEN** its answer keys are complete, having been computed from the vocabulary and the
  exercise's own settings

### Requirement: The teacher knows whether the student is there

The teacher's view SHALL show at all times whether a student is connected to the room and
whether the teacher's own connection is healthy.

#### Scenario: The student joins
- **WHEN** the student opens their link
- **THEN** the teacher's view shows that the student is present

#### Scenario: The student drops out
- **WHEN** the student's connection is lost
- **THEN** the teacher's view shows the student as absent rather than continuing to claim
  they are there

### Requirement: The teacher's extra surface does not crowd out the exercise

On a window as narrow as the student's, the teacher's controls and answer key SHALL remain
reachable without covering the exercise or forcing the page to scroll sideways, and SHALL
be dismissible so the teacher can see the exercise as the student sees it.

#### Scenario: The teacher on a narrow window
- **WHEN** the teacher's view is shown in a 380-pixel-wide viewport
- **THEN** the exercise remains fully visible and usable, controls do not overlap it, and
  the page does not scroll sideways

#### Scenario: Seeing what the student sees
- **WHEN** the teacher dismisses the extra surface
- **THEN** the exercise is shown as the student has it, and the surface can be brought back

### Requirement: The teacher decides whether the student may draw

The teacher SHALL be able to grant and withdraw the student's pen. The control SHALL sit
among her other lesson controls, beside the one that locks the student and the one that
decides whether the app speaks, and SHALL show which of the two states is in force. The
student's pen SHALL start granted.

Withdrawing the pen SHALL stop the student making new marks and SHALL leave every mark she
has already made on screen, on both screens. The student SHALL be told plainly that the
pen is not hers at the moment, in the same terms the lock already uses, rather than being
given a tool that silently does nothing.

The setting SHALL belong to the teacher alone. The student SHALL have no control for it and
SHALL NOT be able to draw with the pen withdrawn by any route the page or the connection
allows, including reloading, reconnecting, or acting faster than the room can answer. A
participant who joins after it has been changed SHALL inherit it, it SHALL survive either
participant reloading, and it SHALL survive the teacher changing the room's lesson.

It SHALL be independent of the lock and of the sound setting. An exercise SHALL be lockable
while the student's pen stays hers, and the pen SHALL be withdrawable while the exercise
stays hers to play. Withdrawing the student's pen SHALL NOT restrict the teacher's.

#### Scenario: Taking the pen away mid-exercise
- **WHEN** the student has drawn two marks and the teacher withdraws the pen
- **THEN** both marks remain on both screens, the student's next stroke makes no mark on
  either screen, and she is told the pen is not hers

#### Scenario: The pen and the lock are different switches
- **WHEN** the teacher locks the student's input but leaves the pen granted
- **THEN** the student's taps change nothing and the student can still draw

#### Scenario: The withdrawal cannot be worked around
- **WHEN** the student's pen is withdrawn and the student reloads and tries to draw
- **THEN** no mark appears on either screen

#### Scenario: A late joiner inherits the setting
- **WHEN** the teacher withdraws the pen before the student has joined, and the student
  then joins
- **THEN** the student arrives with no pen and is told so

### Requirement: The teacher can clear the board

The teacher SHALL be able to clear the exercise on screen of every mark, hers and the
student's alike, in one action. The student SHALL be able to clear only her own marks.
Neither clear SHALL reach an exercise other than the one on screen, and neither SHALL
disturb the exercise's own state.

Clearing SHALL be immediate on both screens and SHALL need no confirmation, because a
cleared board is redrawn in seconds and a dialogue in the middle of a live lesson costs
more than the mistake does.

#### Scenario: The teacher clears everything
- **WHEN** both participants have marked the exercise and the teacher clears
- **THEN** the exercise's board is empty on both screens

#### Scenario: The student clears only her own
- **WHEN** both participants have marked the exercise and the student clears
- **THEN** the student's marks are gone on both screens and the teacher's marks remain

#### Scenario: Clearing leaves the exercise alone
- **WHEN** a half-completed exercise carrying marks is cleared
- **THEN** the marks are gone and the exercise's progress is exactly as it was
