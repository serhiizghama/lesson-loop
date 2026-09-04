## Purpose

How LessonLoop reaches the people using it: one address on the internet that serves both
the lesson and the room, links that open on a device which has never seen the app before,
and what a published build is allowed to cost a lesson already in progress.

## ADDED Requirements

### Requirement: The app is reachable at one address that serves both halves

The app SHALL be reachable on the public internet at a single origin, and that origin
SHALL serve both the client and the room. A participant SHALL NOT be asked to configure an
address, and no part of the app SHALL need to be told where the other part lives.

#### Scenario: The teacher opens the app from a link
- **WHEN** the published address is opened in a browser on any device
- **THEN** the lesson list appears, ready to choose a lesson, with nothing to install and
  nothing to sign in to

#### Scenario: The room is on the same origin as the page that opens it
- **WHEN** a room is opened from a published lesson and the student link is copied
- **THEN** the link addresses the same origin the teacher is already on, and the socket
  that carries the lesson is opened against that origin

#### Scenario: A second device is not configured
- **WHEN** the student link is opened on a device that has never been set up for this app
- **THEN** it joins the room with no address to enter, no permission to grant and no
  setting to change

### Requirement: A link opens cold, at whatever it names

Every address the app hands out SHALL load the app when opened directly, in a browser that
has never visited it, with no prior navigation inside the app. This SHALL hold for a lesson
address, a student's room link and a teacher's room link alike.

#### Scenario: A student link pasted into a message
- **WHEN** a student link is opened from a messenger, as the first request that browser
  makes to the app
- **THEN** the student view of that room loads, rather than a missing-page error

#### Scenario: A lesson link opened directly
- **WHEN** a lesson address is opened directly, without going through the lesson list
- **THEN** that lesson opens

#### Scenario: The teacher's key survives being opened cold
- **WHEN** a teacher link is opened directly
- **THEN** the teacher's half is granted, the key having reached the app without ever being
  part of the request

#### Scenario: An address the app does not recognise
- **WHEN** an address that names nothing in the app is opened
- **THEN** the app loads and says so, rather than the participant being shown a bare
  server error

### Requirement: Serving the client never displaces the room

The rule that makes an unknown address load the app SHALL NOT apply to the addresses the
room itself answers on. Room requests SHALL continue to be answered by the room while every
client address falls back to the app.

#### Scenario: Opening a room while the fallback is in force
- **WHEN** a teacher asks to invite a student on the published app
- **THEN** a room is created and a link returned, not the app's own page

#### Scenario: The lesson's socket is not swallowed
- **WHEN** a participant's device opens the room's socket on the published app
- **THEN** the socket is established by the room

#### Scenario: A new room address cannot be quietly lost
- **WHEN** the room answers on an address that the fallback rule has not been told to leave
  alone
- **THEN** the project's checks fail, rather than the address silently returning the app's
  page to every caller

### Requirement: Publishing costs a lesson in progress nothing

A published build SHALL NOT put a lesson on the network beyond what it already needed. A
lesson SHALL behave, once its page has loaded, exactly as it does when served locally, and
a lesson being taught SHALL NOT be interrupted by the app being published again.

#### Scenario: Playing with the network gone
- **WHEN** the network becomes unavailable after a published lesson has loaded
- **THEN** the lesson behaves exactly as specified for offline play

#### Scenario: A room in progress while a new version is published
- **WHEN** the app is published again while a lesson is being taught in a room
- **THEN** the participants' screens keep working on the version they already loaded, and
  the room they are in is not discarded

### Requirement: Only a build that passed its checks becomes the published app

The app SHALL be published from the reviewed source rather than from anyone's working copy,
and SHALL be published only after the project's type check, tests and build have passed on
that source. A failing build SHALL NOT reach the address a lesson is taught on.

#### Scenario: A change that fails its checks
- **WHEN** a revision whose checks fail is pushed
- **THEN** nothing is published and the address keeps serving the last good version

#### Scenario: A change that passes
- **WHEN** a revision passes its checks on the main line of development
- **THEN** that revision becomes the published app without anyone having to publish it by
  hand

#### Scenario: A proposal under review
- **WHEN** a revision is proposed for review rather than accepted
- **THEN** its checks run and nothing is published

### Requirement: New lesson content reaches the teacher by being published

Lesson content SHALL travel with the published app. The app SHALL NOT require a server-side
catalogue of lessons, and adding a lesson SHALL require no change to the room, the protocol
or any server code — but a lesson SHALL become available to the teacher when the app is
published, not when the file is written.

#### Scenario: A lesson added to the content
- **WHEN** a new lesson file is added and the app is published
- **THEN** the lesson appears in the lesson list and can be taught, with no other change
  anywhere

#### Scenario: A lesson written but not published
- **WHEN** a new lesson file exists in the source but the app has not been published since
- **THEN** the published app does not offer it, and the app already published is unaffected
