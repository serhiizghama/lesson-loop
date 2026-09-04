## MODIFIED Requirements

### Requirement: Every action by either participant reaches the other

Any action that changes the state of the exercise on screen — revealing a card, attempting
a pair, placing an item, choosing a scaffold level, advancing a prompt — SHALL be applied
on both participants' screens, whichever of them performed it. Actions that change which
exercise is in play — moving between exercises, resetting one, changing the room's lesson
— SHALL be applied only when the teacher performs them, and SHALL likewise reach both
screens.

#### Scenario: The student acts and the teacher sees it
- **WHEN** the student makes a correct pair
- **THEN** the teacher's screen shows that pair as made, without the teacher acting

#### Scenario: The teacher navigates and the student follows
- **WHEN** the teacher moves to the next exercise
- **THEN** the student's screen shows that exercise

#### Scenario: Both are looking at one shuffle
- **WHEN** a shuffled exercise is reached in a room
- **THEN** both screens present its items in the same order

#### Scenario: A student's attempt to steer changes nothing
- **WHEN** a request to move between exercises or to reset one arrives from a student
- **THEN** the room refuses it, no screen moves, and the student's device is brought back
  into agreement with the room
