## Purpose

Lets the teacher decide how much of a topic one sitting teaches — five words or the whole
list — instead of that being settled in advance by how the content was filed. Covers what
she is offered, what lesson each choice produces, and how the choice survives an address,
a reload and a room.

## ADDED Requirements

### Requirement: A topic offers its sizes where it is opened

A topic that declares parts SHALL offer, at the moment it is opened, a choice of how much
of it to teach: each of its parts, and the whole topic. The choice SHALL be made where the
topic is chosen, without a screen of its own standing between the teacher and a lesson she
has already picked.

Each choice SHALL say what it teaches before it is taken — how many words the sitting
introduces and, for a part, which words those are — so the teacher is choosing a sitting
rather than a number. The whole-topic choice SHALL name the number of words it teaches
rather than a fixed figure, since topics differ in length.

A topic that declares no parts SHALL offer no choice and SHALL open as one lesson over all
its words. Nothing SHALL be shown to be chosen where there is only one thing to choose.

#### Scenario: A topic with two parts
- **WHEN** the teacher opens a topic of ten words declared as two parts of five
- **THEN** she is offered its first part, its second part and all ten, each saying how many
  words it teaches and which

#### Scenario: A topic with no parts
- **WHEN** the teacher opens a topic that declares no parts
- **THEN** the lesson starts over all of its words with nothing to choose first

#### Scenario: The whole-topic choice counts the topic
- **WHEN** a topic of ten words and a topic of eight words each offer the whole of
  themselves
- **THEN** one offers ten words and the other eight, neither offering a figure the topic
  does not have

### Requirement: A choice produces an ordinary lesson

Every choice SHALL produce a lesson that is complete and playable on its own: it SHALL
carry the words that choice teaches, every exercise that belongs to that sitting, and a
closing screen.

A part SHALL carry the vocabulary of the parts before it as well as its own, and SHALL
teach only its own. Its teaching exercises SHALL work over the words the part introduces;
its revision exercises MAY work over everything it carries. The first part SHALL therefore
be a lesson of its own words alone, and a later part a longer lesson that introduces the
same handful.

The whole-topic choice SHALL teach every word of the topic and SHALL carry every exercise
the topic declares.

The lesson a choice produces SHALL be indistinguishable, to everything that plays it, from
a lesson written out by hand: it SHALL declare no parts, and nothing that plays it SHALL
have to know what a part is.

It SHALL carry a name of its own, distinct from the names of the topic's other sizes,
because the lesson in play is identified by name wherever it is not carried: a room names
the lesson it is on rather than sending it. That name is the only thing about the choice
that travels — no message SHALL carry the choice as a setting, and nothing SHALL act on
it.

#### Scenario: The first part
- **WHEN** the first part of a ten-word topic is chosen
- **THEN** the lesson carries that part's five words, teaches those five, and no exercise
  in it works over a word the sitting has not introduced

#### Scenario: A later part revises what came before
- **WHEN** the second part of a ten-word topic is chosen
- **THEN** the lesson carries all ten words, its teaching exercises work over the second
  five, and its revision exercises may work over all ten

#### Scenario: What is played knows nothing of parts
- **WHEN** any choice is taken and the lesson is played
- **THEN** the lesson that is played declares no parts and selects no items by a part

#### Scenario: A size can be found again by name
- **WHEN** a participant joins a room that is teaching one part of a topic
- **THEN** that participant is playing the same lesson, resolved from the name the room
  gives it, and not the whole topic

### Requirement: Exercises belong to the sittings they suit

A lesson file SHALL be able to say which of its parts an exercise belongs to. An exercise
that says nothing SHALL belong to every sitting.

An exercise declared for one part SHALL appear when that part is chosen and SHALL NOT
appear when another part is chosen, even though that other part carries the same
vocabulary. This is what keeps a revision exercise out of the sitting that has nothing to
revise yet, and what lets model phrases quoting one part's words stay with that part.

The whole-topic choice SHALL carry every exercise the topic declares, in the order the file
declares them, whatever parts they name.

#### Scenario: A revision exercise waits for something to revise
- **WHEN** an exercise is declared for the second part only, and the first part is chosen
- **THEN** that exercise is not in the lesson

#### Scenario: Each part keeps its own phrases
- **WHEN** each part declares its own model phrases and the second part is chosen
- **THEN** the lesson carries the second part's phrases and not the first part's, although
  it carries the first part's words

#### Scenario: The whole topic carries everything
- **WHEN** the whole-topic choice is taken
- **THEN** every exercise of the file is present, in the file's order

### Requirement: The choice rides in the address

The lesson a choice produces SHALL have an address of its own, and that address SHALL name
the topic and the choice. Opening it SHALL open that lesson directly — cold, in a browser
that has never visited the app, with no prior navigation.

Reloading a lesson in progress SHALL return to the same choice rather than to the topic or
to a different size. A topic's own address, naming no choice, SHALL open the topic with its
sizes offered.

An address naming a choice the topic does not have SHALL be treated as an address the app
does not recognise: the app SHALL load and say so, rather than silently teaching a
different lesson.

#### Scenario: A size opened cold
- **WHEN** the address of a topic's second part is opened as the first request a browser
  makes to the app
- **THEN** that lesson opens, over that part

#### Scenario: Reloading keeps the size
- **WHEN** a lesson built from the first part is reloaded mid-lesson
- **THEN** the same lesson is shown, over the same words

#### Scenario: A size that does not exist
- **WHEN** an address names a part the topic does not declare
- **THEN** the app loads and says there is no such lesson, and no other lesson is started
  in its place

### Requirement: Changing the size starts the lesson again

Choosing a different size of a topic SHALL start a new lesson: its progress, its stars and
its exercise state SHALL begin empty rather than being carried over from the size just
left.

This SHALL hold whether the size is changed by going back to the topic or by opening
another size's address directly. Nothing from the abandoned lesson SHALL appear in the new
one.

#### Scenario: Switching between two sizes
- **WHEN** three exercises of the first part are completed and the whole topic is then
  chosen
- **THEN** the new lesson starts at its first exercise with no progress and no stars
  carried over

### Requirement: A room is opened on the lesson the size produced

A room SHALL be opened on the lesson the teacher has open, whatever size produced it,
carrying the progress made so far — as a room does for any lesson.

The student SHALL receive that lesson and no more: a part's room SHALL NOT put the topic's
other words in front of the student, and SHALL NOT offer the student a size to choose.
Whether the teacher may change the size while a room is open SHALL be answered by the rule
that already governs changing a room's lesson.

#### Scenario: A room on part two
- **WHEN** the teacher opens a room while teaching the second part of a topic
- **THEN** the student joins that lesson, over the words that lesson carries, with no
  choice of size offered

#### Scenario: The size does not travel as a setting
- **WHEN** a room is opened on any size
- **THEN** what reaches the room is the lesson itself, named after that size, and no
  message carries the choice as anything the room or the student acts on
