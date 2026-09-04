## Why

The app talks over the teacher. Every exercise speaks of its own accord — a card on every
flip, a match tile on every one of the two taps that make a pair, the sorting pool on
every pick, the sentence on every word and every level change, the listening target and
the physical-response instruction whenever they change — and it does so on **both**
screens at once, while the teacher is already speaking the same words down a Zoom call.
In a live one-to-one lesson the teacher *is* the audio: she models the pronunciation, she
says "Touch your nose!", and a synthesised voice saying it a half-second later on two
devices is not reinforcement, it is a second person talking over her.

There is no way to stop it. Nothing in the app turns speech off — not for a moment, not
for one exercise, not for a whole lesson — so the teacher's only remedy today is her
system volume, which also silences the exercise that genuinely needs sound.

The teaching problem, then: **the teacher cannot choose when the app is the voice and
when she is.** A listening exercise wants the app to speak; a warm-up she is drilling by
ear wants it silent; and she is the only person who knows which is which, in the moment.

The second problem is structural. Speech today is scattered across the six block views as
seven bare `speech.speak()` calls with no notion of *why* a line is being said. Any rule
about when the app may speak would therefore have to be written into each view separately,
and a seventh block type would arrive with the rule missing. This change puts the rule in
one place before adding it.

This also answers the open question `add-star-trail` left behind — "whether the teacher
wants a per-device switch for sound and speech together". She does, and it is one switch
covering the room rather than one device.

## What Changes

- **One sound setting per lesson in play, and one control that changes it.** On by
  default, so nothing about a lesson opened today changes until the setting is touched.
- **In a room the setting is the teacher's and it covers both screens.** It travels in
  the room's state beside the lock: a student has no such control and cannot change it by
  any route, a participant joining later inherits it, and it survives a reload and a
  change of lesson within the room. A lesson opened alone from the home screen has the
  same control for the one person playing it, held locally.
- **Turning sound off silences everything the app says of its own accord** — every line
  listed above, on every exercise, including the listening target and the physical-response
  instruction — and stops whatever is mid-word at the moment it is switched.
- **Every control the learner presses in order to hear something still speaks.** The
  sentence exercise's `🔊 Listen`, the listening exercise's repeat, and the device-level
  "turn on sound" offer all work with the setting off. This is what keeps a listening
  exercise answerable: the child presses to hear the word instead of being handed it in
  writing. Correspondingly, while automatic speech is off, the listening exercise's
  control invites a first play rather than a repeat.
- **Turning it back on speaks the exercise's standing prompt again**, without anyone
  tapping anything, so the teacher who flips the switch on a listening exercise gets the
  word — on both screens — rather than a silent screen and a button to explain.
- **A line now declares why it is being said** — automatically, or because the learner
  asked — and the setting is applied in one place over that declaration. No block view
  learns what "off" means, and a line that declares nothing counts as automatic, so a
  block type added later is covered by the rule rather than exempt from it.
- Deliberately **not** in scope: removing sound from any exercise (the analysis said keep
  every one of them and give the teacher the switch instead); a per-exercise or per-block
  setting in the lesson format; a separate switch per device; muting the teacher's screen
  alone; anything about the star trail's chime and notes, which do not exist yet — when
  `add-star-trail` ships they obey this same setting (design D64).

## Capabilities

### New Capabilities

None. The setting belongs with the speech it governs and the teacher who owns it.

### Modified Capabilities

- `speech`: gains the setting itself — that there is one, that it suppresses only lines
  the app says unasked, that a suppressed line is not evidence of a mute device, that
  turning it back on re-speaks a standing prompt, and that intent is declared by the
  caller rather than decided per exercise. Its existing "the learner can ask for sound to
  be turned on" requirement is clarified: that offer is about a device that will not
  speak and is a different thing from this setting.
- `teacher-view`: gains the teacher's control over the room's sound — hers alone, covering
  both screens, inherited by a late joiner, surviving a reload and a lesson change, and
  independent of the lock.
- `lesson-player`: gains the same control for a lesson played alone, local to that lesson.
- `exercise-blocks`: one requirement covering all six exercises — they speak of their own
  accord only while the setting is on, every control the learner presses to hear a line
  speaks regardless, and no exercise becomes unanswerable or incompletable with sound off.
  The listening exercise's requirement is modified for the invite-first-play control and
  to hold the written word back, since the written word is reserved for a device that
  cannot speak rather than for a teacher who chose silence.

## Impact

- **Changed:** `src/speech/speech.ts` (`speak` takes an intent; no policy inside),
  `src/shared/protocol.ts` (a `mute` client message; `state` carries `muted`),
  `src/shared/room.ts` (`RoomState.muted`, the teacher-only rule, `ClientView.muted`),
  `worker/room.ts` (a stored room from before this change loads as unmuted),
  `src/ui/useLesson.ts` and `src/ui/useRoom.ts` (both stores expose `muted`/`setMuted`, so
  the player still cannot tell which one it holds — D13),
  `src/ui/LessonPlayer.tsx` (the control where the screen steers; the policy wrapper),
  `src/blocks/SentenceView.tsx` and `src/blocks/ListenView.tsx` (two call sites declare
  `demand`; the listening control's wording), `src/ui/app.module.css`.
- **New:** `src/speech/policy.ts` — the wrapper that applies the setting to a `Speech`,
  with its own tests.
- **Unchanged:** the lesson format and every lesson file, the reducer, the action set,
  `LessonState`, the answer keys, the routes, `TeacherPanel.tsx` (the control lives in the
  player header, not the panel — D63), and `src/shared/blocks/speakable.ts` (the setting
  changes when a line is said, never which lines exist, so recordings are unaffected).
- **Tests:** new tests for the policy wrapper; `src/shared/room.test.ts` for the
  teacher-only rule and the refusal a student gets; `src/shared/convergence.test.ts` for
  the setting reaching both views; `src/ui/student-view.test.tsx` for the absence of the
  control on the student's screen; `src/blocks/listen-view.test.tsx` for the control's
  wording with sound off and for the target being spoken again when it is turned on.
- **Docs:** `docs/PLAN.md` §6 (the protocol gains `mute`), §12 (product decision D-26).
- **Ordering:** `add-star-trail` is proposed and unimplemented and touches
  `src/speech/speech.ts` and `src/ui/LessonPlayer.tsx` as well. The two changes do not
  contradict each other — one adds a held follow-up utterance, the other a suppression
  rule over intents — but whichever lands second reconciles those two files.
