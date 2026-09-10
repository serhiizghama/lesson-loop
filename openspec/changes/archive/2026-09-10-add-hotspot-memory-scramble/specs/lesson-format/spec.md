## ADDED Requirements

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
