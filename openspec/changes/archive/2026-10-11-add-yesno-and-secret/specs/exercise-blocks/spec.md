## MODIFIED Requirements

### Requirement: An exercise speaks unasked only while the lesson's sound is on

Everywhere these exercises speak of their own accord — a revealed card, a tapped tile, a
completed pair, an item picked to sort, a chosen word and scaffold level, the word being
asked in a listening exercise, the instruction in a physical-response exercise, the line a
quiz declares for a correctly answered prompt, the sentence a description exercise produces
when both of its questions are answered, a card turned up in a memory exercise, a word
chosen from a label bank, a placement on a diagram, a sentence finished in an assembly
exercise, the reply to a yes/no answer, a wrong guess or a found secret in a secret game
— they SHALL do so only while the lesson's sound is on. Every control a learner
presses in order to hear a line SHALL speak it whether the sound is on or off; the control
on a phrase in a phrase-list exercise and the control that asks a yes/no question again
are such controls.

No exercise SHALL become unanswerable, uncompletable or unclear because the sound is off:
what an exercise scores, what counts as correct, and what it shows SHALL be exactly as they
are with the sound on.

#### Scenario: A card exercise with the sound off
- **WHEN** the sound is off and the learner reveals a card
- **THEN** the card reveals its written forms as usual, nothing is spoken, and revealing
  every card still completes the exercise

#### Scenario: A themed match with the sound off
- **WHEN** the sound is off and the learner completes a pair in a block that declares a
  spoken line
- **THEN** the pair is locked in and shown as matched, and neither the tapped tile nor the
  pair line is spoken

#### Scenario: A physical-response exercise with the sound off
- **WHEN** the sound is off and the learner advances through the instructions
- **THEN** each instruction is shown as usual and none is spoken

#### Scenario: A sentence exercise with the sound off
- **WHEN** the sound is off and the learner picks a word and then a scaffold level
- **THEN** the sentence is rendered as usual and is not spoken, and pressing the control
  that speaks it does speak it

#### Scenario: A phrase list with the sound off
- **WHEN** the sound is off and the learner taps a phrase's control
- **THEN** the phrase is spoken, because the control exists in order to hear it, and the
  phrase counts as heard

#### Scenario: A quiz with the sound off
- **WHEN** the sound is off and the learner answers a prompt correctly in a block that
  declares a spoken line
- **THEN** the answer is accepted and the exercise moves on as usual, and the line is not
  spoken

#### Scenario: A description with the sound off
- **WHEN** the sound is off and the learner answers both questions about an item
- **THEN** the combined sentence is shown as usual and is not spoken

#### Scenario: A memory exercise with the sound off
- **WHEN** the sound is off and the learner turns up cards and closes a pair
- **THEN** each card shows its face and the pair is locked as usual, and neither the card
  nor the pair line is spoken

#### Scenario: A diagram-labelling exercise with the sound off
- **WHEN** the sound is off and the learner chooses a word and places it correctly
- **THEN** the word is placed as usual, and neither the word nor the block's declared line
  is spoken

#### Scenario: A sentence-assembly exercise with the sound off
- **WHEN** the sound is off and the learner finishes a sentence
- **THEN** the finished sentence is shown as usual, is not spoken, and the exercise moves
  on and completes exactly as it does with the sound on

#### Scenario: A yes/no question with the sound off
- **WHEN** the sound is off and the learner answers a yes/no question
- **THEN** the reply is shown as usual and is not spoken, and pressing the control that
  asks the question does speak it

#### Scenario: A secret game with the sound off
- **WHEN** the sound is off and the learner taps a wrong tile and then the secret
- **THEN** the wrong tile is crossed out and the secret revealed as usual, and neither the
  guess line nor the found line is spoken

## ADDED Requirements

### Requirement: Yes/no question exercise

A yes/no exercise SHALL show one item's picture at a time, with a question about it and
two answers to tap, *Yes* and *No*. Each answer SHALL have its own reply, a full sentence,
which is shown once that answer is given.

The block SHALL declare whether the question has a right answer.

- **When it does not** (an opinion), the question SHALL be about the item shown, and both
  answers SHALL be accepted.
- **When it does** (a check), the question SHALL name either the item shown or another
  selected item. Which one SHALL be decided by the lesson's seed, so both screens agree,
  with each happening roughly as often as the other over a lesson. Only the true answer
  SHALL be accepted, and the reply SHALL be about the item actually shown.
- **A wrong answer** SHALL give feedback, leave the question in place and allow another
  attempt.

Once answered, the item and its reply SHALL stay on screen until the learner moves on, so
the reply can be read and repeated. The exercise SHALL be complete when every selected
item has been answered, without depending on a tap after the last reply.

#### Scenario: An opinion, either way
- **WHEN** the exercise asks "Do you like tea?" over a picture of tea, and the learner taps
  *No*
- **THEN** the reply "No, I don't. I don't like tea." is shown, the answer counts, and the
  learner can move on to the next item

#### Scenario: A check that is true
- **WHEN** a picture of mom is shown with "Is this your mom?" and the learner taps *Yes*
- **THEN** the reply "Yes, it is. This is my mom." is shown and the answer counts

#### Scenario: A check that is false
- **WHEN** a picture of mom is shown with "Is this your sister?" and the learner taps *No*
- **THEN** the reply "No, it isn't. This is my mom." is shown and the answer counts

#### Scenario: A wrong answer to a check
- **WHEN** a picture of mom is shown with "Is this your sister?" and the learner taps *Yes*
- **THEN** feedback is shown, no reply appears, the question stays, and another attempt is
  allowed

#### Scenario: Both screens ask the same question
- **WHEN** a checked yes/no exercise is played in a room
- **THEN** the teacher's and the student's screens show the same picture with the same
  question for every item

### Requirement: Secret game exercise

A secret game SHALL hide one of the selected items and offer every selected item as a tile.

- **A wrong tile:** the tile SHALL be marked as tried and refused for the rest of the
  round, and nothing found SHALL be lost.
- **The secret's tile:** the secret SHALL be revealed in place of the hidden picture.
- **Rounds:** the block SHALL declare how many rounds it plays. Each round SHALL hide a
  different item, chosen by the lesson's seed, and SHALL start with no tile tried.
- **Between rounds:** once a secret is found it SHALL stay revealed until the learner moves
  on to the next round.
- **Completion:** the exercise SHALL be complete when the secret of the last round is
  found.

The secret SHALL NOT be shown on the student's screen before it is found, by any picture,
label, highlight or ordering of the tiles. The tiles SHALL be offered in an order that
does not depend on which item is hidden.

#### Scenario: A wrong guess
- **WHEN** the secret is grandma and the learner taps dad
- **THEN** dad's tile is crossed out and cannot be tapped again this round, and the secret
  stays hidden

#### Scenario: The secret found
- **WHEN** the learner taps the hidden item's tile
- **THEN** the secret is revealed, and the learner can move on to the next round

#### Scenario: The last round
- **WHEN** the secret of the last declared round is found
- **THEN** the exercise is complete, with the last secret still shown

#### Scenario: Nothing gives the secret away
- **WHEN** a round begins on the student's screen
- **THEN** every tile looks alike and sits where it sat in the previous round, and the
  hidden picture shows the same closed gift whatever is inside it
