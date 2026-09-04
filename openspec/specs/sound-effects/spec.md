# sound-effects Specification

## Purpose

The non-speech sounds the app makes: the chime that marks a completed exercise and the
notes that bring the closing screen's stars in. This capability covers when the app makes
such a sound, that it needs no file and no network to do so, that it falls silent with the
rest of the lesson's sound, and how it behaves when the device will not play it.

## Requirements

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

### Requirement: Effects obey the lesson's sound setting

Every sound in this capability is one the app volunteers, and SHALL therefore be governed
by the single setting that decides whether the app makes itself heard unasked. While that
setting is off no effect SHALL sound, and a sound already in the air SHALL stop rather
than finish. Turning the setting back on SHALL NOT replay effects for moments that have
already passed: an effect marks something happening now, and a chime for an exercise
finished two exercises ago would be a lie about where the lesson is.

An effect withheld by the setting SHALL NOT be taken as evidence about the device: a
lesson told to be quiet and a device that cannot make sound are different conditions and
MUST NOT be confused for one another.

#### Scenario: A quiet lesson completes an exercise
- **WHEN** the sound setting is off and an exercise is completed
- **THEN** no chime is heard, and the visible celebration is exactly as it is with the
  setting on

#### Scenario: Turning the sound off mid-effect
- **WHEN** the notes of the closing screen are playing and the setting is turned off
- **THEN** they stop rather than finishing

#### Scenario: Turning the sound back on
- **WHEN** the setting is turned back on after exercises were completed while it was off
- **THEN** nothing sounds for those completions, and the next exercise completed chimes
  normally

#### Scenario: Silence by setting is not a broken device
- **WHEN** the setting has been off for a whole lesson
- **THEN** nothing about the device's ability to make sound is reported differently on
  account of it

### Requirement: Sound is available without a rehearsal

Where a platform permits sound only after a user interaction, the app SHALL make its
effects available from the interaction the learner has already made, so that the first
exercise that completes is actually heard. The app SHALL NOT play a silent or throwaway
sound in order to arm itself, and SHALL NOT ask the learner for a gesture whose only
purpose is to unlock sound.

A screen that has genuinely had no interaction — which is the normal condition of a
student's screen paced by the teacher — SHALL be made audible by the same explicit action
that offers to turn speech on, rather than by a second offer of its own.

#### Scenario: First chime after the learner has tapped
- **WHEN** the learner has tapped the page at least once, on a platform that requires a
  gesture before playing sound, and an exercise then completes
- **THEN** the chime for it is audible

#### Scenario: Nothing is played that was not asked for
- **WHEN** the page is opened and the learner makes their first tap
- **THEN** no sound is produced beyond what that tap called for

#### Scenario: A screen that has had no gesture at all
- **WHEN** the learner on such a screen takes the offer to turn sound on
- **THEN** effects are audible from then on, without a separate offer having been shown
  for them

### Requirement: Absent or blocked sound degrades silently

Where sound is unsupported, blocked, or fails, the lesson SHALL remain fully playable and
every celebration SHALL keep its visible part. The app SHALL NOT show an error or block
progress for want of sound. An effect SHALL NOT stop, delay or replace speech in progress,
in either direction: a line being spoken SHALL NOT be cut by a chime, and a chime SHALL
NOT keep a line from starting.

#### Scenario: A device with no sound
- **WHEN** the lesson is played on a device where sound cannot be produced
- **THEN** every exercise completes as normal, the visible celebration is unchanged and
  no error is shown

#### Scenario: The chime does not cut speech
- **WHEN** the chime plays while a line is being spoken
- **THEN** the line continues to its end

#### Scenario: Speech does not wait for the chime
- **WHEN** a line is requested while the chime is sounding
- **THEN** the line begins without waiting for the chime to finish
