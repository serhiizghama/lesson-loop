## MODIFIED Requirements

### Requirement: Exercises belong to the sittings they suit

A lesson file SHALL be able to say which of its parts an exercise belongs to. An exercise
that says nothing SHALL belong to every sitting.

An exercise declared for one part SHALL appear when that part is chosen and SHALL NOT
appear when another part is chosen, even though that other part carries the same
vocabulary. This is what keeps a revision exercise out of the sitting that has nothing to
revise yet, and what lets model phrases quoting one part's words stay with that part.

The whole-topic choice SHALL carry every exercise the topic declares, in the order the file
declares them, whatever parts they name.

An exercise MAY also name the whole topic, by the same word that names the whole-topic
choice in its address (`all`). An exercise naming only the whole topic SHALL appear when
the whole topic is chosen and in no part. This is what lets a topic whose parts are the
teacher's own halves keep, for the whole lesson, the exercises her halves did not have.
Because that word names the whole topic, no part SHALL be given it as its id.

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

#### Scenario: An exercise for the whole topic only
- **WHEN** an exercise names only the whole topic, and the second part is chosen
- **THEN** that exercise is not in the lesson, and it is in the lesson when the whole topic
  is chosen

#### Scenario: A part named like the whole
- **WHEN** a topic declares a part whose id is `all`
- **THEN** the file is reported as invalid before it is played
