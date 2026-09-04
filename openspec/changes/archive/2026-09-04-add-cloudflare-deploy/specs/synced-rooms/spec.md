## MODIFIED Requirements

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
