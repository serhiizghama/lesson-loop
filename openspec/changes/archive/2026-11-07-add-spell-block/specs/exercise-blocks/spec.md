## ADDED Requirements

### Requirement: Spelling exercise

A spelling exercise SHALL work through the selected items one at a time. For the item on screen
it SHALL show the item's picture, one empty place for each letter of its English word, and that
word's letters shuffled, in an order both screens agree on. The word itself SHALL NOT be written
on the screen until it has been spelled, and the letters SHALL NOT be offered in the order that
already spells the word.

The learner SHALL tap the letters in the word's order: the next correct letter SHALL fill the
next empty place; any other letter SHALL be refused with visible feedback, and the letters
already placed SHALL stay placed. Where a letter occurs more than once in a word, tapping any
copy of it SHALL be accepted. A letter SHALL keep the case it has in the word as the lesson
writes it.

A control SHALL say the word whenever it is pressed. Nothing SHALL be spoken when a word first
appears, and no letter SHALL be spoken as it is placed.

When the word is whole it SHALL be shown complete and spoken once, and the exercise SHALL move to
the next item on the learner's action rather than on its own. The exercise SHALL be complete when
every selected word has been spelled.

#### Scenario: Placing the next letter
- **WHEN** the learner taps the letter that comes next in the word
- **THEN** it fills the next empty place and is marked as used among the offered letters

#### Scenario: A letter out of order
- **WHEN** the learner taps a letter that does not come next
- **THEN** the tap is refused with visible feedback, every letter already placed stays placed, and
  the learner may try again immediately

#### Scenario: A word with a repeated letter
- **WHEN** the word is *scissors* and the learner taps any of its offered *s* tiles at a point
  where an *s* comes next
- **THEN** the letter is accepted, and exactly one more *s* tile shows as used, the same one on
  both screens

#### Scenario: Letters keep their case
- **WHEN** the word is *TV*
- **THEN** the letters offered read *T* and *V*, and the finished word reads *TV*

#### Scenario: The shuffle does not give the word away
- **WHEN** any word of any lesson is offered, including a two-letter word such as *TV*
- **THEN** the letters are in an order other than the one that spells it

#### Scenario: The screen does not give the word away
- **WHEN** a word has not yet been spelled
- **THEN** the learner's screen shows its picture, its empty places and its letters, and does not
  show the word, whole or in the first language

#### Scenario: Hearing the word on demand
- **WHEN** the learner presses the control that says the word
- **THEN** the word is spoken, and nothing about the exercise's progress changes

#### Scenario: A finished word is heard once
- **WHEN** the learner places the last letter of a word
- **THEN** the whole word is shown and spoken once, as a word rather than as its last letter

#### Scenario: A finished word waits
- **WHEN** a word is finished and the learner does nothing
- **THEN** the finished word stays on screen and the exercise does not advance by itself

#### Scenario: Moving to the next word
- **WHEN** a word is finished, it is not the last, and the learner acts to move on
- **THEN** the next word's letters are offered, shuffled, with nothing carried over from the last
  one

#### Scenario: Spelling every word
- **WHEN** the last selected word is finished
- **THEN** the exercise is marked complete, and no control offers to move past the last word

#### Scenario: A letter tile on the narrowest screen
- **WHEN** a spelling exercise is shown at the narrowest width the app supports
- **THEN** every letter tile is still large enough for a finger at the size it actually appears

## MODIFIED Requirements

### Requirement: An exercise speaks unasked only while the lesson's sound is on

Everywhere these exercises speak of their own accord — a revealed card, a tapped tile, a
completed pair, an item picked to sort, a chosen word and scaffold level, the word being
asked in a listening exercise, the instruction in a physical-response exercise, the line a
quiz declares for a correctly answered prompt, the sentence a description exercise produces
when both of its questions are answered, a card turned up in a memory exercise, a word
chosen from a label bank, a placement on a diagram, a sentence finished in an assembly
exercise, a word finished in a spelling exercise, the reply to a yes/no answer, a wrong guess or a found secret in a secret game, a revealed
picture's line, a role-play line as it appears, a talk question as it is asked, a chosen
preference — they SHALL do so only while the lesson's sound is on. Every control a learner
presses in order to hear a line SHALL speak it whether the sound is on or off; the control
on a phrase in a phrase-list exercise and the control that asks a yes/no question again,
the control that replays a role-play line or a talk question, the control that says a built
sentence, and the control that says the word being spelled are such controls.

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

#### Scenario: A spelling exercise with the sound off
- **WHEN** the sound is off and the learner finishes spelling a word
- **THEN** the finished word is shown as usual, is not spoken, and the exercise moves on and
  completes exactly as it does with the sound on

#### Scenario: The word being spelled asked for with the sound off
- **WHEN** the sound is off and the learner presses the control that says the word
- **THEN** the word is spoken, because the control exists in order to hear it
