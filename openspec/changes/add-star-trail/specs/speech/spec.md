## MODIFIED Requirements

### Requirement: A new utterance replaces the one in progress

Requesting speech while speech is already in progress SHALL stop the earlier utterance and
speak the new one. Utterances SHALL NOT accumulate in a queue. As the one exception, a
line MAY be requested as a follow-up: a follow-up SHALL wait for the utterance in progress
to end and then be spoken, SHALL be spoken at once when nothing is in progress, and SHALL
be dropped rather than queued when any other speech is requested before it is heard. At
most one follow-up SHALL be held at a time; a later follow-up replaces an earlier one.

#### Scenario: Tapping several cards quickly
- **WHEN** the learner taps four cards in rapid succession
- **THEN** only the last word is heard through to the end, and no backlog plays afterwards

#### Scenario: Praise after a sentence
- **WHEN** a sentence is being spoken and praise is requested as a follow-up
- **THEN** the sentence is heard through to its end and the praise is heard after it

#### Scenario: Nothing in progress
- **WHEN** a follow-up is requested while nothing is being spoken
- **THEN** it is spoken at once

#### Scenario: A tap interrupts a held follow-up
- **WHEN** praise is being held and the learner taps a card that speaks
- **THEN** the card's word is spoken and the praise is never heard

#### Scenario: A second follow-up replaces the first
- **WHEN** two follow-ups are requested while one sentence is in progress
- **THEN** only the second is heard, after the sentence
