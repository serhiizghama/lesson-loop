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

Arming speech SHALL NOT involve speaking a throwaway utterance. Nothing may be queued
that the app intends to discard, because cancelling an utterance that has been accepted
but not yet started can stop the device from speaking for the rest of the session. The
learner's first real word is what proves speech works; it is not preceded by a rehearsal.

#### Scenario: First spoken word on a restricted platform
- **WHEN** the learner taps a card as their first interaction with the page, on a platform
  that requires a gesture before speaking
- **THEN** the word for that card is audible

#### Scenario: Nothing is spoken that was not asked for
- **WHEN** the page is opened and the learner makes their first tap
- **THEN** the only utterance the device is given is the word that tap called for

### Requirement: A new utterance replaces the one in progress

Requesting speech while speech is already in progress SHALL stop the earlier utterance and
speak the new one. Utterances SHALL NOT accumulate in a queue.

Replacement SHALL NOT stop an utterance that has been accepted but has not yet begun
speaking. Where a word is already waiting to start, the incoming word SHALL replace it
without the device being asked to cancel mid-start.

#### Scenario: Tapping several cards quickly
- **WHEN** the learner taps four cards in rapid succession
- **THEN** only the last word is heard through to the end, and no backlog plays afterwards

#### Scenario: A second word arrives before the first has started
- **WHEN** a word is requested and another is requested a few milliseconds later, before
  the first has begun playing
- **THEN** the second word is heard, and the device is still able to speak every word
  requested after it

### Requirement: Absent or broken speech degrades silently

Where speech is unsupported, disabled, or fails, the lesson SHALL remain fully playable.
The app SHALL NOT show an error, block progress, or prevent an exercise from completing.

Silence toward the learner's progress is what is required here, not silence about the
device. The app MAY tell the learner that this device has no sound and offer to turn it
on, as long as no exercise becomes unanswerable and nothing is presented as an error.

#### Scenario: A device with no speech support
- **WHEN** the lesson is played on a device where speech is unavailable
- **THEN** every exercise, including the listening exercise, can still be completed and no
  error is shown to the learner

#### Scenario: The listening exercise without sound
- **WHEN** the listening exercise cannot speak its target
- **THEN** the target is made available in a readable form so the exercise is still
  answerable

#### Scenario: Losing speech mid-lesson
- **WHEN** speech stops working partway through a lesson
- **THEN** the learner keeps their progress, the exercise on screen stays answerable, and
  nothing is reported as an error

### Requirement: Speech confirms that it was heard

Asking the device to speak is not evidence that it spoke. The app SHALL observe every
request it makes and determine whether the device actually began playing it. A request
that reports a failure, or that does not begin within a short grace period, SHALL be
treated as proof that this device is not delivering sound, and speech SHALL report itself
unavailable from that moment on.

Where a source reports its refusal outright — as a prepared recording does when playback
is not permitted — that report SHALL be honoured immediately, without waiting out the
grace period. The grace period exists for a source that fails by going quiet, not as a
delay imposed on one that says so.

A device that never speaks and a device that speaks perfectly MUST NOT look the same to
the rest of the app.

#### Scenario: The engine accepts a word and never speaks it
- **WHEN** a word is requested and the device neither starts speaking it nor reports an
  error within the grace period
- **THEN** speech reports itself unavailable, and the exercises that depend on sound
  behave as they do on a device with no speech support

#### Scenario: The engine reports a failure
- **WHEN** a requested word fails
- **THEN** speech reports itself unavailable rather than continuing to accept words that
  will not be heard

#### Scenario: A word that is actually spoken
- **WHEN** a requested word begins playing
- **THEN** speech continues to report itself available and no fallback is offered

#### Scenario: A source that refuses out loud
- **WHEN** a prepared recording is refused permission to play
- **THEN** speech reports itself unavailable at once, rather than after the grace period

### Requirement: Speech prefers a prepared recording

Where a recording of the line exists, the app SHALL play it rather than ask the device to
synthesise the line. Where no recording exists, the app SHALL synthesise the line on the
device as before. Which source was used SHALL NOT change anything the learner can act on:
the same lines are spoken, at the same points in the lesson, and every exercise behaves
identically either way.

A line without a recording SHALL NOT be silent while the device can synthesise it, so a
lesson whose recordings have not been prepared is still fully playable.

#### Scenario: A line that has been prepared
- **WHEN** an exercise asks for a line that has a recording
- **THEN** the recording is played, and the device's own voice is not used

#### Scenario: A line that has not been prepared
- **WHEN** an exercise asks for a line that has no recording
- **THEN** the line is synthesised on the device and the exercise proceeds normally

#### Scenario: A lesson added without preparing its recordings
- **WHEN** a lesson is added and played before any recording has been made for it
- **THEN** every one of its exercises speaks, using the device's voice throughout

#### Scenario: A recording that will not play
- **WHEN** a recording exists but cannot be played on this device
- **THEN** the line is spoken by the device instead where that is possible, and the
  exercise remains answerable in either case

### Requirement: Every line a lesson can speak is known before the lesson runs

The set of lines a lesson can ever speak SHALL be derivable from the lesson's data alone,
without running the lesson and without a learner interacting with it. Adding a lesson
SHALL NOT require new code in order to know what it will say.

This is what makes a line preparable at all: a line that could only be discovered by
playing the lesson could never have been recorded in advance.

#### Scenario: Enumerating a lesson's speech
- **WHEN** the lines a lesson can speak are collected from its data
- **THEN** the collection includes every line any of its exercises would speak, including
  those composed from a template and a vocabulary item

#### Scenario: A new lesson needs no new code to be enumerated
- **WHEN** a lesson is added as data only
- **THEN** its speakable lines can be collected by the same means as every other lesson's

### Requirement: Speech reports what it is doing

The app SHALL be able to observe, at any moment, whether speech is idle, currently
speaking, or unavailable, and SHALL be notified when that changes. This is what lets a
control that speaks show whether it worked.

#### Scenario: A control reflects an utterance in flight
- **WHEN** a word starts being spoken and then finishes
- **THEN** the observable state moves to speaking and back to idle, and anything
  displaying that state updates without the learner interacting again

#### Scenario: A control reflects a device that fell silent
- **WHEN** speech becomes unavailable partway through a lesson
- **THEN** the observable state changes to unavailable, and anything displaying it
  updates without waiting for the next exercise

### Requirement: The learner can ask for sound to be turned on

Where speech is blocked because the device has not yet seen a user gesture — which is the
normal condition for a student whose screen is being paced by someone else — the app
SHALL provide an explicit action the learner can take that both supplies the gesture and
attempts to speak. The outcome SHALL be reported: sound now works, or it does not.

#### Scenario: A student's screen that has had no gesture
- **WHEN** the learner taps the action that turns sound on
- **THEN** the current word is spoken, and speech reports itself available from then on

#### Scenario: Turning sound on where it cannot work
- **WHEN** the learner taps the action that turns sound on and the device still does not
  speak
- **THEN** speech reports itself unavailable and the readable fallback is offered instead
