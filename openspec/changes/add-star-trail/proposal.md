## Why

A child who makes the last pair of a matching exercise gets nothing back. The tile ticks,
the percentage in the header creeps up, and that is all — no sound, no flourish, no word.
For a seven-year-old the "43%" in the header is a number without feeling, and the five
stars on the closing screen are painted on: they are the same five whether every
exercise was completed or none, and a child notices that stars nobody can fail to get are
not worth having. The teacher, meanwhile, has no cue that the exercise is done and it is
time to move on, other than reading the answer key.

The engine already knows the moment an exercise completes — progress is derived from it
on every render. What is missing is the feedback loop: acknowledgement in the same second
as the success, a visible record of what has been earned, and a closing screen that shows
the earned stars rather than a fixed picture. This is the "sounds and correct-answer
animations" item PLAN §9 lists for v0.2, given a shape.

The rules were decided with the client's students in mind and are fixed:

- A star is earned by **completing** an exercise, never by accuracy. A wrong answer is a
  shake and another try, as today; nothing counts mistakes.
- A star reflects the state of the lesson and nothing else. A reset by the teacher turns
  the exercise back to open and its star with it; completing it again earns it again.
  Remembering "once earned" across a reset would need new state, and the simplest rule
  was chosen deliberately.

## What Changes

- **The percentage bar in the header becomes a star trail**: one mark per exercise, in
  lesson order, each open, current or earned. The closing screen is a slide, not an
  exercise, and has no mark. The footer's `3 / 9` position stays as it is.
- **A completion moment** plays the instant the exercise on screen becomes complete, on
  every screen showing it: a star flies from the exercise to its slot, the slot turns
  gold with a bounce, a short chime sounds, a confetti burst covers the exercise for a
  second, and a word of praise is spoken. About a second and a half, then over. The
  exercise stays on screen and stays playable; the lesson does not move on by itself.
- **Praise waits its turn.** Where the completing tap makes the exercise speak a line
  — "The dog says Woof!" — the praise follows that line rather than cutting it off. The
  speech capability gains a single held follow-up for this.
- **The way forward draws attention.** On a screen that steers the lesson, the control
  that moves to the next exercise pulses while the exercise on screen is complete. The
  student's screen, which has no such control, shows nothing new.
- **The closing screen shows the stars earned.** One star per exercise, gold where
  complete, arriving one after another with a note each, then a larger burst, then the
  lesson's closing message spoken aloud. The fixed five stars go.
- **A `sound` capability**: the chime and the notes, synthesised on the device with no
  audio file and no network request, armed by the first tap like speech, and silent
  where the device will not play them.

Not in scope, deliberately: a star the teacher awards for speaking (a later change, once
this one has been taught with); a per-device switch for sounds (see design — Open
Questions); tapping the trail to jump to an exercise (that is the lesson map, a change of
its own); any change to what counts as complete, to the exercises, or to the lesson
format.

## Capabilities

### New Capabilities

- `sound`: the non-speech sounds the app makes — the chime that marks a completed
  exercise and the notes that bring the closing screen's stars in — when they play, that
  they need no file and no network, and how they behave when the device will not play
  them.

### Modified Capabilities

- `lesson-player`: progress is currently "visible at all times" as a percentage; it
  becomes one mark per exercise with a current position. Completing a lesson is
  currently "celebrated" by a closing screen with a fixed picture; the closing screen now
  shows the stars actually earned and speaks the closing message. Two requirements are
  added: the moment that marks a completed exercise on every screen, and the attention
  the way forward draws once the exercise is done.
- `speech`: "a new utterance replaces the one in progress, and utterances never queue"
  gains its one exception — a single held follow-up, spoken when the line in progress
  ends and dropped the moment anything else is requested.

## Impact

- **Changed:** `src/shared/reducer.ts` (the trail, derived beside `lessonProgress`),
  `src/ui/LessonPlayer.tsx` (the trail in the header, the moment, the closing row, the
  pulse on the way forward), `src/ui/TeacherPanel.tsx` (the pulse on Next),
  `src/blocks/FinishView.tsx` (the fixed stars go; the message stays),
  `src/speech/speech.ts` (the held follow-up), `src/ui/app.module.css` and
  `src/blocks/blocks.module.css`.
- **New:** `src/sound/` (the synthesised chime and notes, with their priming gate) and
  the player's moment logic — a pure detector the tests can drive, and the hook that
  runs it.
- **Unchanged:** the lesson format, every lesson file, every block's logic, the action
  set, the protocol, the Worker and the Durable Object. Nothing new is stored in lesson
  state, nothing new crosses the socket, and no dependency is added.
- **Tests:** the reducer tests gain the trail; `src/ui/student-view.test.tsx` reads the
  trail instead of `0%` and gains the closing row; the speech tests gain the follow-up;
  `src/sound/` gets its own tests against a fake audio host; the moment detector is unit
  tested for joining mid-lesson, resets and the other participant's completion.
- **Docs:** `README.md` describes the stars; `docs/PLAN.md` §9 records what this change
  delivers of v0.2 and §12 gains the product decision above.
