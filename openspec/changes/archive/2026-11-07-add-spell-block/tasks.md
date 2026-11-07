## 1. The format

- [x] 1.1 Add `spell` to `Block` and `SpellState` to the state map in `src/shared/types.ts`, and extend
      the `pick` and `tap` comments on `Action` (D165).
      *Check:* `npx tsc --noEmit` fails only where the two registries and `speakable.ts` now lack
      `spell`, which proves the registries are exhaustive.
- [x] 1.2 Add the `spell` schema and the cross-check to `src/shared/validate.ts`: reject an item whose
      `en` does not match `^\p{L}{2,}$`, naming the block and the item (D170).
      *Check:* new cases in `src/shared/validate.test.ts` pass: *ice cream* is rejected, a one-letter
      word is rejected, *TV* and *scissors* are accepted, and a word outside the selection does not
      trigger a rejection.

## 2. The logic

- [x] 2.1 Write `src/shared/blocks/spell.ts`: `spellLogic` (`scored: true`) with `init`, `reduce`,
      `answerKey` and `isComplete`, and the helpers `spellTarget`, `spellWord`, `spellLetters` and
      `spellUsed` (D165–D167, D170). Reuse `scrambleUsed`; leave `scramble.ts` unchanged.
      *Check:* `git diff --stat src/shared/blocks/scramble.ts` is empty.
- [x] 2.2 Write `src/shared/blocks/spell.test.ts`, covering each `exercise-blocks` scenario the logic
      owns: the next letter lands; a wrong letter is refused and keeps what was placed; the same wrong
      letter twice returns the same state by reference; every *s* of *scissors* is accepted and
      `spellUsed` marks exactly one more; `TV` keeps its case; a second `tap` cannot skip the next word;
      moving on carries nothing over; completion comes when the last word is whole, with no tap needed.
      *Check:* `npx vitest run src/shared/blocks/spell.test.ts` passes.
- [x] 2.3 Test `spellLetters` across seeds (D167).
      *Check:* over 1000 seeds, `TV`, `pen` and `scissors` are never offered in spelled order, every
      result is a permutation of the word, and the same seed always gives the same order.
- [x] 2.4 Test the key (`teacher-view` scenario).
      *Check:* a test shows `label` is the word, `value` is its letters separated by spaces, and marks
      are `done` / `current` / `open` as the state moves.
- [x] 2.5 Add `spell` to `blockLogic` and to the exports in `src/shared/blocks/index.ts`, and a case to
      `src/shared/blocks/speakable.ts` returning `item.en` per item, with a comment saying when each is
      spoken.
      *Check:* a test shows the lines are exactly the selected words, one each.
- [x] 2.6 Add a `spell` case to `tests/support/play.ts` and a `spell` block to the fixture in
      `src/shared/__fixtures__/lesson.ts`, then update the counts in `src/ui/student-view.test.tsx`.
      *Check:* temporarily removing the new `play.ts` case makes `tests/playthrough.test.ts` fail on
      the fixture or a lesson using `spell` (it must not skip silently), and restoring it passes. The
      only changed numbers in `student-view.test.tsx` are 19 → 20 and 18 → 19. Record what the
      temporary removal printed.
      *Result:* done after 5.1, because the playthrough plays shipped lessons rather than the fixture.
      Without the case, 24 tests failed, two for each of the twelve sizes, such as `weather/today /
      spell: expected false to be true`. Restored: 76 of 76. The plan missed one number: the slide total
      also moves, `3 / 20` → `3 / 21`.

## 3. The view

- [x] 3.1 Write `src/blocks/SpellView.tsx` and register it in `src/blocks/index.ts`. Top to bottom, as
      in D168: picture, 🔊 (`speech.speak(en, 'demand')`), one place per letter, letter tiles, and *Next
      word →* only when the word is whole and not the last. The finished word is spoken once, on the
      pattern of `ScrambleView`'s `said` ref.
      *Check:* `npm run typecheck` passes.
- [x] 3.2 Add the styles to `src/blocks/blocks.module.css`: a letter tile of 7 rem square (D169), and
      the places.
      *Check:* a test reads the rule and asserts that its size at the scale of a 380 px window is at
      least 44 px, as `src/ui/stage.test.ts` does for the smallest card. Add `spell` to the list in
      `src/ui/stage-fit.test.tsx`, which passes.
      *Note:* first built at 6.5 rem as planned, and task 3.4 measured it below the floor. See 3.4.
- [x] 3.3 Write `src/blocks/spell-view.test.tsx`, covering the scenarios the view owns: before spelling,
      neither the word nor its gloss appears in the markup, apart from the tiles; tiles have one
      button per letter; a used tile is disabled and a wrong one is marked; the finished word is spoken
      once and not again on re-render; 🔊 speaks on demand with no action dispatched; nothing is spoken
      on arrival; with the sound off the finished word is not spoken and 🔊 still is; no *Next word →*
      on the last word.
      *Check:* `npx vitest run src/blocks/spell-view.test.tsx` passes.
- [x] 3.4 Look at it, headless with no visible browser, after task 5.1: `school/classroom` with
      *scissors* and `home/inside` with *TV*, wide and at 390 px.
      *Check:* screenshots show an eight-letter word fits with no clipping, even if it wraps; *TV* shows
      two tiles and two places; a wrong tile shakes; the finished word is green. Record what was seen.
      *Result:* **the first build failed this.** The 6.5 rem tile measured 43.3 px at 390 px, because the
      stage is given 24 px less than the window, and the plan had worked from the window's width. It is
      now 7 rem: 46.6 px measured at 390 px, 45.3 px by calculation at 380 px, and the test uses the
      width the stage actually gets. D169 is updated.
      Seen on screen at both widths: *scissors* wraps to seven tiles and one with nothing clipped; *TV*
      has two tiles, two places and keeps its capitals; a refused letter is marked in red; the finished
      word is green with *Next word →* under it. At 390 px the text in the places is small, as all text
      on the scaled stage is (D-49).

## 4. The guide

- [x] 4.1 Add `spell` to `EXERCISES` in `src/ui/Guide.tsx`: name *Spell it*, what the child does, and
      what the teacher can do, in the guide's plain voice.
      *Check:* `npx vitest run src/ui/guide.test.tsx` passes. It fails before this task, once 3.1 has
      registered the view, which proves the rule still holds.

## 5. The lessons

- [x] 5.1 Add one `spell` block to each of `lessons/{clothes,home,school,weather}.json`, between `pairs`
      and `meaning`, with `select: new`, title *🔤 Spell It* and a short hint (D171).
      *Check:* the block order in each file is `learn, hear, pairs, spell, meaning, build, say, done`.
      `git diff lessons` shows only added lines. `npx vitest run tests/lessons.test.ts
      tests/playthrough.test.ts` passes, covering all twelve sizes.
- [x] 5.2 Run `npm run audio`.
      *Check:* it reports "Nothing to do", and `git status --short public/audio src/speech` shows
      nothing, which proves no new recording is needed.

## 6. Proof

- [x] 6.1 Run the full gate.
      *Check:* `npm run typecheck`, `npm test` and `npm run build` all pass. Paste the summary lines.
      *Result:*
      ```
      typecheck exit: 0
      Test Files  72 passed (72)
           Tests  1292 passed (1292)
      ✓ built in 847ms
      ```
- [x] 6.2 Run a real room: `wrangler dev` locally, with a teacher and a student in two headless
      browsers, on all twelve sizes of the four topics.
      *Check:* on each size, a letter tapped on the student's screen lands on the teacher's, in the same
      place, with the same tiles in the same order; a wrong letter shows on both; the student follows
      the teacher to the end; no console errors. Unit tests hold the lesson in hand while a room looks it
      up by id, so this is a separate proof.
      *Result:* 12 of 12 passed, spelling 5 or 10 words as the size says. The teacher's key showed the
      word letter by letter, and the student's screen showed no key. The script had to wait a minute
      after every nine rooms, because the worker allows ten new rooms a minute. Not run against the
      published app.
- [x] 6.3 Confirm the action set and protocol did not change.
      *Check:* `git status --short worker src/shared/room.ts` shows nothing.

## 7. Docs

- [x] 7.1 `README.md`: add a `spell` row to the block table, add the rejection rule, and remove the
      sentence saying Spell it is absent.
      *Check:* `grep -n "absent by name" README.md` no longer finds Spell it.
- [x] 7.2 `docs/PLAN.md`:
      - §5 backlog: `spell` is reduced to its missing-letter variant;
      - §9 records what this change delivers;
      - §12 gains D-66 (letters in order, refused in place, rather than her check at the end; closes
        D-62) and D-67 (only her four topics, until she asks).
      *Check:* the new rows are dated with the apply date and number on from D-65.
- [x] 7.3 Validate the change.
      *Check:* `openspec validate add-spell-block --strict` passes, and every box above is ticked or
      carries a written reason.

## 8. Hand-off

- [x] 8.1 Stop at "changes are ready". List what the teacher should see: in-order placement rather than
      her check at the end (D-66), and the 🔊 with no speech on arrival.
      *Check:* the final report has that list, and `git log -1` is still `c2ae96c` — no commit, no push
      and no deploy has happened.
