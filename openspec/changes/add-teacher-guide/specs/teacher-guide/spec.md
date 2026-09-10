## Purpose

The app's own explanation of itself, written for the person teaching with it rather than
the person building it: what a lesson is, which link goes to the child, what every control
does, and how to run a sitting from start to finish. Covers where the guide lives, who is
offered it, what it must cover, and the rule that keeps it true as the app grows.

## ADDED Requirements

### Requirement: The app explains itself to the teacher

The app SHALL carry a guide to itself, written in English and addressed to the teacher,
reachable from inside the app without a login, a download or a second tool.

The guide SHALL be written to be read twice: once end to end before the first lesson, in
about five minutes, and thereafter in seconds, to settle one question in the middle of a
sitting. It SHALL therefore be terse — a teacher reading it while a child waits is the
case it is designed for, not the exception.

#### Scenario: Read before the first lesson
- **WHEN** a teacher who has never used the app opens the guide at its own address
- **THEN** she can read the whole of it in about five minutes and start a lesson from what
  it told her, without being shown the app by anyone

#### Scenario: Consulted during a lesson
- **WHEN** a teacher needs one answer mid-sitting — which link the child gets, what a
  control does
- **THEN** the guide's sections are listed where she can see them and the answer is one
  jump away, not a page of prose away

### Requirement: The guide is offered inside the room, to the teacher alone

The teacher's own surface inside a room — the panel that carries her controls and the
answer key, and that no one else is shown — SHALL carry a way into the guide. It SHALL sit
with the controls without competing with them: this is the one thing there that is not
part of teaching.

The guide SHALL NOT be offered on the home screen, in a lesson played alone, or anywhere on
the student's screen. A student SHALL never be shown a way to it: their screen carries the
exercise and nothing else, and this is nothing else.

Opening the guide from a room SHALL NOT take the lesson off the teacher's screen. The room
she is teaching in SHALL still be there, in the state she left it, when she is finished
reading.

#### Scenario: From the teacher's panel
- **WHEN** the teacher is in a room, with her panel open
- **THEN** a clearly named way into the guide is among her controls, quieter than any of
  them

#### Scenario: The lesson is not lost to it
- **WHEN** she opens the guide during a lesson
- **THEN** the room stays as she left it and she returns to it without rejoining, without
  the student's screen changing, and without losing where the lesson was

#### Scenario: Never on the student's screen
- **WHEN** the student's view of a room is shown
- **THEN** nothing on it links to the guide, mentions it, or reveals that it exists

#### Scenario: Not on the home screen or in a solo lesson
- **WHEN** the home screen or a lesson opened from it is shown
- **THEN** the guide is not offered there; it is reached by its own address, which the
  teacher can keep

### Requirement: The guide is a page to read, not a lesson to play

The guide SHALL behave as documentation: it SHALL NOT open a room, SHALL NOT speak or make
any sound, SHALL NOT offer the pencil, and SHALL NOT show or alter any lesson's progress.

Leaving the guide SHALL return the teacher to the lessons, so that reading it is never a
dead end.

#### Scenario: Nothing is spoken or sounded
- **WHEN** the guide is open
- **THEN** the app says nothing and plays no sound, whatever the sound switch was last set
  to in a lesson

#### Scenario: No room is opened
- **WHEN** the guide is opened
- **THEN** no room is created and no connection to one is attempted

#### Scenario: Leaving the guide
- **WHEN** the teacher is finished with the guide
- **THEN** one clearly marked way out returns her to the lesson list

### Requirement: The guide's sections are navigable, not merely present

The guide SHALL list its own sections, and each entry SHALL move the reader to that
section. On a window wide enough for it, the list SHALL remain visible while the text is
read, so the shape of the whole is never lost.

On a window too narrow for two columns — the teacher's tablet held upright — the guide
SHALL remain fully readable, with its section list reachable rather than dropped.

Each section SHALL be addressable, so a link to one section opens the guide at it.

#### Scenario: A wide window
- **WHEN** the guide is opened on a laptop
- **THEN** the section list and the text are shown side by side, and choosing a section
  moves the text to it while the list stays put

#### Scenario: A narrow window
- **WHEN** the guide is opened on a tablet held upright
- **THEN** every section is still reachable and every line still readable, with no
  sideways scrolling

#### Scenario: A link to one section
- **WHEN** a link naming a single section is opened
- **THEN** the guide opens showing that section rather than its beginning

### Requirement: The guide covers what a teacher has to know to teach with it

The guide SHALL cover, at minimum:

- what the app is, and that video and audio stay in the call beside it
- choosing a topic and how much of it one sitting teaches
- teaching a lesson alone, with no student connected
- opening a room, and which of the two links belongs to whom
- that the teacher's own link carries the answer key, and must not be sent to the student
  or shown on a shared screen
- that the student's screen has no controls, because the teacher paces the lesson
- every control the teacher has: moving between exercises, resetting one, changing lesson,
  locking the student's taps, the sound switch, the pencil and who may draw
- what a star means, when it is earned, and that mistakes are not counted
- what a lost connection looks like on each screen, and what to do about it
- the limits of a room: how many may join, how long it lasts, that there is no account and
  nothing is saved after it
- how to run a sitting end to end, and what to check when something looks wrong

#### Scenario: The teacher knows which link to send
- **WHEN** a teacher who has read the guide opens a room
- **THEN** she sends the student's link and keeps her own, knowing the difference between
  them and why it matters

#### Scenario: The teacher expects the student's screen to be bare
- **WHEN** she is told a child cannot find the button to move on
- **THEN** she knows that is by design and moves the lesson herself, without looking for a
  fault

#### Scenario: The teacher knows a room does not outlive the lesson
- **WHEN** she wonders whether yesterday's room still holds yesterday's progress
- **THEN** the guide has already told her it does not, and that nothing is stored

### Requirement: Every exercise the app can play is described in the guide

The guide SHALL describe every playable exercise type the app offers, each in a line or
two saying what the child does and what the teacher does alongside it.

An exercise type the app can play but the guide does not describe SHALL be treated as a
defect and SHALL fail the automated checks. Adding an exercise type therefore includes
adding its entry.

#### Scenario: Every current type is described
- **WHEN** the guide is checked against the exercises the app can play
- **THEN** each one has an entry naming it and saying what happens in it

#### Scenario: A new exercise type without an entry
- **WHEN** an exercise type is added to the app and the guide is not updated
- **THEN** the checks fail, naming the type that has no entry

### Requirement: The guide shows the screens it describes

The guide SHALL show pictures of the real app for the screens a teacher must recognise —
at minimum the home screen with its choice of size, an exercise in play, the teacher's
panel, the student's view, the two links of a room, and a screen that has lost its
connection.

Every picture the guide names SHALL exist in the published app, and this SHALL be checked
automatically rather than by eye.

No picture SHALL be the only carrier of an instruction: with images not loaded, the guide
SHALL still say everything it means to say.

#### Scenario: A named picture is missing
- **WHEN** the guide names a picture that is not published with it
- **THEN** the checks fail, naming the missing picture

#### Scenario: Images do not load
- **WHEN** the guide is read on a connection that has not fetched its pictures
- **THEN** every instruction in it is still complete in words, and each picture's place
  says what it would have shown

### Requirement: The guide is written for the teacher, not the developer

The guide SHALL describe the app in the terms of a lesson. It SHALL NOT require the reader
to know how the app is built, and SHALL NOT use the vocabulary of its construction — file
formats, source files, servers, commands, or the names of internal parts.

Where a limit or a behaviour comes from how the app is built, the guide SHALL state its
effect on the lesson rather than its cause.

#### Scenario: A limit stated as a fact about the lesson
- **WHEN** the guide explains that a room is discarded after a period of inactivity
- **THEN** it says what that means for a lesson resumed later, not what discards it

#### Scenario: No developer vocabulary
- **WHEN** the guide's text is checked
- **THEN** it contains none of the construction terms the app is built from

### Requirement: The guide says which version of the app it describes

The guide SHALL show which build of the app it belongs to, in the same terms the home
screen already uses, so that a teacher reporting a difference between the guide and the
app can say which app she is looking at.

#### Scenario: Reporting a mismatch
- **WHEN** the teacher sees the app behave differently from the guide
- **THEN** the guide names the build it describes, and she can quote it
