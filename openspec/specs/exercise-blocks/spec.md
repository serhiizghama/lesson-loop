# exercise-blocks Specification

## Purpose

Defines the fixed set of interactions a lesson can be built from — what the learner taps,
what counts as right, and what they see when they are wrong. These six exercises are the
whole vocabulary of the engine: a lesson author arranges them, never invents one.

## Requirements

### Requirement: Every exercise is driven by tapping

All exercises SHALL be operated by tapping: selecting a thing, then selecting where it
belongs. Dragging SHALL NOT be required anywhere. Tap targets SHALL be large enough for a
young child using a finger on a tablet.

#### Scenario: A pairing is made without dragging
- **WHEN** the learner taps a picture and then taps a word
- **THEN** the pairing is attempted, and at no point was a drag gesture necessary

### Requirement: Feedback is immediate and never punitive

An incorrect answer SHALL produce visible, immediate feedback and SHALL leave the learner
free to try again. It SHALL NOT remove progress already earned, end the exercise, or block
further attempts.

#### Scenario: A wrong answer costs nothing
- **WHEN** the learner pairs two things that do not belong together
- **THEN** the mistake is shown, the selection is cleared, previously earned progress is
  intact, and the learner may try again immediately

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

#### Scenario: Hearing and answering
- **WHEN** a word is spoken and the learner taps the picture it names
- **THEN** the answer is accepted and the next word is spoken

#### Scenario: Asking to hear it again
- **WHEN** the learner asks to repeat the current word
- **THEN** the same word is spoken again and no answer is recorded

#### Scenario: A wrong picture
- **WHEN** the learner taps a picture other than the target
- **THEN** feedback is shown, the target does not change, and another attempt is allowed

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
