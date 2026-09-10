# exercise-blocks Specification

## Purpose

Defines the fixed set of interactions a lesson can be built from — what the learner taps,
what counts as right, and what they see when they are wrong. These exercises are the whole
vocabulary of the engine: a lesson author arranges them, never invents one.

## Requirements

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

### Requirement: Feedback is immediate and never punitive

An incorrect answer SHALL produce visible, immediate feedback and SHALL leave the learner
free to try again. It SHALL NOT remove progress already earned, end the exercise, or block
further attempts.

#### Scenario: A wrong answer costs nothing
- **WHEN** the learner pairs two things that do not belong together
- **THEN** the mistake is shown, the selection is cleared, previously earned progress is
  intact, and the learner may try again immediately

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

### Requirement: Card exercise

A card exercise SHALL present the selected items as cards showing one face. Tapping a card
SHALL reveal its other faces and speak. What is spoken SHALL be the line the block declares
for its items, or the English word where the block declares none, so that a card teaching a
tag is heard as that tag and not as the word. The exercise SHALL be complete when every
card has been revealed at least once.

#### Scenario: Revealing a card
- **WHEN** the learner taps a card showing a picture
- **THEN** the card reveals its written forms and the English word is spoken

#### Scenario: A card that teaches a tag
- **WHEN** the learner taps a card in a block declaring a spoken line that reads a tag,
  such as the sound an animal makes
- **THEN** that line is spoken, sound and all, rather than the English word on its own

#### Scenario: Completing the set
- **WHEN** the last unrevealed card is revealed
- **THEN** the exercise is marked complete

### Requirement: Matching exercise

A matching exercise SHALL present two columns of the same items, each column showing a
different face, each independently shuffled. The learner SHALL tap one side and then the
other. A correct pair SHALL be locked in and removed from play; an incorrect pair SHALL be
rejected and the selection cleared. The exercise SHALL be complete when all pairs are made.

Tapping a tile SHALL speak what that tile shows, naming a picture by its English word and
leaving a first-language gloss unspoken. A block MAY declare a line spoken when a pair is
completed; where it does, that line SHALL be spoken in place of the tapped tile's own text,
so the pair is heard whole and the answer is not given away before it is made.

#### Scenario: A correct pair
- **WHEN** the learner taps a picture and then the word naming it
- **THEN** the pair is locked in, shown as matched, and can no longer be selected

#### Scenario: An incorrect pair
- **WHEN** the learner taps a picture and then a word that does not name it
- **THEN** the attempt is refused with visible feedback, both stay in play, and the
  selection is cleared

#### Scenario: Selecting twice on the same side
- **WHEN** the learner taps a picture and then taps a different picture
- **THEN** the selection moves to the second picture rather than attempting a pair

#### Scenario: Hearing the side that carries the theme
- **WHEN** the learner taps a tile showing a tag, such as the sound an animal makes
- **THEN** that sound is spoken rather than nothing

#### Scenario: A completed pair in a themed match
- **WHEN** the learner completes a pair in a block that declares a spoken line
- **THEN** that line is spoken once, naming both halves of the pair

### Requirement: Sentence-building exercise

A sentence exercise SHALL let the learner choose one item and then choose among ordered
scaffold levels, from the bare word up to a full sentence. The rendered sentence SHALL be
grammatically correct for the chosen item, including the article before a vowel sound and
the verb form for an item that is plural. The learner SHALL be able to hear the current
sentence spoken.

#### Scenario: Article before a vowel
- **WHEN** the learner selects an item whose English word begins with a vowel sound and
  chooses the "It is a…" level
- **THEN** the sentence reads with "an", not "a"

#### Scenario: A plural item
- **WHEN** the learner selects an item that names a pair or a set, such as eyes
- **THEN** the sentence uses the plural verb form rather than the singular

#### Scenario: Growing the sentence
- **WHEN** the learner moves from the first level to the third for the same item
- **THEN** the displayed sentence grows accordingly and the item selection is preserved

### Requirement: Sorting exercise

A sorting exercise SHALL present items and a fixed set of labelled buckets, and sort by a
named tag. The learner SHALL tap an item and then a bucket. A correct placement SHALL
stick; an incorrect one SHALL be refused with feedback. The exercise SHALL be complete when
every item is placed.

#### Scenario: A correct placement
- **WHEN** the learner taps an item and then the bucket matching its tag
- **THEN** the item settles into that bucket and leaves the unplaced pool

#### Scenario: An incorrect placement
- **WHEN** the learner taps an item and then a bucket that does not match its tag
- **THEN** the placement is refused with visible feedback and the item stays unplaced

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

### Requirement: Physical-response exercise

A physical-response exercise SHALL present one spoken instruction at a time, drawn from
the selected items, and advance to the next on demand. It SHALL NOT score answers, because
the learner performs it with their body rather than on screen.

#### Scenario: Advancing through instructions
- **WHEN** the exercise is started and then advanced twice
- **THEN** three distinct instructions have been given, each spoken aloud

#### Scenario: Nothing to be wrong about
- **WHEN** the learner performs the instruction off screen
- **THEN** the exercise records no correct or incorrect answer

### Requirement: Each exercise reports its own completion

Every exercise SHALL expose whether it is complete, on the same terms for all types, so
that lesson progress can be computed without knowing which kinds of exercise a lesson
contains.

#### Scenario: Progress does not depend on exercise type
- **WHEN** a lesson contains exercises of several different types
- **THEN** its overall progress is derived uniformly from their completion, with no
  per-type special case

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
