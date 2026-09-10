## ADDED Requirements

### Requirement: Diagram-labelling exercise

A diagram-labelling exercise SHALL present one drawing with a set of unmarked places on
it, and the selected items as a bank of words beside it. The learner SHALL tap a word and
then tap the place on the drawing it names. A correct placement SHALL stick: the word
leaves the bank and settles on the place it named. An incorrect one SHALL be refused with
visible feedback, leaving both the word and the place in play. The exercise SHALL be
complete when every selected item has been placed.

Tapping a word SHALL speak it. A block MAY declare a line spoken when a placement is
correct; where it does, that line SHALL be spoken, so a placement is heard as a sentence
about the thing labelled rather than as a bare word.

Every place SHALL be reachable by a young child's finger at the narrowest width the app
supports, however small it is drawn: the area that accepts a tap SHALL be enlarged around a
small place while what is shown stays the size it was drawn, and two places SHALL never be
enlarged so far into each other that a learner cannot tell which one a tap will reach. A
place that cannot be made reachable SHALL be treated as a fault in the drawing, which the
app supplies, and never as something the lesson must work around. A tap that lands on the
drawing but on no place SHALL do nothing at all, and SHALL NOT count as a wrong placement.

#### Scenario: A correct placement
- **WHEN** the learner taps a word and then taps the place on the drawing that word names
- **THEN** the word settles on that place, leaves the bank, and the placement can no longer
  be undone by tapping

#### Scenario: An incorrect placement
- **WHEN** the learner taps a word and then taps a place that a different word names
- **THEN** the placement is refused with visible feedback, the word stays in the bank, the
  place stays unlabelled, and the learner may try again immediately

#### Scenario: Changing which word is being placed
- **WHEN** the learner taps a word and then taps a different word
- **THEN** the selection moves to the second word rather than attempting a placement

#### Scenario: Tapping the drawing with no word chosen
- **WHEN** the learner taps a place on the drawing before choosing a word
- **THEN** nothing is placed, nothing is refused, and no mistake is recorded

#### Scenario: A small place is still tappable
- **WHEN** a place is drawn only a few millimetres across on the narrowest supported screen
- **THEN** a tap aimed at it is accepted, and the drawing shows which place the tap belongs
  to

#### Scenario: A tap that misses every place
- **WHEN** the learner is holding a word and taps a part of the drawing that no place covers
- **THEN** nothing is placed and nothing is refused: the word stays held and no mistake is
  shown

#### Scenario: Completing the diagram
- **WHEN** the last unplaced word is placed correctly
- **THEN** the exercise is marked complete and every label is shown on its place

#### Scenario: A labelled placement that speaks a sentence
- **WHEN** the learner places a word correctly in a block that declares a spoken line
- **THEN** that line is spoken, filled for the item just placed

### Requirement: Memory exercise

A memory exercise SHALL lay the selected items out face down, each item appearing twice —
once by each of the two faces the block declares, a picture and its written word by
default — in an order both screens agree on. Tapping a face-down card SHALL turn it up and
speak what it shows.

Turning up a second card SHALL either close a pair, when both cards belong to the same
item, locking both face up and taking them out of play; or leave both cards face up as a
miss. A miss SHALL stay visible until the next tap rather than being taken away by a
timer, and that next tap SHALL turn the missed cards back down and turn up the card it
landed on, so no tap is spent on tidying up. The exercise SHALL be complete when every
pair has been closed.

A block MAY declare a line spoken when a pair closes; where it does, that line SHALL be
spoken in place of the second card's own text, so the pair is heard whole.

The exercise SHALL count the tries taken and SHALL NOT score, rank, time or otherwise
judge the learner, and SHALL NOT take turns between the two people in the room: both play
the same board together.

#### Scenario: Turning up a card
- **WHEN** the learner taps a face-down card
- **THEN** the card turns up, shows its face, and what it shows is spoken

#### Scenario: Closing a pair
- **WHEN** the learner turns up a second card belonging to the same item as the first
- **THEN** both cards are locked face up, taken out of play, and cannot be turned back down

#### Scenario: A miss stays visible
- **WHEN** the learner turns up two cards belonging to different items
- **THEN** both stay face up, nothing is taken away, and no attempt is blocked

#### Scenario: The next tap clears the miss and starts the next try
- **WHEN** two mismatched cards are face up and the learner taps a third, face-down card
- **THEN** the two mismatched cards turn back down, the tapped card turns up, and it is the
  first card of the next try

#### Scenario: Tapping a card that is already up
- **WHEN** the learner taps a card that is turned up or already paired
- **THEN** nothing changes and no try is counted

#### Scenario: A closed pair that speaks a sentence
- **WHEN** the learner closes a pair in a block that declares a spoken line
- **THEN** that line is spoken once, naming both halves, rather than the second card's own
  text

#### Scenario: Nobody is scored against anybody
- **WHEN** the exercise is played in a room by the teacher and the student together
- **THEN** the exercise shows how many tries have been taken and shows no turn, no side
  and no per-person score

#### Scenario: Finding every pair
- **WHEN** the last pair is closed
- **THEN** the exercise is marked complete

### Requirement: Sentence-assembly exercise

A sentence-assembly exercise SHALL work through the selected items one at a time. For the
item on screen it SHALL render the sentence the block declares for that item and offer
that sentence's words shuffled, in an order both screens agree on. The learner SHALL tap
the words in the sentence's order: the next correct word SHALL join the sentence being
built; any other word SHALL be refused with visible feedback, and the words already placed
SHALL stay placed. Where the same word occurs twice in a sentence, tapping either copy of
it SHALL be accepted.

The sentence SHALL be grammatically correct for the item it was rendered for, including
the article before a vowel sound and the verb form for a plural item, exactly as the
sentence-building exercise renders it.

When the sentence is whole it SHALL be shown complete and spoken as one line rather than
word by word, and the exercise SHALL move to the next item on the learner's action rather
than on its own, so the finished sentence can be read and repeated. The exercise SHALL be
complete when a sentence has been built for every selected item.

#### Scenario: Placing the next word
- **WHEN** the learner taps the word that comes next in the sentence
- **THEN** it joins the sentence being built and leaves the offered words

#### Scenario: A word out of order
- **WHEN** the learner taps a word that does not come next
- **THEN** the tap is refused with visible feedback, the sentence keeps every word already
  placed, and the learner may try again immediately

#### Scenario: A sentence containing the same word twice
- **WHEN** the sentence contains a word twice and the learner taps either copy of it at the
  point where that word comes next
- **THEN** the word is accepted

#### Scenario: A finished sentence is heard whole
- **WHEN** the learner places the last word of the sentence
- **THEN** the whole sentence is shown as one line and spoken once, as a sentence rather
  than as its last word

#### Scenario: Moving to the next word of the lesson
- **WHEN** a sentence is finished and the learner acts to move on
- **THEN** the next item's sentence is offered, shuffled, with nothing carried over from
  the last one

#### Scenario: A finished sentence waits
- **WHEN** a sentence is finished and the learner does nothing
- **THEN** the finished sentence stays on screen and the exercise does not advance by itself

#### Scenario: Building for every word
- **WHEN** the last item's sentence is finished
- **THEN** the exercise is marked complete

## MODIFIED Requirements

### Requirement: Every exercise is driven by tapping

All exercises SHALL be operated by tapping: selecting a thing, then selecting where it
belongs. Dragging SHALL NOT be required anywhere. Tap targets SHALL be large enough for a
young child using a finger on a tablet, measured as the learner meets them on the screen
rather than as the exercise is laid out.

Freehand drawing over an exercise SHALL be the one exception to this, and SHALL never be a
way of answering: while a participant is drawing, their pointer input SHALL make marks
only, and SHALL NOT select, pair, flip, sort, or complete anything. No exercise SHALL
require a drawn mark to be answered or completed, and every exercise SHALL remain fully
answerable by tapping with nothing ever drawn on it.

#### Scenario: A pairing is made without dragging
- **WHEN** the learner taps a picture and then taps a word
- **THEN** the pairing is attempted, and at no point was a drag gesture necessary

#### Scenario: Drawing answers nothing
- **WHEN** a participant draws across the items of any exercise
- **THEN** marks are made, no selection or pairing is attempted, and the exercise's
  progress is unchanged

#### Scenario: Every exercise is completable without drawing
- **WHEN** each exercise the engine offers is played to completion by tapping alone
- **THEN** each completes as it does today and nothing was drawn

#### Scenario: A tap target measured on the screen, not in the layout
- **WHEN** an exercise is shown at the narrowest width the app supports, where what is laid
  out is shown smaller than it was laid out
- **THEN** everything the learner must tap is still large enough for a finger at the size it
  actually appears

### Requirement: An exercise speaks unasked only while the lesson's sound is on

Everywhere these exercises speak of their own accord — a revealed card, a tapped tile, a
completed pair, an item picked to sort, a chosen word and scaffold level, the word being
asked in a listening exercise, the instruction in a physical-response exercise, the line a
quiz declares for a correctly answered prompt, the sentence a description exercise produces
when both of its questions are answered, a card turned up in a memory exercise, a word
chosen from a label bank, a placement on a diagram, a sentence finished in an assembly
exercise — they SHALL do so only while the lesson's sound is on. Every control a learner
presses in order to hear a line SHALL speak it whether the sound is on or off; the control
on a phrase in a phrase-list exercise is such a control.

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
