## ADDED Requirements

### Requirement: One setting decides whether the app speaks unasked

The app SHALL hold, for the lesson in play, a single setting deciding whether lines are
spoken without anyone asking for them. It SHALL start on, so a lesson behaves as it always
has until the setting is changed.

While the setting is off:

- No line the app would speak of its own accord SHALL be spoken, whatever the exercise and
  whatever prompted it — a reveal, a tap, a completed pair, a new target, a new
  instruction, a re-rendered sentence.
- Any line already being spoken SHALL stop at the moment the setting is turned off, rather
  than finishing.
- A line the learner explicitly asked to hear SHALL still be spoken. The setting governs
  what the app volunteers, never what it is asked for.

A line suppressed by the setting SHALL NOT count as evidence about the device: speech
SHALL NOT report itself unavailable, and SHALL NOT offer a fallback, because a line was
withheld. A device that will not speak and a lesson that was told to be quiet are
different conditions and MUST NOT be confused for one another.

Where the exercise on screen has a standing spoken prompt — a line it would speak on being
reached, rather than in answer to a tap that has already passed — turning the setting back
on SHALL cause that prompt to be spoken, on every screen showing it, without any further
interaction.

#### Scenario: An exercise falls silent
- **WHEN** the setting is turned off and the learner then reveals a card, taps a tile,
  completes a pair and picks an item to sort
- **THEN** nothing is spoken for any of them

#### Scenario: A word in flight when the setting is turned off
- **WHEN** a line is being spoken and the setting is turned off
- **THEN** the line stops rather than finishing

#### Scenario: Asking to hear something with the setting off
- **WHEN** the setting is off and the learner presses a control whose purpose is to hear a
  line
- **THEN** that line is spoken

#### Scenario: Silence is not a broken device
- **WHEN** the setting has been off for a whole exercise
- **THEN** speech still reports itself as it did before, no written fallback is offered on
  its account, and turning the setting back on speaks normally

#### Scenario: Turning it back on where a prompt is standing
- **WHEN** the setting is turned on while an exercise whose question is a spoken word is
  on screen
- **THEN** that word is spoken without anyone tapping anything

#### Scenario: Turning it back on where the last line answered a tap
- **WHEN** the setting is turned on while an exercise that speaks only in answer to taps
  is on screen
- **THEN** nothing is spoken until the next tap

### Requirement: A line declares why it is being spoken

Every request for speech SHALL carry which of two things it is: a line the app is
volunteering, or a line the learner asked for. The setting SHALL be applied in one place
over that declaration, and no exercise SHALL carry its own copy of the rule.

A request that declares nothing SHALL be treated as a line the app is volunteering, so an
exercise added later is covered by the setting rather than exempt from it.

#### Scenario: An exercise carries no rule of its own
- **WHEN** the behaviour of the setting is changed
- **THEN** it changes in one place and every exercise follows, without any exercise being
  edited

#### Scenario: A new kind of exercise that says nothing about the setting
- **WHEN** an exercise type is added and asks for a line without declaring why
- **THEN** that line is suppressed while the setting is off, in the same way as every
  other volunteered line

## MODIFIED Requirements

### Requirement: The learner can ask for sound to be turned on

Where speech is blocked because the device has not yet seen a user gesture — which is the
normal condition for a student whose screen is being paced by someone else — the app
SHALL provide an explicit action the learner can take that both supplies the gesture and
attempts to speak. The outcome SHALL be reported: sound now works, or it does not.

This offer is about a device that will not speak, and is a different thing from the
setting that decides whether the app speaks unasked. It SHALL NOT be shown because that
setting is off, and taking it SHALL NOT change that setting. Because the learner takes it
deliberately, it SHALL attempt to speak whether the setting is on or off.

#### Scenario: A student's screen that has had no gesture
- **WHEN** the learner taps the action that turns sound on
- **THEN** the current word is spoken, and speech reports itself available from then on

#### Scenario: Turning sound on where it cannot work
- **WHEN** the learner taps the action that turns sound on and the device still does not
  speak
- **THEN** speech reports itself unavailable and the readable fallback is offered instead

#### Scenario: A quiet lesson is not a silent device
- **WHEN** the setting that decides whether the app speaks unasked is off and the device
  speaks perfectly well
- **THEN** the offer to turn sound on is not shown

#### Scenario: Taking the offer while the lesson is quiet
- **WHEN** the device will not speak, the setting is off, and the learner takes the offer
- **THEN** the word is attempted and the setting is left as it was
