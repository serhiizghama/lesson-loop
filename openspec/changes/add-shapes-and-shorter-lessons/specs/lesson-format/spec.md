## ADDED Requirements

### Requirement: A lesson teaches one sitting's worth of vocabulary

A lesson file SHALL introduce no more than five new vocabulary items. A topic larger than
five words SHALL be expressed as more than one lesson file rather than as a longer lesson;
the format SHALL NOT gain a notion of parts, chapters or tabs to hold them together.

A lesson MAY carry vocabulary it does not teach, so that a later part of a topic can revise
an earlier one: the items it teaches are the ones its teaching blocks select, and its
revision blocks MAY select the whole list. What is capped is what a lesson introduces, not
what it contains.

#### Scenario: A topic larger than one sitting
- **WHEN** a topic has ten words to teach
- **THEN** it is expressed as two lesson files of five, each valid on its own, and no
  lesson file declares parts

#### Scenario: A later part revises an earlier one
- **WHEN** the second lesson of a topic carries all ten words but its teaching blocks
  select only its own five
- **THEN** the lesson is valid, it introduces five words, and its revision blocks may work
  over all ten

#### Scenario: A lesson that introduces too much
- **WHEN** a lesson file's teaching blocks select more than five items that no other block
  in the topic has taught
- **THEN** the lesson is reported as too long before it is played

### Requirement: A lesson may declare model phrases

A block SHALL be able to declare a list of model phrases as literal text — the sentences a
learner is meant to hear and repeat, which belong to the lesson rather than to any one
vocabulary item. A phrase list SHALL contain at least one phrase, and each phrase SHALL be
non-empty.

Literal phrases are the exception to expressing content through items and tags, and the
exception is deliberate: "Is it a square? — Yes, it is. / No, it isn't." is not a fact about
a square and cannot be rendered from one.

#### Scenario: A block declaring phrases
- **WHEN** a block declares its model phrases and the lesson is played
- **THEN** those phrases are presented in the order declared, from the lesson file alone

#### Scenario: An empty phrase list
- **WHEN** a block declares a phrase list with no phrases, or with an empty phrase in it
- **THEN** the lesson is rejected with a named error before anything is rendered

### Requirement: A quiz declares what it asks with and what it offers

A quiz block SHALL declare the face its prompt is drawn from and the face its choices are
shown by, and the two SHALL be different. Every item the block selects SHALL carry the
prompt face; a block whose prompt is a tag that a selected item does not carry SHALL be
rejected. The block MAY declare how many choices are offered.

#### Scenario: A quiz prompted by a tag
- **WHEN** a block asks with a tag every selected item carries and offers pictures as
  choices
- **THEN** the lesson is valid and each item is asked in turn

#### Scenario: A prompt face an item lacks
- **WHEN** a quiz asks with a tag that one of its selected items does not carry
- **THEN** the lesson is rejected, naming the block, the tag and the item

#### Scenario: A prompt and choices on the same face
- **WHEN** a quiz declares the same face for its prompt and its choices
- **THEN** the lesson is rejected, because the answer would be shown in the question

### Requirement: A description declares exactly two things to ask

A description block SHALL declare exactly two questions, each with the text of the question
and the face its answer is drawn from. Each face SHALL resolve to at least two distinct
values across the selected items, so that both questions have a real alternative; a face
that resolves to one value for every item SHALL be rejected. The two faces SHALL be
different.

Exactly two is a rule of the format, not a limit of the moment: a description exists to put
two facts in one sentence.

#### Scenario: A valid description
- **WHEN** a block asks for the shape and the colour, and the selected items carry at least
  two shapes and at least two colours
- **THEN** the lesson is valid and each item is asked both questions

#### Scenario: A question with only one possible answer
- **WHEN** every selected item carries the same value for one of the two faces
- **THEN** the lesson is rejected, naming the block and the face, because a question with
  one choice is not a question

#### Scenario: A description with a different number of questions
- **WHEN** a block declares one question, or three
- **THEN** the lesson is rejected before it is rendered

## MODIFIED Requirements

### Requirement: The format covers the teacher's existing material

The format SHALL be sufficient to express the teacher's existing Animals, Body Parts and
Shapes lessons in full, other than the labelled body diagram, the drill in which the teacher
awards a star for a spoken attempt, and the exercise in which the learner draws a shape and
marks their own work — with no lesson-specific code path anywhere in the system.

The three exceptions are named rather than open: each is deferred to a change of its own,
and each is deferred because it needs something the engine does not have — a diagram, a way
for the teacher to score, and a way to draw — rather than because the format could not
describe it.

#### Scenario: Both existing lessons run on the generic engine
- **WHEN** the Animals and Body Parts lessons are expressed in the format and played
- **THEN** every exercise they contained, except the labelled body diagram, behaves as it
  did in the original material, and no code branches on the identity of either lesson

#### Scenario: The Shapes material runs on the generic engine
- **WHEN** the teacher's Shapes material is expressed in the format and played
- **THEN** its vocabulary cards, its model phrases, its riddles, its shape-naming, its
  matching and its shape-and-colour questions all behave as they did in the original, and
  no code branches on the identity of the lesson

#### Scenario: A deferred exercise is absent rather than approximated
- **WHEN** the Shapes lessons are played
- **THEN** the teacher-scored speaking drill and the drawing exercise are simply not there,
  and nothing in the format half-implements them
