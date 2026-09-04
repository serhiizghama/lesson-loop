## 1. The trail, derived from state

- [ ] 1.1 Add `TrailSlot` and `lessonTrail(lesson, state)` to `src/shared/reducer.ts`
  beside `lessonProgress`: one slot per scored block in lesson order, `done` from
  `isBlockComplete`, `current` from `state.slide`; the finish block yields no slot
  (design D32). **Check:** `npx tsc --noEmit` passes, `lessonProgress` is untouched, and
  `src/shared/purity.test.ts` still passes — the function reads nothing outside its
  arguments.
- [ ] 1.2 Test it in `src/shared/reducer.test.ts` against the fixture lesson: six slots
  for seven blocks; `current` follows `nav` and is false for every slot on the finish
  slide; completing a block sets its `done` and no other; a `reset` returns it to open
  and completing again sets it once more (spec "A reset returns the mark to open").
  **Check:** each case is a named test and `npm test` passes.
- [ ] 1.3 Test that two states built from the same actions yield equal trails, field by
  field, using the existing determinism helpers (spec "Both screens show one trail").
  **Check:** a named test in `src/shared/determinism.test.ts`.

## 2. Sound

- [ ] 2.1 Create `src/sound/sound.ts` with `createSound(host)` returning `chime()`,
  `notes(count, gapMs)`, `prime()` and `isAvailable()`, and the app instance built on
  `globalThis` (design D35). The chime is three short rising sine notes through a gain
  envelope; `notes` schedules `count` rising notes on the audio clock. Without
  `AudioContext` every call is a silent no-op. **Check:** `npx tsc --noEmit` passes and
  `git diff package.json` is empty — no audio library entered the project.
- [ ] 2.2 Arm sound from the first `pointerdown`, once, the way `speech.prime()` does, and
  resume a suspended context there (spec "Sound is made available by the first user
  gesture"). **Check:** a test with a fake host shows the context is created and resumed
  only after the first gesture and `prime()` is safe to call twice.
- [ ] 2.3 Test `src/sound/sound.test.ts` against a fake host: `chime()` schedules three
  oscillators; `notes(5, 250)` schedules five, each starting 250 ms after the last and
  each at a higher frequency; a host without `AudioContext` reports unavailable and no
  call throws (spec "Absent or blocked sound degrades silently"). **Check:** each is a
  named test and `npm test` passes.

## 3. Praise waits its turn

- [ ] 3.1 Add `speakAfter(text)` to `Speech` in `src/speech/speech.ts` (design D34): speak
  at once when idle; otherwise hold one line and speak it from the current utterance's
  `end`; any `speak()` or later `speakAfter()` replaces the held line; `cancel()` drops
  it; a safety timer bounded by the utterance length speaks the held line if `end` never
  arrives. **Check:** `npx tsc --noEmit` passes and `speak()`'s own behaviour is unchanged
  — every existing test in `src/speech/speech.test.ts` passes without edits.
- [ ] 3.2 Test the five scenarios of the speech delta in `src/speech/speech.test.ts` with
  the fake host: praise after a sentence, spoken at once when idle, a tap drops the held
  line, a second follow-up replaces the first, and the safety timer fires when `end` does
  not. **Check:** each scenario is a named test and the fake host records the exact
  sequence of utterances spoken.

## 4. The trail in the header, and the moment

- [ ] 4.1 Replace the percentage bar in `LessonPlayer`'s header with the trail: one slot
  per `TrailSlot`, three visual states (open, current, earned), `role="img"` with an
  `aria-label` of the form `3 of 8 done`, no `<button>` inside; the footer's `3 / 9`
  stays (design D32). Slots are `flex: 1; min-width: 0` with the glyph on a `clamp`.
  **Check:** at a 380 px viewport Animals' eight slots sit beside the title and the
  invite button with no horizontal scroll, and a throwaway fourteen-block lesson still
  fits; judged by eye and recorded as a manual check.
- [ ] 4.2 Update `src/ui/student-view.test.tsx`: the two `0%` assertions read the trail's
  label instead; a new test asserts the student's and the teacher's markup contain the
  same trail for the same state, and that the trail contains no `<button>` (spec
  "Both screens show one trail"). **Check:** `npm test` passes and no assertion mentions
  a percentage.
- [ ] 4.3 Create `src/ui/moment.ts` with the pure detector `momentBlock(previous, next)`
  — the id of the slot that is `current` and went from open to done, else `null` — and
  `praiseFor(state, blockId, generation)` choosing from the four phrases by
  `seedFor(...)` (design D33). **Check:** `src/ui/moment.test.ts` covers: the same trail
  twice gives `null`; a first snapshot with three done slots gives `null`; the on-screen
  slot going open to done gives its id; an off-screen slot going open to done gives
  `null`; done to open gives `null`; two states with the same seed give the same phrase
  and a different generation may give another.
- [ ] 4.4 Run the moment in `LessonPlayer`: a ref of done slot ids initialised on mount
  and reset on lesson change, compared each render through `momentBlock`; on a hit set
  `celebrating` for 1500 ms. Call `sound.prime()` beside `speech.prime()`. At 200 ms
  `sound.chime()`, at 500 ms `speech.speakAfter(praise)`; the moment is cleared, and its
  timers with it, on unmount and on a new moment. **Check:** in the browser, the last
  pair of a matching block chimes and is praised after "The dog says Woof!" finishes, and
  the last card of a cards block is praised after the word; a page reloaded onto a room
  with three done exercises plays nothing.
- [ ] 4.5 Render the flourish (design D36): the flying star measured once from the slot's
  and the stage's rectangles into two custom properties, popping in place when the slot
  cannot be measured; the earned slot's bounce; a confetti burst of about twenty spans
  over the stage whose direction and distance come from the particle index. All
  `aria-hidden`, `pointer-events: none`, gone when `celebrating` clears. **Check:** grep
  finds no `Math.random` under `src/ui/`; the exercise stays tappable during the moment;
  under `prefers-reduced-motion` the star is simply in its slot and the chime still plays,
  recorded as a manual check.

## 5. The way forward

- [ ] 5.1 Derive `nextDue` in `LessonPlayer` from `isBlockComplete` of the block on screen
  and `slide < blocks.length − 1`; when true and `canSteer`, the footer's next arrow
  carries a pulse class; pass it to `TeacherPanel` so "Next →" pulses too (design D38).
  **Check:** `src/ui/student-view.test.tsx` gains three named tests: the teacher's markup
  carries the pulse class for a complete on-screen block, the student's markup contains no
  pulse class and no next control for the same state, and the solo learner's footer arrow
  pulses the same way as the teacher's.
- [ ] 5.2 Confirm the pulse needs no timer: returning to an exercise completed earlier
  pulses at once (spec "Already complete on arrival"). **Check:** a named test renders
  state with a complete block reached by `nav` and finds the pulse class, with no moment
  having played.

## 6. The closing screen

- [ ] 6.1 Reduce `FinishView` to the message: the five literal stars go, the message and
  its styles stay (design D37). **Check:** grep shows no `⭐` in `src/blocks/` and
  `FinishView` renders the message from `block.message` only.
- [ ] 6.2 Render the closing row in `LessonPlayer` when the slide is the finish block: one
  star per slot, gold where `done`, unfilled otherwise, `animation-delay: index × 250 ms`,
  with a text alternative of the form `5 of 8 stars`. **Check:** a named test in
  `src/ui/student-view.test.tsx` renders the finish slide with one incomplete block and
  finds exactly `total − 1` gold stars and one unfilled (spec "Stars are earned, not
  given"), identical in the student's and the teacher's markup.
- [ ] 6.3 Run the closing sequence on entering the finish slide: `sound.notes(gold, 250)`,
  the larger confetti burst after the last star, then `speech.speak(block.message)`;
  every timer cleared and speech cancelled on leaving the slide (spec "Leaving the
  closing screen early"). **Check:** in the browser the notes rise one per star, the
  message is spoken after the burst, and moving back to an exercise mid-sequence stops
  both at once; recorded as a manual check.

## 7. Docs and quality gates

- [ ] 7.1 Update `README.md`: the two-links table's student row and the "Rooms" section
  mention the star trail and the closing stars in place of the progress bar; the
  "How it is built" list names `src/sound/`. **Check:** no sentence in `README.md`
  describes a percentage or a fixed number of stars.
- [ ] 7.2 Update `docs/PLAN.md`: §9 records that this change delivers the "sounds and
  correct-answer animations" item of v0.2; §12 gains **D-22** — a star is earned by
  completing an exercise, never by accuracy, and mirrors the lesson state exactly, so a
  reset returns it to open. **Check:** no statement left in `PLAN.md` contradicts the
  delta specs, and §8's tree lists `src/sound/`.
- [ ] 7.3 Run the full gate. **Check:** `npm run typecheck`, `npm test` and `npm run build`
  all pass, and the result is reported honestly, naming anything skipped.

## 8. Acceptance

- [ ] 8.1 Open Animals from the home screen and complete every exercise. **Check:** each
  completion earns its star with the flight, the chime and the praise within the same
  second; the exercise stays on screen; the next arrow pulses until pressed; the closing
  screen brings in eight gold stars with eight rising notes, a burst, and the spoken
  message.
- [ ] 8.2 Invite a student and complete an exercise from the **student's** browser under
  `wrangler dev`. **Check:** both screens play the same moment with the same phrase; the
  teacher's "Next →" and footer arrow pulse; the student's screen shows the earned star
  and nothing else new.
- [ ] 8.3 Reload the student's tab onto a room with three exercises done. **Check:** the
  three stars are earned on arrival and no moment plays (spec "Joining a lesson already
  under way").
- [ ] 8.4 Have the teacher reset a completed exercise and complete it again. **Check:**
  the star returns to open on both screens after the reset and the full moment plays
  again on the second completion.
- [ ] 8.5 Stop the Worker, complete an exercise on each side, restart it. **Check:** each
  screen played its own moment for the exercise it was on; on reconnection any exercise
  the other side completed is shown earned without a moment (spec "A completion the
  screen was not looking at").
- [ ] 8.6 Reach the closing screen with one exercise deliberately skipped. **Check:** one
  star is unfilled, the notes count the gold ones only, and the trail in the header shows
  the same open slot.
- [ ] 8.7 Play a lesson with the tab muted, and once with `prefers-reduced-motion` on.
  **Check:** every exercise completes, the visible moment and the closing row are
  unchanged, and no error appears (spec "Without sound or speech", "Reduced motion").
- [ ] 8.8 Report which checks were automated and which were performed by hand, in the
  change's `verification.md`. **Check:** the manual tier is named as manual, never
  presented as test coverage.
