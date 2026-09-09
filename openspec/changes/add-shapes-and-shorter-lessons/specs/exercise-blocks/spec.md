## ADDED Requirements

### Requirement: Phrase-list exercise

A phrase-list exercise SHALL present the model phrases its block declares, in the order
declared, each one speakable on its own control. Tapping a phrase's control SHALL speak
that phrase. The exercise SHALL have nothing to be wrong about: no phrase can be tapped
incorrectly and no phrase is refused. The exercise SHALL be complete when every phrase has
been heard at least once.

The phrases SHALL be shown in writing as well as spoken, so that a learner on a device
that cannot speak, and a teacher reading ahead, both see what the exercise contains.

#### Scenario: Hearing a phrase
- **WHEN** the learner taps a phrase's control
- **THEN** that phrase is spoken and it is recorded as heard

#### Scenario: Hearing the same phrase twice
- **WHEN** the learner taps a phrase that has already been heard
- **THEN** the phrase is spoken again and the exercise's completion is unchanged

#### Scenario: Completing the list
- **WHEN** the last unheard phrase is tapped
- **THEN** the exercise reports itself complete

### Requirement: Quiz exercise

A quiz exercise SHALL show one prompt at a time and present a set of choices of which
exactly one is correct. The prompt SHALL be one face of the item being asked — its picture,
its written word, or one of its tags — and the choices SHALL be shown by a different face,
both named by the block. Tapping the correct choice SHALL advance to the next prompt;
tapping an incorrect one SHALL give feedback, leave the prompt in place and allow another
attempt. The exercise SHALL be complete when every selected item has been answered.

The prompt SHALL be legible without sound: a quiz asks with something on the screen, not
with something said, which is what distinguishes it from a listening exercise. A block MAY
declare a line spoken when a prompt is answered correctly, as a themed match already does
for a completed pair.

#### Scenario: A riddle answered
- **WHEN** the prompt is a tag — "a plate 🍽️" — and the learner taps the picture of the
  circle
- **THEN** the answer is accepted and the next prompt is shown

#### Scenario: A picture named
- **WHEN** the prompt is the item's picture and the choices are written words, and the
  learner taps the word that names it
- **THEN** the answer is accepted and the next prompt is shown

#### Scenario: A wrong choice
- **WHEN** the learner taps a choice other than the correct one
- **THEN** feedback is shown, the prompt does not change, nothing already answered is lost,
  and another attempt is allowed

#### Scenario: A quiz on a silent device
- **WHEN** the exercise is reached on a device that cannot speak
- **THEN** the prompt and every choice are fully readable and the exercise can be completed

### Requirement: Description exercise

A description exercise SHALL show one item at a time and ask exactly two questions about
it, each with its own row of choices. The choices for a question SHALL be the distinct
values that the selected items carry for that question's face, so that the alternatives are
the lesson's own vocabulary and not invented. Tapping the correct choice for a question
SHALL mark that question answered; tapping an incorrect one SHALL give feedback and leave
the question open. Neither answer SHALL advance the exercise on its own: the item is only
finished when both questions are answered. The exercise SHALL be complete when every
selected item has been described.

When an item is finished, the two answers SHALL be shown together as the one thing the
exercise exists to produce — "It's a red circle." — rather than as two separate results. A
block MAY declare the line spoken at that moment.

#### Scenario: One question answered
- **WHEN** the learner taps the correct shape but has not yet answered the colour
- **THEN** the shape is marked answered, the colour question stays open, and the exercise
  does not move on

#### Scenario: Both questions answered
- **WHEN** the learner answers the second of the two questions correctly
- **THEN** the item is finished, the two answers are shown together as one sentence, and
  the next item is presented

#### Scenario: A wrong choice on one question
- **WHEN** the learner taps a wrong colour after having answered the shape correctly
- **THEN** feedback is shown, the shape's answer is not lost, and the colour question
  remains open for another attempt

#### Scenario: Completing the exercise
- **WHEN** the last selected item has had both its questions answered
- **THEN** the exercise reports itself complete

## MODIFIED Requirements

### Requirement: An exercise speaks unasked only while the lesson's sound is on

Everywhere these exercises speak of their own accord — a revealed card, a tapped tile, a
completed pair, an item picked to sort, a chosen word and scaffold level, the word being
asked in a listening exercise, the instruction in a physical-response exercise, the line a
quiz declares for a correctly answered prompt, the sentence a description exercise produces
when both of its questions are answered — they SHALL do so only while the lesson's sound is
on. Every control a learner presses in order to hear a line SHALL speak it whether the
sound is on or off; the control on a phrase in a phrase-list exercise is such a control.

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
