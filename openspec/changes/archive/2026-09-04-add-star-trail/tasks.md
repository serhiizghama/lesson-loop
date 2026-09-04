## 1. The trail, derived from state

- [x] 1.1 Add `TrailSlot` and `lessonTrail(lesson, state)` to `src/shared/reducer.ts`
  beside `lessonProgress`: one slot per scored block in lesson order, `done` from
  `isBlockComplete`, `current` from `state.slide`; the finish block yields no slot
  (design D75). **Check:** `npm run typecheck` passes, `lessonProgress` is byte-for-byte
  untouched (`git diff` shows no line inside it), and `src/shared/purity.test.ts` still
  passes — the function reads nothing outside its arguments.
- [x] 1.2 Test it in `src/shared/reducer.test.ts` against the fixture lesson: six slots
  for its seven blocks; `current` follows `nav` and is false for every slot on the finish
  slide; completing a block sets its `done` and no other; a `reset` returns it to open
  and completing again sets it once more (spec "A reset returns the mark to open").
  **Check:** each case is a named test and `npm test` passes.
- [x] 1.3 Test that two states built from the same actions yield equal trails, field by
  field, using the existing determinism helpers (spec "Both screens show one trail").
  **Check:** a named test in `src/shared/determinism.test.ts`.
- [x] 1.4 Confirm the trail stays out of the store: `useLesson`, `useRoom` and the
  `roomStoreIsALessonStore` assertion are untouched (design D75). **Check:** `git diff
  --stat src/ui/useLesson.ts src/ui/useRoom.ts` is empty, and no fake store in
  `student-view.test.tsx`, `build-line.test.tsx` or `lesson-sound.test.tsx` gained a field.

## 2. The chime and the notes

- [x] 2.1 Create `src/sound/sound.ts` with `createSound(host)` returning `chime()`,
  `notes(count, gapMs)`, `stop()`, `enable()` and `isAvailable()`, and the app instance
  built on `globalThis` (design D79). The chime is three short rising sine notes through a
  gain envelope; `notes` schedules `count` rising notes on the audio clock. The
  `AudioContext` is created inside the first call that needs it — never from a listener at
  mount — resumed if it comes up suspended, and every call is a silent no-op where there
  is no `AudioContext`. **Check:** `npm run typecheck` passes; `git diff package.json` is
  empty, so no audio library entered the project; and `grep -rn "prime\|pointerdown"
  src/sound/` finds nothing — the removed priming pattern was not reintroduced (design
  D39).
- [x] 2.2 Test `src/sound/sound.test.ts` against a fake host: `chime()` schedules three
  oscillators; `notes(5, 250)` schedules five, each starting 250 ms after the last and each
  at a higher frequency; the context is created on first use and not before; a context that
  reports `suspended` is resumed; `stop()` releases what was scheduled; a host without
  `AudioContext` reports unavailable and no call throws (spec "Absent or blocked sound
  degrades silently"). **Check:** each is a named test and `npm test` passes.
- [x] 2.3 Add `src/sound/policy.ts` with `quietSound(base, muted)`, the mirror of
  `quietable`: while muted every effect is a no-op (design D78). **Check:**
  `src/sound/policy.test.ts` asserts each effect is dropped while muted, passed through
  while not, and that the wrapper is a new object per setting so memoising on `muted`
  re-runs what depends on it.
- [x] 2.4 Route `enable()` to the sound module from the one offer that already exists: the
  "Turn on sound" control in `ListenView` resumes effects as well as retrying speech
  (design D79, spec "A screen that has had no gesture at all"). **Check:** a named test
  shows taking the offer reaches both modules, and `grep -rn "Turn on sound" src/` finds
  exactly one control — no second offer was added for effects.

## 3. The celebration says nothing

- [x] 3.1 Leave `src/speech/` entirely alone (design D77): no `speakAfter`, no held slot,
  no wrapper for it in `policy.ts`, no praise phrases in `scripts/audio.ts`, no closing
  message added to `speakableLines`. **Check:** `git diff --stat src/speech/speech.ts
  src/speech/policy.ts src/shared/blocks/speakable.ts scripts/audio.ts` is empty, and
  `grep -rn "speakAfter\|APP_LINES\|praiseFor" src scripts` finds nothing.
- [x] 3.2 Assert the moment is silent where it would be loudest: on a completion, and on
  the closing screen. **Check:** named tests in `src/ui/lesson-effects.test.tsx` show a
  chime firing and `speak` never called for either, so the silence is not merely a test
  that renders nothing.
- [x] 3.3 Confirm the exercise's own line is untouched. **Check:** in the browser, tapping
  a card still plays its recorded word, and completing the block chimes without speaking.

## 4. The trail in the header, and the moment

- [x] 4.1 Replace the percentage bar in `LessonPlayer`'s header with the trail, derived
  through `useMemo` from `lessonTrail` (design D75): one slot per `TrailSlot`, three visual
  states (open, current, earned), `role="img"` with an `aria-label` of the form
  `3 of 8 done`, and no `<button>` inside; the footer's `3 / 9` stays. Slots are
  `flex: 1; min-width: 0` with the glyph on a `clamp`. **Check:** at a 380 px viewport
  Animals' eight slots sit beside the back arrow, the title, the **sound control** and the
  invite button with no horizontal scroll, and a throwaway fourteen-block lesson still fits
  (spec "A long lesson in a narrow window"); judged by eye and recorded as a manual check.
- [x] 4.2 Update `src/ui/student-view.test.tsx`: the two `0%` assertions (lines 127 and
  146) read the trail's label instead; a new test asserts the student's and the teacher's
  markup contain the same trail for the same state, and that the trail contains no
  `<button>` (spec "Both screens show one trail", "The trail is not a way to navigate").
  **Check:** `npm test` passes and `grep -rn "percent\|0%" src/ui/student-view.test.tsx`
  finds only the fake store's `progress` field, which the footer still uses.
- [x] 4.3 Create `src/ui/moment.ts` with the pure detector `momentBlock(previous, next)`
  — the id of the slot that was already on screen and went from open to done, else `null`
  (design D76). **Check:**
  `src/ui/moment.test.ts` covers: the same trail twice gives `null`; a first snapshot with
  three done slots gives `null`; the on-screen slot going open to done gives its id; an
  off-screen slot going open to done gives `null`; done to open gives `null`; two states
  and the lesson moving onto an exercise that is already finished gives `null`, whether it
  arrived that way through a reconnection or because the teacher stepped back to it.
- [x] 4.4 Run the moment in `LessonPlayer`: a ref of done slot ids initialised on mount
  and reset on lesson change, compared each render through `momentBlock`; on a hit set
  `celebrating` for 1500 ms. At 200 ms `effects.chime()` — through the memoised wrapper,
  never the raw module (design D78) — and nothing else: the moment says no word (D77). The
  moment is cleared, and its timers with it, on unmount and on a new moment. **Check:** in
  the browser, the last pair of a matching block chimes and stays silent while the block's
  own line plays out; a page reloaded onto a room with three done exercises plays
  nothing.
- [x] 4.5 Add `useEffect(() => { if (muted) sound.stop() }, [muted])` beside the existing
  `speech.cancel()` on the same condition (design D78, spec "Turning the sound off
  mid-effect"). **Check:** a named test asserts `stop()` is called when `muted` turns on
  and not on an unrelated re-render.
- [x] 4.6 Render the flourish (design D81): the flying star measured once from the slot's
  and the stage's rectangles into two custom properties, popping in place when the slot
  cannot be measured; the earned slot's bounce; a confetti burst of about twenty spans over
  the stage whose direction and distance come from the particle index. All `aria-hidden`,
  `pointer-events: none`, gone when `celebrating` clears. **Check:** `grep -rn
  "Math.random" src/ui/` finds nothing; the exercise stays tappable during the moment; the
  moment plays in full with the sound off; recorded as a manual check.

## 5. The way forward

- [x] 5.1 Derive `nextDue` in `LessonPlayer` from `isBlockComplete` of the block on screen
  and `slide < blocks.length − 1`; when true and `canSteer`, the footer's next arrow
  carries a pulse class; pass it to `TeacherPanel` so "Next →" pulses too (design D83).
  **Check:** `src/ui/student-view.test.tsx` gains four named tests: the teacher's markup
  carries the pulse class for a complete on-screen block; the student's markup contains no
  pulse class and no next control for the same state; the solo learner's footer arrow
  pulses the same way as the teacher's; and nothing pulses on the closing screen (spec
  "Nowhere left to go").
- [x] 5.2 Confirm the pulse needs no timer: returning to an exercise completed earlier
  pulses at once (spec "Already complete on arrival"). **Check:** a named test renders
  state with a complete block reached by `nav` and finds the pulse class, with no moment
  having played.

## 6. The closing screen

- [x] 6.1 Reduce `FinishView` to the message: the five literal stars go, the message and
  its styles stay (design D82). **Check:** `grep -rn "⭐" src/blocks/` finds nothing and
  `FinishView` renders `block.message` only.
- [x] 6.2 Render the closing row in `LessonPlayer` when the slide is the finish block: one
  star per slot, gold where `done`, unfilled otherwise, `animation-delay: index × 250 ms`,
  with a text alternative of the form `5 of 8 stars`. **Check:** a named test in
  `src/ui/student-view.test.tsx` renders the finish slide with one incomplete block and
  finds exactly `total − 1` gold stars and one unfilled (spec "Stars are earned, not
  given"), identical in the student's and the teacher's markup.
- [x] 6.3 Run the closing sequence on entering the finish slide through the wrapped
  instances: `effects.notes(gold, 250)`, the larger confetti burst after the last star,
  and nothing spoken at any point; every timer cleared on leaving the slide (design D82,
  spec "Leaving the closing screen early"). **Check:** in the browser the notes rise one
  per star, moving back to an exercise mid-sequence stops it at once, and with the sound
  off the stars and the burst still play in silence (spec "A closing screen in a quiet
  lesson"); recorded as a manual check.
- [x] 6.4 Zero `animation-delay` on the closing stars under `prefers-reduced-motion` in the
  player's own stylesheet, because the global rule in `styles.css` collapses duration only
  and the stagger would otherwise survive it (design D81). **Check:** `grep -n
  "animation-delay" src/ui/app.module.css` shows it set on the stars and zeroed inside a
  `prefers-reduced-motion` block, and with the setting on in the browser the row appears at
  once.

- [x] 6.5 Stand the header's trail down on the closing screen, and drop the slide's title
  there, so the stars and the message are each shown once (design D80). **Check:** named
  tests in `src/ui/student-view.test.tsx` find no marks and no `blockTitle` in the closing
  screen's markup, find the message, and find the trail still present on an exercise for
  the same state.

- [x] 6.6 Centre the header's group on the page, with the way out pinned to the leading
  edge (design D84): a three-track grid, a `.headerCenter` wrapper, and the trail sized
  from a `--slots` custom property instead of growing. **Check:** in the browser, the
  group's centre is within a pixel of the header's at 380 px and 1440 px, for lessons of
  five, eight and fourteen marks, and on the closing screen where there are none; no marks
  overlap and nothing scrolls sideways. Named tests in `src/ui/student-view.test.tsx` hold
  the structure — the way out outside the group, everything else inside it, and the count
  passed to the stylesheet.

## 7. Docs and quality gates

- [x] 7.1 Update `README.md`: the two-links table's student row and the "Rooms" section
  mention the star trail and the closing stars in place of the progress bar; the
  "How it is built" list names `src/sound/`. **Check:** no sentence in `README.md`
  describes a percentage or a fixed number of stars.
- [x] 7.2 Update `docs/PLAN.md`: §8's tree lists `src/sound/`; §9 records that this change
  delivers the "sounds and correct-answer animations" item of v0.2; §12 gains **D-28** —
  a star is earned by completing an exercise, never by accuracy, and mirrors the lesson
  state exactly, so a reset returns it to open; and the celebration is a sound and a
  picture rather than a word, because praise is the teacher's to give. **Check:** the new row is D-28 and
  not a number already in the table, D-27's forward reference to this change now reads as
  satisfied, and no statement left in `PLAN.md` contradicts the delta specs.
- [x] 7.3 Run the full gate. **Check:** `npm run typecheck`, `npm test` and `npm run build`
  all pass; the test count is at or above the 383 that passed before this change; and the
  result is reported honestly, naming anything skipped.
- [x] 7.4 Validate the change against its own specs. **Check:** `openspec validate
  add-star-trail --strict` passes.

## 8. Acceptance

- [x] 8.1 Open Animals from the home screen and complete every exercise. **Check:** each
  completion earns its star with the flight and the chime within the same second and
  nothing is said; the exercise stays on screen; the next arrow pulses until pressed; the
  closing screen brings in eight gold stars with eight rising notes and a burst, with the
  header's trail stood down and the message shown once.
- [x] 8.2 Invite a student and complete an exercise from the **student's** browser under
  `wrangler dev`. **Check:** both screens play the same moment with the same phrase; the
  teacher's "Next →" and footer arrow pulse; the student's screen shows the earned star
  and nothing else new.
- [x] 8.3 Turn the lesson's sound off from the teacher's panel and complete an exercise,
  then reach the closing screen. **Check:** on both screens the flourish, the earned star,
  the confetti, the closing stars and the burst all play, nothing at all is heard, no
  "Turn on sound" offer appears on account of the silence, and turning the sound back on
  replays nothing for what was missed (spec "Turning the sound back on").
- [x] 8.4 Reload the student's tab onto a room with three exercises done. **Check:** the
  three stars are earned on arrival and no moment plays (spec "Joining a lesson already
  under way").
- [x] 8.5 Have the teacher reset a completed exercise and complete it again. **Check:**
  the star returns to open on both screens after the reset and the full moment plays
  again on the second completion.
- [ ] 8.6 Stop the Worker, complete an exercise on each side, restart it. **Check:** each
  screen played its own moment for the exercise it was on; on reconnection any exercise
  the other side completed is shown earned without a moment (spec "A completion the
  screen was not looking at").
- [x] 8.7 Reach the closing screen with one exercise deliberately skipped. **Check:** one
  star is unfilled, the notes count the gold ones only, and the trail in the header shows
  the same open slot.
- [x] 8.8 On a student's tab that has had no tap at all, complete an exercise from the
  teacher's screen, then take the "Turn on sound" offer on the student's tab and complete
  another. **Check:** the first moment is visible and silent there, and the second chimes
  and the exercise's own words are heard (spec "A screen that has had no gesture at
  all").
- [ ] 8.9 Play a lesson with the tab muted, and once with `prefers-reduced-motion` on.
  **Check:** every exercise completes, the visible moment is unchanged, the closing row
  appears at once rather than trickling in, and no error appears (spec "Without sound or
  speech", "Reduced motion").
- [x] 8.10 Report which checks were automated and which were performed by hand, in the
  change's `verification.md`, including whether `npm run audio` was run and on which
  voice. **Check:** the manual tier is named as manual, never presented as test coverage.
