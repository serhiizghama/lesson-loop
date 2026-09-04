# speech Specification

## Purpose

Spoken English is what makes these exercises a language lesson rather than a picture game:
the learner hears the word before they are asked to recognise it. This capability covers
how the app speaks and how it behaves when the device will not let it.

## Requirements

### Requirement: English is spoken on demand at a learner's pace

The app SHALL speak English words and sentences when an exercise calls for it, in English,
at a rate slower than conversational speech so that a child can follow it.

#### Scenario: Speaking a word
- **WHEN** an exercise asks for a word to be spoken
- **THEN** the word is pronounced in English at the reduced learner rate

### Requirement: Speech is made available by the first user gesture

On platforms that permit speech only after a user interaction, the app SHALL arrange for
speech to be available from the learner's first tap onward, so that the first exercise
that calls for a word actually produces sound.

#### Scenario: First spoken word on a restricted platform
- **WHEN** the learner taps a card as their first interaction with the page, on a platform
  that requires a gesture before speaking
- **THEN** the word for that card is audible

### Requirement: A new utterance replaces the one in progress

Requesting speech while speech is already in progress SHALL stop the earlier utterance and
speak the new one. Utterances SHALL NOT accumulate in a queue.

#### Scenario: Tapping several cards quickly
- **WHEN** the learner taps four cards in rapid succession
- **THEN** only the last word is heard through to the end, and no backlog plays afterwards

### Requirement: Absent or broken speech degrades silently

Where speech is unsupported, disabled, or fails, the lesson SHALL remain fully playable.
The app SHALL NOT show an error, block progress, or prevent an exercise from completing.

#### Scenario: A device with no speech support
- **WHEN** the lesson is played on a device where speech is unavailable
- **THEN** every exercise, including the listening exercise, can still be completed and no
  error is shown to the learner

#### Scenario: The listening exercise without sound
- **WHEN** the listening exercise cannot speak its target
- **THEN** the target is made available in a readable form so the exercise is still
  answerable
