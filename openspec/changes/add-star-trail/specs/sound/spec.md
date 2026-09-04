## Purpose

The non-speech sounds the app makes: the chime that marks a completed exercise and the
notes that bring the closing screen's stars in. This capability covers when the app makes
such a sound, that it needs no file and no network to do so, and how it behaves when the
device will not play it.

## ADDED Requirements

### Requirement: A completed exercise and a finished lesson each have a sound

The app SHALL play a short, distinct sound when the exercise on screen completes, and a
rising sequence of notes as the closing screen's stars arrive, one note per gold star.
These sounds SHALL be produced on the device itself: no audio file SHALL be fetched and no
network request SHALL be made for them, so that a lesson with no network after load still
has them.

#### Scenario: The chime
- **WHEN** the exercise on screen completes
- **THEN** a short sound is heard within the same second and no network request is made

#### Scenario: The stars' notes
- **WHEN** the closing screen brings in five gold stars
- **THEN** five notes are heard, one with each star, each higher than the last

#### Scenario: A lesson with no network
- **WHEN** the network is unavailable after the page has loaded
- **THEN** the chime and the notes play exactly as they do with it

### Requirement: Sound is made available by the first user gesture

On platforms that permit sound only after a user interaction, the app SHALL arrange for
sound to be available from the learner's first tap onward, so that the first exercise
that completes is actually heard.

#### Scenario: First chime on a restricted platform
- **WHEN** the learner has tapped the page at least once, on a platform that requires a
  gesture before playing sound, and an exercise then completes
- **THEN** the chime for it is audible

### Requirement: Absent or blocked sound degrades silently

Where sound is unsupported, blocked, or fails, the lesson SHALL remain fully playable and
every celebration SHALL keep its visible part. The app SHALL NOT show an error or block
progress for want of sound. A sound SHALL NOT stop, delay or replace speech in progress.

#### Scenario: A device with no sound
- **WHEN** the lesson is played on a device where sound cannot be produced
- **THEN** every exercise completes as normal, the visible celebration is unchanged and
  no error is shown

#### Scenario: The chime does not cut speech
- **WHEN** the chime plays while a line is being spoken
- **THEN** the line continues to its end
