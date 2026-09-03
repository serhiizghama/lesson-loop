# lesson-state Specification

## Purpose

Defines how a learner's actions change what is on screen, in a way that produces the same
result on every device observing the same actions. This is what later allows a teacher's
screen and a student's screen to stay in agreement without either one being special.

## Requirements

### Requirement: Every interaction is an explicit, named action

Each meaningful interaction — tapping a card, choosing an item, placing it, advancing a
prompt — SHALL produce exactly one named action identifying the block it belongs to and
carrying only serialisable data. Progress-bearing state SHALL change only as the result of
an applied action.

#### Scenario: One tap, one action
- **WHEN** the learner taps a card once
- **THEN** exactly one action is produced, naming the block and the card

#### Scenario: State does not change on its own
- **WHEN** no action is applied for any length of time
- **THEN** the visible state of every block is unchanged

### Requirement: State transitions are deterministic

Applying the same action to the same prior state SHALL yield an identical next state, on
any device and at any time. A transition SHALL NOT read the clock, generate randomness, or
consult anything outside the state and the action.

#### Scenario: Replay reproduces state exactly
- **WHEN** a recorded sequence of actions is applied to the initial state twice, in two
  separate runs
- **THEN** both runs end in states that compare equal field by field

#### Scenario: Two devices agree
- **WHEN** two independent devices apply the same sequence of actions to the same initial
  state
- **THEN** both display the same thing

### Requirement: Randomised presentation order belongs to state

Where an exercise presents items in a shuffled order, that order SHALL be decided once
when the block is initialised and stored as part of the state, never re-derived at render
time.

#### Scenario: The order survives leaving and returning
- **WHEN** the learner leaves a shuffled block and returns to it
- **THEN** the items are in the same order as before

#### Scenario: Two observers see one order
- **WHEN** two devices hold the same block state
- **THEN** they present the shuffled items in the same order

### Requirement: State is plain serialisable data

The whole state of a lesson in progress SHALL be expressible as plain data containing no
functions, no element references and no class instances, and SHALL survive a serialise and
deserialise round trip unchanged.

#### Scenario: Round trip preserves behaviour
- **WHEN** a state mid-lesson is serialised, deserialised, and used to continue the lesson
- **THEN** the lesson continues exactly as it would have, with all progress intact

### Requirement: State carries a monotonically increasing version

The state SHALL carry a version that increases by one with every successfully applied
action, so that two holders of the state can tell whether they agree.

#### Scenario: Version advances with progress
- **WHEN** three actions are applied in succession
- **THEN** the version is three greater than it was

#### Scenario: A rejected action does not advance the version
- **WHEN** an action is rejected as invalid
- **THEN** the version is unchanged

### Requirement: Invalid actions are ignored, never fatal

An action naming an unknown block, an unknown item, or an interaction the block does not
offer SHALL leave the state unchanged and SHALL NOT interrupt the lesson.

#### Scenario: An action for a block that is not in this lesson
- **WHEN** an action names a block identifier the current lesson does not contain
- **THEN** the state is unchanged, the lesson continues, and nothing is thrown

#### Scenario: A stale action
- **WHEN** an action pairs two items that have already been paired
- **THEN** the state is unchanged and the learner sees no error
