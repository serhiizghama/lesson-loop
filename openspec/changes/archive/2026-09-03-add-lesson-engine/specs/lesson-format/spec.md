## Purpose

Defines the contract a lesson file must satisfy so that teaching a new topic costs a
vocabulary list rather than a new program. Everything a lesson needs — its words, its
pictures, its exercises and their order — lives in data that a non-programmer can read.

## ADDED Requirements

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

### Requirement: Blocks select their items by explicit reference

A block SHALL select the items it uses in one of three ways: an explicit list of item
identifiers, all items of the lesson, or every item carrying a named tag.

#### Scenario: Selecting by tag
- **WHEN** a block selects items carrying the tag `sound` and only some items carry it
- **THEN** the block operates on exactly the tagged items

#### Scenario: Selecting an explicit subset
- **WHEN** a block lists three item identifiers out of ten
- **THEN** the block operates on exactly those three, in the listed order

### Requirement: A malformed lesson is rejected loudly before it is played

The system SHALL validate a lesson before any part of it is shown. On failure it SHALL
report which lesson, which block and which field is at fault, and SHALL NOT render a
partial or blank lesson.

#### Scenario: A block references an unknown item
- **WHEN** a lesson contains a block referring to an item identifier that no item declares
- **THEN** validation fails, naming the block and the unknown identifier, and the lesson
  does not start

#### Scenario: A block references a tag nothing carries
- **WHEN** a sorting block sorts by a tag that no item in its selection carries
- **THEN** validation fails, naming the block and the tag

#### Scenario: A valid lesson passes silently
- **WHEN** a well-formed lesson is loaded
- **THEN** no warning is produced and the lesson starts

### Requirement: The format covers the teacher's existing material

The format SHALL be sufficient to express the teacher's existing Animals and Body Parts
lessons in full, other than the labelled body diagram, with no lesson-specific code path
anywhere in the system.

#### Scenario: Both existing lessons run on the generic engine
- **WHEN** the Animals and Body Parts lessons are expressed in the format and played
- **THEN** every exercise they contained, except the labelled body diagram, behaves as it
  did in the original material, and no code branches on the identity of either lesson
