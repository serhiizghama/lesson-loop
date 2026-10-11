## MODIFIED Requirements

### Requirement: The teacher sees the answer to the exercise on screen

The teacher's view SHALL show the answer to the current exercise, derived from the lesson's
own data rather than from anything a lesson author writes by hand: which items pair with
which, which bucket each item belongs in, which word is being asked, the sentence a scaffold
level produces for the selected item, the phrases a phrase list contains and which of them
have been heard, the item a quiz prompt names, both answers a description is asking for,
where on a drawing each word belongs, where the two halves of a face-down pair are lying,
the sentence being assembled, the true answer to a checked yes/no question with its reply,
the item a secret game is hiding, the item behind a blurred picture, the whole dialogue
of a role-play with the next line marked, the questions of each talk level, the pair each
preference round offers, and the sentence a combination makes. An exercise with nothing to be right about SHALL show no
key rather than an empty one.

The key SHALL keep the one uniform shape it already has — a title and rows of a label
against its answer, each row marked open, current or done — so that a block type added later
is teachable without a new branch in the panel.

Where the answer is a position rather than a word — a place on a drawing, a card on a board
— the key SHALL name it in words the teacher can say out loud over a video call, not as
coordinates.

#### Scenario: The key for a matching exercise
- **WHEN** a matching exercise is on screen in the teacher's view
- **THEN** the teacher sees which item on one side belongs with which on the other

#### Scenario: The key for a listening exercise
- **WHEN** a listening exercise is on screen
- **THEN** the teacher sees which picture the word currently being spoken names

#### Scenario: The key for a quiz
- **WHEN** a quiz is on screen
- **THEN** the teacher sees the prompt being asked against the choice that answers it, with
  the prompts already answered marked done and the one on screen marked current

#### Scenario: The key for a description
- **WHEN** a description exercise is on screen
- **THEN** the teacher sees both answers for the item being described, each marked
  according to whether it has been given yet

#### Scenario: The key for a phrase list
- **WHEN** a phrase-list exercise is on screen
- **THEN** the teacher sees every phrase the exercise contains, with the ones already heard
  marked done, so she can read ahead and model the next one

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

#### Scenario: The key for a yes/no question
- **WHEN** a yes/no exercise is on screen
- **THEN** the teacher sees, for each item, the question asked and — for a check — the true
  answer with its reply, with the items already answered marked done and the one on screen
  marked current

#### Scenario: The key for a secret game
- **WHEN** a secret game is on screen
- **THEN** the teacher sees which item is hidden in each round, with the rounds already won
  marked done and the round being played marked current, while the student's screen shows
  nothing of it

#### Scenario: The key for a blurred picture
- **WHEN** a blurred-picture exercise is on screen
- **THEN** the teacher sees which item each picture is, with the one being guessed marked
  current, while the student's screen shows only the blur

#### Scenario: The key for a role-play
- **WHEN** a role-play is on screen
- **THEN** the teacher sees the whole dialogue for the current item, with the lines already
  shown marked done and the next one marked current, so she can lead it

#### Scenario: The key for talk questions
- **WHEN** a talk exercise is on screen
- **THEN** the teacher sees the questions of every level, with the ones asked marked done
  and the one on screen marked current

#### Scenario: The keys with no right answer
- **WHEN** a preference or sentence-combining exercise is on screen
- **THEN** the teacher sees what is being chosen between, or the sentence the choices make,
  without anything marked right or wrong

#### Scenario: An exercise with no answer
- **WHEN** a physical-response exercise, which scores nothing, is on screen
- **THEN** no answer key is shown and the space is not left empty-looking

#### Scenario: A lesson file gains no new field
- **WHEN** a lesson that predates the teacher's view is opened in it
- **THEN** its answer keys are complete, having been computed from the vocabulary and the
  exercise's own settings
