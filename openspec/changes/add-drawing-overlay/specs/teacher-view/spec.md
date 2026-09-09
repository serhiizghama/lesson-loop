## ADDED Requirements

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
