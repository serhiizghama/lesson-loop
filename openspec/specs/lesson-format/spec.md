# lesson-format Specification

## Purpose

Defines the contract a lesson file must satisfy so that teaching a new topic costs a
vocabulary list rather than a new program. Everything a lesson needs — its words, its
pictures, its exercises and their order — lives in data that a non-programmer can read.

## Requirements

### Requirement: A lesson is self-contained data

A lesson SHALL be a single data file declaring its identity (id, title, icon), its target
audience, an optional first language for glosses, an ordered list of vocabulary items, and
an ordered list of exercise blocks. Adding a lesson SHALL require no code change.

#### Scenario: A new topic is added without touching code
- **WHEN** a well-formed lesson file for a topic the system has never seen is added to the
  lesson collection
- **THEN** the lesson is listed and fully playable, and no source file other than the
  lesson data has changed

#### Scenario: The lesson declares its own order
- **WHEN** a lesson lists its blocks in a given order
- **THEN** the learner encounters those blocks in exactly that order

### Requirement: Vocabulary items carry every face an exercise can show

Each vocabulary item SHALL provide an identifier, an English word and a picture, and MAY
additionally provide a first-language gloss with its romanisation, an example sentence,
and a map of free-form tags. Any exercise SHALL be able to display an item by any of these
faces without the lesson author writing code.

#### Scenario: An item without a first-language gloss
- **WHEN** an item omits the gloss and the lesson is played
- **THEN** the item renders with its remaining faces and no empty placeholder or error
  appears

#### Scenario: The same item shown by different faces in different blocks
- **WHEN** one block shows an item as a picture and another shows the same item as its
  written English word
- **THEN** both render from the same single item definition

### Requirement: Themed exercises are expressed through tags, not through new block types

Themed teaching material — the sound an animal makes, the habitat it lives in, the
movement it suggests — SHALL be carried as tags on vocabulary items and consumed by the
generic block types. The format SHALL NOT require a dedicated block type per theme.

#### Scenario: Two themed exercises from one vocabulary list
- **WHEN** a lesson defines items tagged with both a sound and a habitat
- **THEN** a matching block over the sound tag and a sorting block over the habitat tag
  are both expressible without introducing any new block type

#### Scenario: A themed block declares what it says aloud
- **WHEN** a block declares the line it speaks as a template reading a tag, such as
  `{article} {en} says {tag:sound}!`
- **THEN** the line is filled per item from the same vocabulary list, with no code written
  for that theme, and validation rejects the lesson if a selected item lacks the tag

### Requirement: Blocks select their items by explicit reference

A block SHALL select the items it uses in one of four ways: an explicit list of item
identifiers, all items of the lesson, every item carrying a named tag, or the items the
sitting is teaching.

The last of these is what lets one authored block serve every size a topic offers: the
words a sitting teaches differ between one part and another, and a block that names them
by identifier can serve only the sitting it was written for. Selecting all items SHALL
continue to mean every item the lesson carries — which, for a part that revises the parts
before it, is more than that part teaches.

The selector for what a sitting teaches SHALL exist only in a lesson file. A lesson that
has been built for a size SHALL contain no such selector, having had it resolved to the
items it names.

#### Scenario: Selecting by tag
- **WHEN** a block selects items carrying the tag `sound` and only some items carry it
- **THEN** the block operates on exactly the tagged items

#### Scenario: Selecting an explicit subset
- **WHEN** a block lists three item identifiers out of ten
- **THEN** the block operates on exactly those three, in the listed order

#### Scenario: Selecting what the sitting teaches
- **WHEN** a block selects the items the sitting teaches, in a topic of two parts of five,
  and the second part is chosen
- **THEN** the block operates on that part's five words, and not on the ten the lesson
  carries

#### Scenario: The selector does not survive into a built lesson
- **WHEN** a lesson is built for any size
- **THEN** no block in it selects by what the sitting teaches, and every selection it
  carries names items, a tag, or all of them

### Requirement: A malformed lesson is rejected loudly before it is played

The system SHALL validate a lesson before any part of it is shown. On failure it SHALL
report which lesson, which block and which field is at fault, and SHALL NOT render a
partial or blank lesson.

A topic SHALL be validated at every size it offers, not only as it is written. A file
whose parts each declare their own items can be sound as a whole and unsound as a sitting
— a sorting exercise whose buckets all fill from one part is no question at all once that
part is played alone, and an exercise asking for more pairs than the sitting carries cannot
be finished. Such a file SHALL be rejected, naming the size at fault as well as the block,
because the failure belongs to a lesson nobody has written down.

A part SHALL name only items the topic declares, and no item SHALL be named by two parts.

#### Scenario: A block references an unknown item
- **WHEN** a lesson contains a block referring to an item identifier that no item declares
- **THEN** validation fails, naming the block and the unknown identifier, and the lesson
  does not start

#### Scenario: A block references a tag nothing carries
- **WHEN** a sorting block sorts by a tag that no item in its selection carries
- **THEN** validation fails, naming the block and the tag

#### Scenario: A size that cannot be played
- **WHEN** a topic is sound as written, but one of its parts leaves a sorting block with
  only one bucket that any of its items falls into
- **THEN** validation fails, naming that part as well as the block, and no size of the
  topic is offered

#### Scenario: A part that names an item twice over
- **WHEN** two parts of a topic both name the same item, or a part names an item the topic
  does not declare
- **THEN** validation fails, naming the part and the item

#### Scenario: A valid lesson passes silently
- **WHEN** a well-formed lesson is loaded
- **THEN** no warning is produced and the lesson starts
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

### Requirement: A lesson teaches one sitting's worth of vocabulary

A topic SHALL be one file. A topic larger than one sitting SHALL declare its parts within
that file rather than being split across files, and each part SHALL name its own items and
carry a title of its own.

What a sitting introduces SHALL be a part, or the whole topic when the whole topic is
asked for. A file SHALL NOT dictate which of those a given lesson is: the size is chosen
when the topic is opened, and the file's job is to declare the sizes that are available.

A part SHALL carry the vocabulary of the parts before it and SHALL teach only its own:
teaching blocks select what the sitting teaches, and revision blocks MAY select everything
the lesson carries. What is capped is what a sitting introduces, not what it contains.

A block MAY declare the parts it belongs to. A block that declares none SHALL belong to
every sitting.

#### Scenario: A topic larger than one sitting
- **WHEN** a topic has ten words to teach
- **THEN** it is one file declaring two parts of five, each part playable on its own, and
  no second file exists for it

#### Scenario: A later part revises an earlier one
- **WHEN** the second part of a topic is played
- **THEN** the lesson carries all ten words, introduces five, and its revision blocks may
  work over all ten

#### Scenario: A lesson that introduces too much
- **WHEN** a part of a topic names more items than a sitting should introduce
- **THEN** the file is reported as declaring too long a part before it is played

#### Scenario: A topic that needs no parts
- **WHEN** a topic short enough for one sitting declares no parts
- **THEN** the file is valid and the topic is taught as a single lesson over all its words

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

### Requirement: A labelled diagram names a drawing the app carries

A diagram-labelling block SHALL name one of the drawings — scenes — that the app carries,
and SHALL place each of its selected items on that drawing itself, as a rectangle given in
fractions of the drawing's width and height. The drawing is artwork and a coordinate space
and nothing else: a scene SHALL NOT decide what is asked, what is correct, or which items
appear, all of which stay in the lesson.

This is a deliberate, narrow exception to "adding a lesson requires no code change": a
lesson that labels a drawing the app already has SHALL be data alone, while a lesson that
needs a drawing nobody has made yet SHALL require that drawing to be added to the app.

A lesson SHALL be rejected before it is played when it names a scene the app does not
carry, when a selected item has no place on the drawing, when a place falls outside the
drawing or has no width or height, or when two selected items are given places the learner
could not tell apart.

#### Scenario: A second lesson labels the same drawing
- **WHEN** a new lesson names an existing scene and gives its own items their places on it
- **THEN** the lesson is fully playable and no source file other than the lesson data has
  changed

#### Scenario: The same drawing labelled with different words
- **WHEN** two lessons name the same scene but select different items and place them
  differently
- **THEN** each plays with its own words in its own places, from one drawing

#### Scenario: A drawing nobody has made
- **WHEN** a lesson names a scene the app does not carry
- **THEN** the lesson is rejected before anything is rendered, and the message names the
  block and the unknown scene

#### Scenario: An item with nowhere to go
- **WHEN** a diagram-labelling block selects an item it gives no place for
- **THEN** the lesson is rejected, and the message names the block and the item

#### Scenario: A place off the drawing
- **WHEN** a place is declared outside the bounds of the drawing, or with no width or height
- **THEN** the lesson is rejected, and the message names the block and the item whose place
  is wrong

#### Scenario: Two words on one place
- **WHEN** a block selects two items and gives them the same place on the drawing
- **THEN** the lesson is rejected, and the message names the block and both items, because
  one of the two words could never be placed

### Requirement: A memory exercise declares the two faces it turns up

A memory block SHALL declare the two faces its cards show — a picture against the written
word, a word against its first-language gloss, a picture against a tag — the number of
pairs it wants when that is fewer than the items it selects, and optionally the line spoken
when a pair closes. The same rules that hold for a matching block SHALL hold here: a lesson
SHALL be rejected when a selected item cannot render one of the declared faces, when more
pairs are asked for than there are items, or when a declared line reads a tag a selected
item does not carry.

#### Scenario: Pairing a picture with a word
- **WHEN** a memory block declares a picture on one face and the English word on the other
- **THEN** each selected item is laid out twice, once as each face

#### Scenario: Fewer pairs than words
- **WHEN** a memory block over ten items asks for six pairs
- **THEN** exactly six items are laid out, chosen the same way on both screens

#### Scenario: More pairs than words
- **WHEN** a memory block over five items asks for six pairs
- **THEN** the lesson is rejected, and the message names the block

#### Scenario: A face an item cannot show
- **WHEN** a memory block pairs on a first-language gloss and one selected item has none
- **THEN** the lesson is rejected, and the message names the block, the face and the item

### Requirement: A sentence-assembly exercise declares its sentence as a template

A sentence-assembly block SHALL declare the sentence it asks for as one template, filled
per selected item from the same vocabulary the rest of the lesson uses, with the same
placeholders every other template accepts. The sentence SHALL NOT be written out per item,
and free text unattached to a vocabulary item SHALL NOT enter this block type — a lesson
that needs a sentence belonging to no item has a phrase list for that.

A lesson SHALL be rejected when the template reads a tag a selected item does not carry, or
when it renders to fewer than two words for any selected item, since a one-word sentence is
nothing to assemble.

#### Scenario: One template, every word of the lesson
- **WHEN** a block declares `{this} {be} my {en}.` over ten items
- **THEN** ten sentences are built from that one line, each grammatical for its own item

#### Scenario: A template reading a tag nothing carries
- **WHEN** the template reads a tag that a selected item does not have
- **THEN** the lesson is rejected, and the message names the block, the tag and the item

#### Scenario: A sentence with nothing to assemble
- **WHEN** a template renders to a single word for some item
- **THEN** the lesson is rejected, and the message names the block and that item
