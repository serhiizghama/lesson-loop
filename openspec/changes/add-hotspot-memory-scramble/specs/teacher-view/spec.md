## MODIFIED Requirements

### Requirement: The teacher sees the answer to the exercise on screen

The teacher's view SHALL show the answer to the current exercise, derived from the lesson's
own data rather than from anything a lesson author writes by hand: which items pair with
which, which bucket each item belongs in, which word is being asked, the sentence a
scaffold level produces for the selected item, where on a drawing each word belongs, where
the two halves of a face-down pair are lying, and the sentence being assembled. An exercise
with nothing to be right about SHALL show no key rather than an empty one.

Where the answer is a position rather than a word — a place on a drawing, a card on a board
— the key SHALL name it in words the teacher can say out loud over a video call, not as
coordinates.

#### Scenario: The key for a matching exercise
- **WHEN** a matching exercise is on screen in the teacher's view
- **THEN** the teacher sees which item on one side belongs with which on the other

#### Scenario: The key for a listening exercise
- **WHEN** a listening exercise is on screen
- **THEN** the teacher sees which picture the word currently being spoken names

#### Scenario: The key for a diagram-labelling exercise
- **WHEN** a diagram-labelling exercise is on screen
- **THEN** the teacher sees each word with where on the drawing it belongs, said in words,
  and which words have already been placed

#### Scenario: The key for a memory exercise
- **WHEN** a memory exercise is on screen
- **THEN** the teacher sees each pair with where its two cards are lying on the board, and
  which pairs have already been found

#### Scenario: The key for a sentence-assembly exercise
- **WHEN** a sentence-assembly exercise is on screen
- **THEN** the teacher sees the sentence being built right now, in full, and which
  sentences are already done

#### Scenario: An exercise with no answer
- **WHEN** a physical-response exercise, which scores nothing, is on screen
- **THEN** no answer key is shown and the space is not left empty-looking

#### Scenario: A lesson file gains no new field
- **WHEN** a lesson that predates the teacher's view is opened in it
- **THEN** its answer keys are complete, having been computed from the vocabulary and the
  exercise's own settings
