## MODIFIED Requirements

### Requirement: An exercise speaks unasked only while the lesson's sound is on

Everywhere these exercises speak of their own accord — a revealed card, a tapped tile, a
completed pair, an item picked to sort, a chosen word and scaffold level, the word being
asked in a listening exercise, the instruction in a physical-response exercise, the line a
quiz declares for a correctly answered prompt, the sentence a description exercise produces
when both of its questions are answered, a card turned up in a memory exercise, a word
chosen from a label bank, a placement on a diagram, a sentence finished in an assembly
exercise, the reply to a yes/no answer, a wrong guess or a found secret in a secret game, a revealed
picture's line, a role-play line as it appears, a talk question as it is asked, a chosen
preference — they SHALL do so only while the lesson's sound is on. Every control a learner
presses in order to hear a line SHALL speak it whether the sound is on or off; the control
on a phrase in a phrase-list exercise and the control that asks a yes/no question again,
the control that replays a role-play line or a talk question, and the control that says a
built sentence are such controls.

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

#### Scenario: A blurred picture revealed with the sound off
- **WHEN** the sound is off and the learner reveals a blurred picture
- **THEN** the picture is shown clearly with its line written out, and the line is not
  spoken

#### Scenario: A built sentence asked for with the sound off
- **WHEN** the sound is off and the learner presses the control that says a built sentence
- **THEN** the sentence is spoken, because the control exists in order to hear it

## ADDED Requirements

### Requirement: Blurred-picture exercise

A blurred-picture exercise SHALL show one item at a time, with its picture blurred so
heavily that it cannot be named, and SHALL offer two steps:

- *peek*, which makes the picture clearer but still not plain;
- *reveal*, which shows it plainly and shows its line.

*Reveal* SHALL be allowed whether or not the learner has peeked. Nothing in this exercise
SHALL count as wrong: the guess is said out loud and judged by the teacher. Once revealed,
the item and its line SHALL stay until the learner moves on. The exercise SHALL be complete
when every selected item has been revealed, without depending on a tap after the last.

#### Scenario: Peek, then reveal
- **WHEN** the learner peeks at a blurred picture and then reveals it
- **THEN** the picture becomes clearer, then plain, and its line ("I like grapes.") is shown

#### Scenario: Straight to the reveal
- **WHEN** the learner reveals a picture without peeking
- **THEN** it is revealed exactly as after a peek

#### Scenario: Both screens blur the same picture
- **WHEN** the exercise is played in a room
- **THEN** the teacher and the student see the same item at the same stage of blur

### Requirement: Role-play exercise

A role-play exercise SHALL name two roles and, for each item, play an ordered dialogue in
which every line belongs to one of the two roles. Each tap SHALL reveal the next line, with
the role that says it. The screen SHALL show which person plays which role — teacher or
student — and SHALL offer to swap them at any time. The swap SHALL change only the labels:
nothing in the exercise SHALL depend on who taps.

Once an item's last line is shown, the learner SHALL be able to move on to the next item.
The exercise SHALL be complete when every selected item's dialogue has been shown to its
last line, without depending on a tap after it.

#### Scenario: A dialogue played through
- **WHEN** the learner taps through the dialogue about grapes
- **THEN** "What do you like?", "I like grapes.", "Why do you like them?" and "Because they
  are sweet." appear in turn, each marked with the role that says it

#### Scenario: Swapping roles
- **WHEN** the roles are swapped in the middle of a dialogue
- **THEN** the labels show the student as the shopkeeper and the teacher as the customer,
  and the dialogue continues from the same line

### Requirement: Talk-question exercise

A talk-question exercise SHALL hold questions in declared levels, from easiest to hardest.
*New question* SHALL ask the next question of the first level. *Harder* SHALL move to the
next level, or stay on the last one, and ask that level's next question. Questions SHALL
be asked in an order fixed when the exercise starts and shared by both screens. Within a
level, a question SHALL NOT be asked twice until all of that level's questions have been
asked.

The question being asked SHALL be shown in writing with its level. The exercise SHALL be
complete once a question of the last level has been asked. How well it was answered is not
the app's to judge.

#### Scenario: Climbing the levels
- **WHEN** the learner asks a new question and then presses *Harder* twice
- **THEN** a level 1, a level 2 and a level 3 question are shown in turn, and the exercise
  is complete

#### Scenario: No repeats too soon
- **WHEN** the learner asks for a new level-1 question four times, and level 1 has four
  questions
- **THEN** four different questions are asked

### Requirement: Preference exercise

A preference exercise SHALL play a declared number of rounds, each offering two different
selected items. Tapping one SHALL choose it, and the block's sentence SHALL then be shown
for the item chosen against the other ("I prefer grapes to pears."). Neither choice SHALL
count as wrong. Once chosen, a round SHALL stay until the learner moves on. Every round
SHALL offer a pair not offered before. The exercise SHALL be complete when the last round
has a choice.

#### Scenario: A choice made
- **WHEN** the round offers grapes and pears and the learner taps pears
- **THEN** "I prefer pears to grapes." is shown, and the learner can move on

### Requirement: Sentence-combining exercise

A sentence-combining exercise SHALL offer rows of choices — the selected items as one row,
and the rows the block declares as the others — and SHALL show the sentence the current
choices make, joined by the block's template. A choice SHALL be changeable at any time.

- **Per-item options:** an option MAY belong to particular items, and SHALL be offered only
  while one of them is chosen. When the chosen item changes, a choice that no longer
  belongs SHALL be cleared.
- **Mood:** an option MAY carry a mood, good or bad. When two chosen options carry
  different moods, the screen SHALL ask whether the sentence makes sense, and SHALL still
  allow it to be heard. A mismatch is a question to talk about, not an error.
- **Surprise me** SHALL fill every row with a choice whose moods agree.
- **Completion:** the sentence SHALL be heard from its control once every row has a choice.
  The exercise SHALL be complete when a sentence has been heard for every selected item.

#### Scenario: Building a sentence
- **WHEN** the learner picks "I really like", grapes and "they are juicy"
- **THEN** "I really like grapes because they are juicy." is shown

#### Scenario: Parts that disagree
- **WHEN** the learner picks "I love" and "they are too sticky"
- **THEN** the sentence is shown with the question "Does that make sense?", and it can still
  be heard

#### Scenario: An option for one place
- **WHEN** the park is chosen and then school
- **THEN** "play on the swings" is offered for the park, and is cleared and no longer
  offered once school is chosen
