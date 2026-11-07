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
(*Do you like…?*, *Is this your…?*, *Do you want to go…?*), the hidden-item guessing game,
the blurred guess, the role-plays, the talk questions, choosing between two things and the
sentence combiner — SHALL be playable as exercises. The remaining exercises SHALL be
absent by name: the picture hunt, the three-times speaking meter, the spinning wheel, the
silly voices, and the survey and family album.
Each needs a mechanic the engine does not have, and nothing in the format half-implements
any of them.

The format SHALL also express the teacher's Clothes, At Home, School and Weather lessons, as
four topics, with no lesson-specific code path. Each topic SHALL offer her two halves of five
words as its parts, and the whole topic as her Review. Each word's sentence SHALL be carried
by the word itself, so a topic whose words do not share one frame — *It is sunny.*, *I see a
rainbow.* — needs no grammar in the engine.

Of those four lessons, looking and learning, listening and picking, matching, and building
the sentence SHALL be playable as exercises. Her Japanese sentences SHALL be carried as cards
the learner turns over, placed before the sentence is built. Her Say it! SHALL be carried as
one fixed prompt per word, without the random draw and without anything that counts or
scores what the learner says. Spell it SHALL be absent by name, deferred to a change of its
own because it needs a block the engine does not have, and nothing in the format
half-implements it.

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
- **THEN** it is played as an exercise of its own: a role-play shows its two roles and
  lets them swap, a choice between two things shows both pictures, and the talk questions
  climb their levels

#### Scenario: The blurred guess and the sentence combiner are played
- **WHEN** any of the four topics is played at its whole size
- **THEN** it contains a blurred-picture exercise and a sentence-combining exercise over
  its words

#### Scenario: The new lessons' deferred exercises are absent
- **WHEN** any size of the four new topics is played
- **THEN** none of the picture hunt, speaking meter, wheel, silly voices, survey or album
  appears in any form

#### Scenario: Her halves and her Review are the topic's sizes
- **WHEN** the Clothes, At Home, School or Weather topic is opened
- **THEN** the teacher is offered her first five words, her second five words and the whole
  topic of ten, and each half exercises only its own five words

#### Scenario: A word carries its own sentence
- **WHEN** a sentence is built in the Weather topic
- **THEN** it reads *It is sunny.*, *I see a rainbow.* and *I hear thunder.* exactly, and the
  difference comes from each word's own data

#### Scenario: A plural word is shown as more than one
- **WHEN** the learner sees the picture for shoes or boots
- **THEN** it shows two of them

#### Scenario: A picture names the word it teaches
- **WHEN** the learner sees the picture for fridge or garden
- **THEN** the fridge is a fridge rather than an ice cube, and the garden can be told apart
  from the park

#### Scenario: Her Japanese sentences are turned over
- **WHEN** the learner reaches the sentence cards of any size of these four topics
- **THEN** turning a card over shows the English sentence with her Japanese sentence and says
  the English aloud, and the Japanese is never read aloud

#### Scenario: Say it! prompts without scoring
- **WHEN** the learner reaches Say it! in any size of these four topics
- **THEN** each word gets one fixed prompt from her page, the same in every run, and nothing
  counts, scores or listens to what the learner says

#### Scenario: Spell it is absent rather than approximated
- **WHEN** any size of these four topics is played
- **THEN** no exercise asks the learner to assemble a word from its letters
