## ADDED Requirements

### Requirement: An exercise speaks unasked only while the lesson's sound is on

Everywhere these exercises speak of their own accord — a revealed card, a tapped tile, a
completed pair, an item picked to sort, a chosen word and scaffold level, the word being
asked in a listening exercise, the instruction in a physical-response exercise — they SHALL
do so only while the lesson's sound is on. Every control a learner presses in order to hear
a line SHALL speak it whether the sound is on or off.

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

## MODIFIED Requirements

### Requirement: Listening exercise

A listening exercise SHALL speak one English word and present a set of pictures of which
exactly one is correct. Tapping the correct picture SHALL advance to the next word;
tapping an incorrect one SHALL give feedback and let the learner try again. The word SHALL
be repeatable on demand. The exercise SHALL be complete when every target has been
answered.

The control that repeats the word SHALL show which of three things is true: the word is
ready to be repeated, the word is being spoken right now, or this device has no sound. A
control that looks the same whether or not it worked is not acceptable, because in this
exercise the spoken word is the question and the learner has no other way to tell that
nothing was said.

Where this device has no sound, the exercise SHALL first offer the learner an explicit
action to turn sound on, and SHALL reveal the written English word only once that action
has been taken and sound still did not work. The written word is a last resort: revealing
it turns a listening exercise into a reading one, so it is not shown while there is still
a chance of hearing the word.

Where the lesson's sound has been turned off, the word SHALL NOT be spoken on arriving at
it, and the control SHALL invite a first play rather than a repeat, since there is nothing
yet to repeat. Pressing it SHALL speak the word. The written English word SHALL NOT be
revealed on account of the sound being off: it remains reserved for a device that cannot
speak, and a learner whose lesson was told to be quiet can still hear the word by asking
for it.

#### Scenario: Hearing and answering
- **WHEN** a word is spoken and the learner taps the picture it names
- **THEN** the answer is accepted and the next word is spoken

#### Scenario: Asking to hear it again
- **WHEN** the learner asks to repeat the current word
- **THEN** the same word is spoken again and no answer is recorded

#### Scenario: A wrong picture
- **WHEN** the learner taps a picture other than the target
- **THEN** feedback is shown, the target does not change, and another attempt is allowed

#### Scenario: The repeat control while a word is playing
- **WHEN** the current word is being spoken
- **THEN** the repeat control shows that it is speaking, and returns to its ready
  appearance when the word ends

#### Scenario: A screen that has not been allowed to speak yet
- **WHEN** the exercise is reached on a device that has had no interaction — a student's
  screen turned by the teacher, for instance
- **THEN** the learner is offered an explicit action to turn sound on, and the written
  English word is not shown

#### Scenario: Turning sound on succeeds
- **WHEN** the learner takes the action to turn sound on and the device speaks
- **THEN** the current word is heard, the offer disappears, and the repeat control returns
  in its ready state

#### Scenario: Turning sound on fails
- **WHEN** the learner takes the action to turn sound on and the device still does not
  speak
- **THEN** the written English word is revealed so the exercise stays answerable, and the
  control shows that this device has no sound

#### Scenario: Answering is never blocked by sound
- **WHEN** sound is unavailable at any point in the exercise
- **THEN** every picture remains tappable, correct answers still advance, and the exercise
  can still be completed

#### Scenario: Arriving at a word with the lesson quieted
- **WHEN** the lesson's sound is off and the exercise moves to its next word
- **THEN** nothing is spoken, the control invites a first play rather than a repeat, and
  the written English word is not shown

#### Scenario: Asking for the word in a quieted lesson
- **WHEN** the lesson's sound is off and the learner presses the control
- **THEN** the word is spoken, and the exercise is answered in the usual way
