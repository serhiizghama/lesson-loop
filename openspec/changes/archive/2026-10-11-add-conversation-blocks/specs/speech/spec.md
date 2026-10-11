## MODIFIED Requirements

### Requirement: Every line a lesson can speak is known before the lesson runs

The set of lines a lesson can ever speak SHALL be derivable from the lesson's data alone,
without running the lesson and without a learner interacting with it. Adding a lesson
SHALL NOT require new code in order to know what it will say.

This is what makes a line preparable at all: a line that could only be discovered by
playing the lesson could never have been recorded in advance.

There SHALL be one named exception: the sentences a sentence-combining exercise builds.
Their combinations run to hundreds per lesson, and they SHALL be spoken by the device's
voice rather than prepared, at the teacher's choice. Every other line of the same exercise
and of every other exercise SHALL remain known in advance. The exception SHALL be stated
where lines are collected, so a new exercise cannot fall into it unnoticed.

#### Scenario: Enumerating a lesson's speech
- **WHEN** the lines a lesson can speak are collected from its data
- **THEN** the collection includes every line any of its exercises would speak, including
  those composed from a template and a vocabulary item

#### Scenario: A new lesson needs no new code to be enumerated
- **WHEN** a lesson is added as data only
- **THEN** its speakable lines can be collected by the same means as every other lesson's

#### Scenario: A combined sentence is left to the device voice
- **WHEN** the lines a lesson with a sentence-combining exercise can speak are collected
- **THEN** the combinations are not among them, and when one is heard it is spoken by the
  device's voice
