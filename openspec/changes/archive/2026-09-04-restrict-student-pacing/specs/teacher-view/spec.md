## MODIFIED Requirements

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
