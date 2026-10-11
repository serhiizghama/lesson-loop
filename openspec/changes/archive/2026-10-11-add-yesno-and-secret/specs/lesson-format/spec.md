## MODIFIED Requirements

### Requirement: The format covers the teacher's existing material

The format SHALL be sufficient to express the teacher's existing Animals, Body Parts and
Shapes lessons in full, including the labelled body diagram, and other than the drill in
which the teacher awards a star for a spoken attempt and the exercise in which the learner
draws a shape and marks their own work — with no lesson-specific code path anywhere in the
system.

The two remaining exceptions are named rather than open: each is deferred to a change of
its own, and each is deferred because it needs something the engine does not have — a way
for the teacher to score a person, and a block built on the drawing rather than a use of it
— rather than because the format could not describe it.

The labelled body diagram was the third such exception and is no longer one: the words it
asks for and where each belongs are lesson data, and the only thing the app supplies is the
drawing itself.

The format SHALL also express the teacher's Fruit Talk (with its two halves), Drink Talk,
This Is My Family and Let's Go to the Zoo lessons, as four topics, with no lesson-specific
code path. Each of these lessons is built on one sentence frame — *I like …*, *This is my
…*, *Let's go …* — and the frame SHALL be lesson data: a word's irregular form within the
frame (*to the park*, *to school*, *home*) and its pronoun (*He*, *She*) are carried by the
item, never decided by the engine.

Of those four lessons, the exercises that practise the frame — meeting the words with
their syllables, the sentence and its longer form, listening for a word, assembling the
sentence, the clue riddles, choosing which pattern a place takes, asking and answering
(*Do you like…?*, *Is this your…?*, *Do you want to go…?*) and the hidden-item guessing
game — SHALL be playable as exercises. The remaining dialogues — the role-plays, choosing
between two things and the talk questions — SHALL be carried as their model sentences,
which the learner hears and says, without the interaction the original wrapped around
them. The remaining exercises SHALL be absent by name: the picture hunt, the three-times
speaking meter, the spinning wheel, the silly voices, the blurred guess, the free sentence
combiner, and the survey and family album.
Each needs a mechanic the engine does not have, and nothing in the format half-implements
any of them.

#### Scenario: Both existing lessons run on the generic engine
- **WHEN** the Animals and Body Parts lessons are expressed in the format and played
- **THEN** every exercise they contained, the labelled body diagram included, behaves as it
  did in the original material, and no code branches on the identity of either lesson

#### Scenario: The Shapes material runs on the generic engine
- **WHEN** the teacher's Shapes material is expressed in the format and played
- **THEN** its vocabulary cards, its model phrases, its riddles, its shape-naming, its
  matching and its shape-and-colour questions all behave as they did in the original, and
  no code branches on the identity of the lesson

#### Scenario: The body diagram is lesson data
- **WHEN** the Body Parts lesson labels the body
- **THEN** which words are asked for and where each one belongs come from the lesson file,
  and the only thing the app supplies is the drawing itself

#### Scenario: A deferred exercise is absent rather than approximated
- **WHEN** the Shapes lessons are played
- **THEN** the teacher-scored speaking drill and the drawing exercise are simply not there,
  and nothing in the format half-implements either

#### Scenario: The teacher's two halves are the topic's two parts
- **WHEN** the Fruit Talk topic is opened
- **THEN** the teacher is offered her first half (oranges and pears), her second half
  (grapes and watermelons) and the whole topic, and the whole topic is her full lesson

#### Scenario: A sentence frame with an irregular slot
- **WHEN** a place's sentence is built or assembled in Let's Go
- **THEN** it reads *Let's go to the park.*, *Let's go to school.* and *Let's go home.*
  exactly, and the difference comes from each place's own data

#### Scenario: A pronoun comes from the word
- **WHEN** the longer sentence about a family member is built
- **THEN** it says *He* for grandpa, dad and brother and *She* for grandma, mom and sister,
  and the choice comes from each word's own data

#### Scenario: Which pattern a place takes
- **WHEN** the learner sorts the places by the pattern they take
- **THEN** the park and the zoo belong with *to the*, school with *to*, and home with
  neither, and a wrong placement is refused as in any sorting exercise

#### Scenario: Asking and answering is played, not recited
- **WHEN** an ask-and-answer or *Is this your…?* exercise of these lessons is played
- **THEN** the learner sees a picture with a question about it and answers *Yes* or *No*,
  and the full reply follows

#### Scenario: The hidden-item game is played
- **WHEN** Drink Talk, My Family or Let's Go is played
- **THEN** it contains a secret game over its words, whose lines ask that lesson's own
  question

#### Scenario: A dialogue is carried as its sentences
- **WHEN** a role-play, this-or-that or talk-time exercise of these lessons is played
- **THEN** its lines are model phrases the learner can hear on a tap, and no role swap or
  question levels are shown

#### Scenario: The new lessons' deferred exercises are absent
- **WHEN** any size of the four new topics is played
- **THEN** none of the picture hunt, speaking meter, wheel, silly voices, blurred guess,
  free combiner, survey or album appears in any form

## ADDED Requirements

### Requirement: A yes/no question declares its question and both replies

A yes/no exercise SHALL declare:

- its question and its two replies, each as a sentence template;
- whether the question has a right answer.

In a check, the question SHALL be rendered for the item it names, and each reply for the
item shown. A check SHALL select at least two items, because otherwise no question can be
false. A lesson SHALL be rejected before it is played when any of these is missing or
empty, or when a template reads a tag that a selected item does not carry.

#### Scenario: A check over one word
- **WHEN** a checked yes/no exercise selects a single item, at any size the topic offers
- **THEN** the file is reported as invalid, naming the block and the size

#### Scenario: A reply that reads a missing tag
- **WHEN** a reply template reads a tag that one of the selected items lacks
- **THEN** the file is reported as invalid, naming the block, the item and the tag

### Requirement: A secret game declares its lines and how many rounds it plays

A secret game SHALL declare:

- the line spoken for a wrong guess, as a sentence template rendered for the guessed item;
- the line spoken when the secret is found, rendered for the secret;
- how many rounds it plays.

The number of rounds SHALL be at least one and SHALL NOT exceed the number of selected
items, since each round hides a different item. The game SHALL select at least two items,
because a game with one tile has nothing to guess. A lesson SHALL be rejected before it is
played when any of these does not hold, at any size the topic offers.

#### Scenario: More rounds than items
- **WHEN** a secret game declares three rounds and a size of the topic gives it two items
- **THEN** the file is reported as invalid, naming the block and the size
