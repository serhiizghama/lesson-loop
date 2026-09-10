## MODIFIED Requirements

### Requirement: Every exercise is driven by tapping

All exercises SHALL be operated by tapping: selecting a thing, then selecting where it
belongs. Dragging SHALL NOT be required anywhere. Tap targets SHALL be large enough for a
young child using a finger on a tablet.

Freehand drawing over an exercise SHALL be the one exception to this, and SHALL never be a
way of answering: while a participant is drawing, their pointer input SHALL make marks
only, and SHALL NOT select, pair, flip, sort, or complete anything. No exercise SHALL
require a drawn mark to be answered or completed, and every exercise SHALL remain fully
answerable by tapping with nothing ever drawn on it.

#### Scenario: A pairing is made without dragging
- **WHEN** the learner taps a picture and then taps a word
- **THEN** the pairing is attempted, and at no point was a drag gesture necessary

#### Scenario: Drawing answers nothing
- **WHEN** a participant draws across the items of any exercise
- **THEN** marks are made, no selection or pairing is attempted, and the exercise's
  progress is unchanged

#### Scenario: Every exercise is completable without drawing
- **WHEN** each of the six exercises is played to completion by tapping alone
- **THEN** each completes as it does today and nothing was drawn
