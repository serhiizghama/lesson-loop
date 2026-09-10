## MODIFIED Requirements

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
