## ADDED Requirements

### Requirement: The published app says which build it is

The app SHALL show, where a lesson is chosen, which build is running: its name, its
version, and when that build was made. The version SHALL distinguish every revision that
reaches the published app, so that two people looking at the same screen can tell whether
they are looking at the same build.

The version SHALL be derived when the app is built rather than recorded by hand, and
building SHALL NOT require anything to be written back to the source. A build made where
that history is unavailable SHALL still produce a working app that says plainly that it
does not know its version, rather than showing a number that is not true.

#### Scenario: Telling which build the teacher is looking at
- **WHEN** the teacher opens the app and looks at the screen where lessons are chosen
- **THEN** the app's name, its version and the time that build was made are readable there

#### Scenario: A new revision is published
- **WHEN** a revision is published after another
- **THEN** the version it shows differs from the one before it

#### Scenario: A tab left open since an earlier build
- **WHEN** the app has been republished while a tab was left open, and that tab is
  compared with a freshly opened one
- **THEN** the two show different versions, so the stale tab can be recognised as stale

#### Scenario: Built without the history the version comes from
- **WHEN** the app is built from a copy of the source that carries no repository history
- **THEN** the build succeeds and the line says the version is unknown, rather than the
  build failing or naming a version it cannot stand behind

### Requirement: Saying which build it is disturbs no lesson

Naming the build SHALL cost the lesson nothing: it SHALL NOT appear on any screen showing
an exercise, SHALL NOT appear on the student's screen at all, and SHALL NOT require a
request of any kind. It SHALL NOT take attention from the lesson being chosen.

#### Scenario: Inside a lesson
- **WHEN** any exercise is on screen, alone or in a room
- **THEN** no build information is shown

#### Scenario: The student's screen
- **WHEN** a student opens their link
- **THEN** they see what the student view specifies and no build information anywhere

#### Scenario: Nothing is fetched to know the version
- **WHEN** the app shows which build it is
- **THEN** it does so from what it was built with, making no request

#### Scenario: It does not compete with the lesson list
- **WHEN** the teacher is choosing a lesson
- **THEN** the build line sits at the bottom, quiet enough that it is found when looked
  for and ignored otherwise
