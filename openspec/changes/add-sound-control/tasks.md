## 1. The setting in the shared model

- [ ] 1.1 Add `muted: boolean` to `RoomState` in `src/shared/room.ts`, set to `false` by
  `RoomCore.open`, exposed by a `get muted()` beside `get locked()`, and included in
  `stateMessage(role)`. **Check:** `npm run typecheck` passes and
  `src/shared/purity.test.ts` still passes — nothing outside the arguments is read.
- [ ] 1.2 Add `{ t: 'mute'; value: boolean }` to `ClientMessage` and to
  `clientMessageSchema` in `src/shared/protocol.ts`, and `muted: boolean` to the `state`
  variant of `ServerMessage`. **Check:** `npm run typecheck` passes, and a unit test in
  `src/shared/room.test.ts` shows `parseClientMessage('{"t":"mute","value":true}')` parses
  and `'{"t":"mute"}'` returns null.
- [ ] 1.3 Handle `mute` in `RoomCore.handle`: refused with `not-teacher` for a student,
  refused with `no-effect` when the value already holds, applied otherwise — the same
  three-way shape `lock` has. **Check:** three named tests in `src/shared/room.test.ts`,
  one per outcome, plus one showing a student's `mute` leaves `snapshot.muted` unchanged
  (spec "The setting is not the student's").
- [ ] 1.4 Test that `muted` survives `switch-lesson`: set it, switch the room's lesson,
  assert it is still set and the new lesson started fresh (spec "Surviving a change of
  lesson"). **Check:** a named test in `src/shared/room.test.ts`; `npm test` passes.
- [ ] 1.5 Test that the lock and the setting are independent: muting does not change
  `locked` and a student's taps are still applied; locking does not change `muted` (spec
  "The setting is not the lock"). **Check:** a named test in `src/shared/room.test.ts`.

## 2. The setting across the wire and into the client view

- [ ] 2.1 Add `muted: boolean` to `ClientView` in `src/shared/room.ts`, `false` in
  `newClientView`, and read in `viewReceive` from a `state` message as
  `message.muted === true` so an older Worker's snapshot lands on sound-on (design D65).
  **Check:** `npm run typecheck` passes and a unit test feeds `viewReceive` a `state`
  message with `muted` absent and expects `false`.
- [ ] 2.2 Extend `src/shared/convergence.test.ts` so the teacher's `mute` reaches the
  student's view and a late-joining view adopts it from its first snapshot (spec "A student
  who joins after it was turned off", "Surviving a reload"). **Check:** two named cases;
  `npm test` passes.
- [ ] 2.3 Normalise the stored room in `worker/room.ts` when it is read back —
  `{ ...stored, muted: stored.muted ?? false }` — so a room persisted before this change
  loads muted-off (design D65). **Check:** `npm run typecheck` passes, including
  `tsc --noEmit -p worker`; `tests/snapshot-size.test.ts` still passes.

## 3. Speech gains an intent and a policy wrapper

- [ ] 3.1 In `src/speech/speech.ts` export `SpeechIntent = 'auto' | 'demand'`, change the
  `Speech` type's `speak` to `speak(text: string, intent?: SpeechIntent): void`, and add a
  readonly `quiet: boolean` to `Speech` that the module itself reports as `false`. The
  implementation ignores the intent — the policy is not its business (design D58).
  **Check:** `npm run typecheck` passes and `src/speech/speech.test.ts` passes untouched,
  proving the change is backward compatible at every existing call site.
- [ ] 3.2 Create `src/speech/policy.ts` with
  `quietable(base: Speech, muted: boolean): Speech`: `quiet: muted`; `speak` drops a call
  whose intent is `'auto'` (or absent) while muted and otherwise calls through; `enable`,
  `cancel`, `preload`, `getState` and `subscribe` are delegated **by reference** so the
  snapshot functions keep their identity (design D58). **Check:** `npm run typecheck`
  passes.
- [ ] 3.3 Test the wrapper in `src/speech/policy.test.ts` against a fake `Speech`: muted
  drops `'auto'` and an intent-less call, muted passes `'demand'` through, unmuted passes
  both, and `enable`/`cancel`/`preload`/`getState`/`subscribe` are the base's own
  references in both states (spec "One setting decides whether the app speaks unasked",
  "A line declares why it is being spoken"). **Check:** six named tests; `npm test` passes.

## 4. The stores carry the setting

- [ ] 4.1 Add `muted` and `setMuted(value: boolean)` to what `useLesson` returns in
  `src/ui/useLesson.ts`, from a local `useState(false)` — no network, no storage (spec "A
  lesson played alone can be told to be quiet"). **Check:** `npm run typecheck` passes.
- [ ] 4.2 Add `muted: view.muted` and a `setMuted` that sends `{ t: 'mute', value }` to
  `useRoom` in `src/ui/useRoom.ts`, beside `setLocked`. **Check:** `npm run typecheck`
  passes and `roomStoreIsALessonStore` still compiles — the room store is still a lesson
  store (design D13, D57).
- [ ] 4.3 Update the `store()` helper in `src/ui/student-view.test.tsx` to supply the two
  new fields. **Check:** `npm test` passes with no other change to that file's assertions.

## 5. The player: the control and the wiring

- [ ] 5.1 In `src/ui/LessonPlayer.tsx` build the speech the views receive as
  `useMemo(() => quietable(speech, store.muted), [store.muted])` and pass it to `View`
  instead of the module (design D61). **Check:** `npm run typecheck` passes and
  `npm test` passes.
- [ ] 5.2 Add an effect that calls `speech.cancel()` when `muted` turns true, so a word in
  flight stops rather than finishing (spec "A word in flight when the setting is turned
  off"). **Check:** a test in `src/ui/` renders the player with a fake speech module,
  flips `muted` to true, and expects `cancel` to have been called.
- [ ] 5.3 Test that flipping `muted` re-runs the views' speaking effects as D61 intends:
  with the player rendered on the listening exercise, turning the setting on speaks the
  target and turning it off speaks nothing (spec "Turning it back on where a prompt is
  standing"). **Check:** two named tests driving the real `ListenView` through the player
  with a fake `Speech`; `npm test` passes.
- [ ] 5.4 Render an icon-only sound toggle in the player header where `canSteer` is true:
  `🔊` / `🔇`, `aria-pressed={store.muted}`, an accessible name that says which state it is
  in, calling `store.setMuted(!store.muted)` (design D63). Style it in
  `src/ui/app.module.css` beside the existing header controls. **Check:** `npm test`
  passes and the button is present in `soloMarkup()` and `teacherMarkup()`.
- [ ] 5.5 Add to `src/ui/student-view.test.tsx`: the control appears in the teacher's and
  the solo markup and is absent from `studentMarkup()`, with sound both on and off, and no
  string in the student's markup names it (spec "No control leaks onto the student's
  screen"). **Check:** named tests reading the markup, as the file's existing assertions
  do; `npm test` passes.

## 6. The views

- [ ] 6.1 Declare `'demand'` at the two call sites where the learner asked to hear
  something: the `🔊 Listen` button in `src/blocks/SentenceView.tsx` and the repeat button
  in `src/blocks/ListenView.tsx`. Leave every other `speak` call exactly as it is — they
  are `'auto'` by the default (design D58). **Check:** `grep -rn "speak(" src/blocks`
  shows exactly two calls carrying `'demand'` and the rest unchanged; `npm test` passes.
- [ ] 6.2 In `src/blocks/ListenView.tsx` use `speech.quiet` to word the control: `🔊 Listen`
  while quiet, `🔊 Listen again` otherwise, leaving the `speaking` and `showWord` states as
  they are (design D60). **Check:** `npm run typecheck` passes.
- [ ] 6.3 Test the wording in `src/blocks/listen-view.test.tsx` — extend `fakeSpeech` with
  `quiet` — for `quiet: true` and `quiet: false`, and test that the written English word is
  **not** revealed on account of `quiet` (spec "Arriving at a word with the lesson
  quieted"). **Check:** three named tests; `npm test` passes.
- [ ] 6.4 Test that pressing the control while quiet speaks the word, with the intent that
  gets through the wrapper (spec "Asking for the word in a quieted lesson"). **Check:** a
  named test asserting `speak` was called with `'demand'`; `npm test` passes.

## 7. Docs

- [ ] 7.1 Add `{ t:'mute', value }` to the client → room list in `docs/PLAN.md` §6, beside
  `lock`, noting it is the teacher's and covers both screens. **Check:** the list matches
  `ClientMessage` in `src/shared/protocol.ts` item for item.
- [ ] 7.2 Add product decision **D-26** to `docs/PLAN.md` §12: one sound setting per room,
  the teacher's, covering both screens, on by default; it suppresses what the app
  volunteers and never what the learner asks for, because the teacher is the voice of a
  live lesson. Note that it answers the open question `add-star-trail` left. **Check:** the
  row is dated 2026-09-04 and the numbering continues from D-25.

## 8. Verification

- [ ] 8.1 Run the whole suite. **Check:** `npm run typecheck && npm test && npm run build`
  all pass with no new warnings.
- [ ] 8.2 Two browsers against `wrangler dev`: open a lesson, invite a student, join as the
  student, confirm sound plays on both; turn it off from the teacher's header and confirm
  both screens go quiet mid-exercise; press the listening exercise's control on the
  student's screen and confirm the word is heard; turn it back on and confirm both screens
  say the word without a tap. **Check:** each of the four observed, and the student's screen
  never shows a sound control.
- [ ] 8.3 Reload the teacher's tab with sound off and confirm it comes back off; change the
  room's lesson and confirm it stays off; open a second student tab and confirm it arrives
  quiet. **Check:** all three observed against `wrangler dev`.
- [ ] 8.4 Check the teacher's header at a 380-pixel viewport with the panel both open and
  dismissed: the toggle is reachable, nothing overlaps the exercise and the page does not
  scroll sideways (spec "Reachable with the panel dismissed", and the existing narrow-window
  requirement). **Check:** observed in a 380 px window.
