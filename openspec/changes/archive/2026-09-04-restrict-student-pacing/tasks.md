## 1. The room refuses what is not the student's to do

- [x] 1.1 Refuse `nav` and `reset` from a participant whose role is `student` in
  `RoomCore.#act`, before the lock is considered, returning the existing `not-teacher`
  reason (design D23). **Check:** `npx tsc --noEmit` passes and no new protocol type,
  message or `RefusedReason` was introduced — the diff touches `src/shared/room.ts` only.
- [x] 1.2 Unit-test the refusal in `src/shared/room.test.ts`: a student's `nav` and a
  student's `reset` each leave the room's state untouched by reference and return
  `not-teacher`, while the teacher's own `nav` and `reset` still apply. **Check:** each of
  the four cases is a named test and `npm test` passes.
- [x] 1.3 Test that the refusal is not the lock wearing a different hat: with the lock
  **off**, a student's `tap` still applies and their `nav` still does not (spec
  "Steering is not the lock"). **Check:** a named test asserts both in one scenario.
- [x] 1.4 Extend the convergence test with a student that tries to steer: it applies the
  action optimistically, the room refuses, and the client ends identical to the room
  (spec "A student's attempt to steer changes nothing"). **Check:** the existing
  `expectAgreement` helper passes for the scenario, field by field.

## 2. The screen that steers, and the screen that does not

- [x] 2.1 Add `canSteer` to `LessonPlayer`, defaulting to `true`, and render previous,
  next and reset only when it is true — omitted from the markup, never disabled or hidden
  (design D22). **Check:** `npx tsc --noEmit` passes and no block view's props changed.
- [x] 2.2 Keep the position and the progress on the student's footer regardless of
  `canSteer` (design D24, spec "Knowing where you are without steering"). **Check:** the
  student's rendered markup still contains `3 / 9` and the progress percentage.
- [x] 2.3 Pass `canSteer={role === 'teacher'}` from `RoomLesson`, and leave `SoloLesson`
  passing nothing at all. **Check:** grep confirms `SoloLesson.tsx` is unchanged by this
  change.
- [x] 2.4 Confirm `canSteer` and `readOnly` stay independent: a locked student and an
  unlocked student render the same footer, and the teacher's footer is unaffected by the
  lock. **Check:** the three combinations are asserted in `src/ui/student-view.test.tsx`.

## 3. Proving the student's screen carries nothing to steer with

- [x] 3.1 Extend `src/ui/student-view.test.tsx` to read the student's rendered markup for
  navigation and reset controls (spec "No way to move the lesson on"). **Check:** the test
  asserts they are absent from the DOM rather than styled away, the way the existing
  answer-key assertions do.
- [x] 3.2 Assert the teacher's rendered markup still carries all four controls — previous,
  next, reset this exercise, change lesson. **Check:** a named test, so removing a control
  from the teacher by accident fails rather than passes quietly.

## 4. Docs and quality gates

- [x] 4.1 Update `README.md`'s two-links table: the student's row says the exercise, its
  instruction and where they are; the teacher's says she alone paces the lesson. **Check:**
  no sentence left in `README.md` claims the student can move between exercises.
- [x] 4.2 Update `docs/PLAN.md` §7's screen descriptions and add the decision that pacing
  is the teacher's, including that an unsynced student holds their exercise rather than
  walking on (design D25). **Check:** no statement left in `PLAN.md` contradicts the delta
  specs, principle 4 included.
- [x] 4.3 Run the full gate. **Check:** `npm run typecheck`, `npm test` and `npm run build`
  all pass, and the result is reported honestly, naming anything skipped.

## 5. Acceptance

- [x] 5.1 Open a lesson from the home screen and play it. **Check:** previous, next and
  reset are all present and work, exactly as before this change.
- [x] 5.2 Invite a student and look at both screens under `wrangler dev`. **Check:** the
  student sees the exercise, `3 / 9` and the progress bar and no controls; the teacher sees
  her full footer and panel.
- [x] 5.3 With the lock **off**, have the student play the exercise fully. **Check:** every
  tap inside the exercise still works on both screens — the change took pacing, not
  participation.
- [x] 5.4 Have the teacher move between exercises and reset one. **Check:** both screens
  follow, and reset re-shuffles on both while other exercises keep their progress.
- [x] 5.5 Stop the Worker mid-exercise. **Check:** both screens say they are unsynced, the
  student finishes the exercise on screen and is offered no way forward, the teacher moves
  on through her own copy, and restarting the Worker brings them back together
  (design D25).
- [x] 5.6 Report which checks were automated and which were performed by hand, updating
  the change's `verification.md`. **Check:** the manual tier is named as manual, never
  presented as test coverage.
