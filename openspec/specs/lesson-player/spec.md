# lesson-player Specification

## Purpose

The shell that runs a lesson from start to finish: which exercise is on screen, how the
learner moves between them, how much is done, and the closing celebration. It is also the
guarantee that a lesson never depends on the network to be usable.

## Requirements

### Requirement: A lesson plays as an ordered sequence of exercises

The player SHALL show exactly one exercise at a time, in the order the lesson declares,
and SHALL make it plain which exercise is showing and how many there are.

#### Scenario: Opening a lesson
- **WHEN** a lesson is opened
- **THEN** its first exercise is shown, along with an indication of position within the
  lesson

### Requirement: Navigation is free in both directions and preserves work

The learner SHALL be able to move to the next or the previous exercise at any time,
regardless of whether the current one is complete. Returning to an exercise SHALL restore
it exactly as it was left.

#### Scenario: Skipping ahead and coming back
- **WHEN** the learner leaves a half-finished matching exercise, moves forward, and comes
  back
- **THEN** the pairs already made are still made and the shuffled order is unchanged

#### Scenario: Moving on from an unfinished exercise
- **WHEN** the learner advances from an incomplete exercise
- **THEN** the next exercise is shown and no warning blocks the move

### Requirement: Progress is visible throughout

The player SHALL show overall lesson progress at all times, derived from how many
exercises are complete, and SHALL update it the moment an exercise completes.

#### Scenario: Progress advances on completion
- **WHEN** the learner completes an exercise in a lesson of five
- **THEN** the visible progress increases accordingly

### Requirement: Completing a lesson is celebrated

When every exercise in a lesson is complete, the player SHALL show a closing screen that
marks the achievement.

#### Scenario: Finishing the last exercise
- **WHEN** the final incomplete exercise is completed
- **THEN** the closing screen is reachable and reports the lesson as finished

### Requirement: An exercise can be reset without disturbing the lesson

Resetting an exercise SHALL return it to its initial state, including a freshly decided
presentation order, and SHALL leave every other exercise's progress untouched.

#### Scenario: Resetting one exercise
- **WHEN** an exercise is reset in a lesson where two others are already complete
- **THEN** that exercise is empty again and the two completed ones remain complete

### Requirement: The player works with no network at all

A lesson SHALL be startable, playable and completable with no network request after the
application has loaded. No exercise SHALL depend on a remote service to function.

#### Scenario: Playing offline
- **WHEN** the network is unavailable after the page has loaded
- **THEN** every exercise in the lesson behaves normally from first tap to closing screen

### Requirement: The layout serves a narrow window on a tablet

The player SHALL be usable in a window as narrow as 380 logical pixels without horizontal
scrolling or overlapping controls, because the learner most often has it beside a video
call.

#### Scenario: A narrow window
- **WHEN** the player is shown in a 380-pixel-wide viewport
- **THEN** all controls remain reachable, nothing overlaps, and the page does not scroll
  sideways
