## 1. Rebuild the speech module's contract

- [ ] 1.1 Replace the `Speech` type's surface in `src/speech/speech.ts`: drop `prime()`,
      keep `speak(text)` and `cancel()`, and add `getState(): SpeechState`,
      `subscribe(listener): () => void`, and `enable(text)`. Define
      `SpeechState = { status: 'unsupported' | 'untested' | 'working' | 'silent'; speaking: boolean; enableAttempted: boolean }`
      (design D4).
      **Check:** `npm run typecheck` fails only where callers still use `prime()` /
      `isAvailable()` — that list is exactly `src/ui/LessonPlayer.tsx`,
      `src/blocks/ListenView.tsx` and `src/speech/speech.test.ts`, and no file under
      `src/shared` appears in it.

- [ ] 1.2 Delete the priming path: remove `unlock()`, the `utter(' ', 0)` call, the
      `pointerdown` listener and the `listening`/`primed` flags (design D1). Remove
      `speech.prime()` from the effect in `src/ui/LessonPlayer.tsx`, keeping the
      `speech.cancel()` cleanup.
      **Check:** `grep -rn "prime\|volume = 0\|pointerdown" src/speech src/ui/LessonPlayer.tsx`
      returns nothing.

## 2. The hand-off gate — the actual bug fix

- [ ] 2.1 Implement the single-in-flight state machine in `src/speech/speech.ts`: track
      `phase: 'idle' | 'queued' | 'speaking'` and one waiting slot. `speak()` starts
      immediately when `idle`, cancels-then-speaks when `speaking`, and only fills the
      waiting slot when `queued`. On `start`, a waiting word takes over; on `end`/`error`,
      a waiting word is spoken directly (design D2).
      **Check:** a new test asserts that after `speak('a')` followed immediately by
      `speak('b')` with no `start` event in between, `cancel` was **not** called and only
      one utterance was handed to the engine; after the fake fires `start`, `'b'` is
      spoken.

- [ ] 2.2 Add the regression test that names the bug: with a fake host that never fires
      `start`, four rapid `speak()` calls must produce **zero** `cancel()` calls against an
      unstarted utterance.
      **Check:** `npx vitest run src/speech` — the test fails against the current
      `speech.ts` (verify by stashing the fix) and passes with it.

- [ ] 2.3 Keep the existing no-backlog guarantee: four rapid taps leave exactly one
      utterance, the last.
      **Check:** the existing "leaves exactly one utterance queued after four rapid taps"
      test passes unchanged against the new implementation.

## 3. The watchdog and the status store

- [ ] 3.1 Add the 1500 ms grace-period watchdog as one named constant: an utterance whose
      `start` does not arrive in time, or which fires `error`, sets status `silent`
      (design D3).
      **Check:** a test using `vi.useFakeTimers()` speaks a word, advances 1500 ms with no
      events, and asserts `getState().status === 'silent'`; a second test fires `start`
      before the deadline and asserts `'working'`.

- [ ] 3.2 Implement `subscribe(listener)` and emit on every status or `speaking` change.
      **Check:** a test subscribes, speaks, fires `start` then `end`, and asserts the
      listener saw `speaking: true` then `speaking: false`; the returned unsubscribe stops
      further calls.

- [ ] 3.3 Report `unsupported` when either `speechSynthesis` or `SpeechSynthesisUtterance`
      is missing, and make every method a safe no-op in that case.
      **Check:** `createSpeech({})` returns status `unsupported`, and
      `speak/cancel/enable/subscribe` neither throw nor schedule a timer.

- [ ] 3.4 Implement `enable(text)`: set `enableAttempted`, reset status to `untested`,
      best-effort `cancel()` + `resume()`, then speak `text` so the watchdog re-decides
      (design D5).
      **Check:** a test puts a fake into `silent`, calls `enable('dog')`, fires `start`,
      and asserts status `working` and `enableAttempted: true`; a second test lets the
      watchdog trip again and asserts `silent` with `enableAttempted` still true.

- [ ] 3.5 Delete the two obsolete priming tests and confirm the suite still covers rate,
      language, voice choice, empty text and the unsupported device.
      **Check:** `npx vitest run src/speech` is green with no test referencing a silent
      utterance or `pointerdown`.

## 4. The listening exercise

- [ ] 4.1 Consume the store in `src/blocks/ListenView.tsx` via `useSyncExternalStore` over
      `speech.subscribe` / `speech.getState` (design D4).
      **Check:** `npm run typecheck` passes and no `speech.isAvailable()` call remains in
      `src/blocks`.

- [ ] 4.2 Render the repeat control in its three appearances — 🔊 ready, 🔈 speaking,
      🔇 no sound — leaving it tappable in all of them (design D6).
      **Check:** a component test renders with each status and asserts the control's
      accessible name changes accordingly and is never `disabled`.

- [ ] 4.3 Implement the fallback ordering from the spec: status `silent` with
      `enableAttempted: false` shows a "🔊 Turn on sound" action and **hides** the written
      word; `silent` with `enableAttempted: true` reveals the written word; `unsupported`
      reveals the written word immediately with no offer.
      **Check:** three component tests, one per case, asserting the presence and absence of
      both the offer and the English word.

- [ ] 4.4 Keep the exercise answerable throughout: pictures stay tappable and a correct tap
      still advances in every status.
      **Check:** a component test in the `silent` status taps the correct picture and
      asserts the dispatched action is unchanged from the working case.

- [ ] 4.5 Add the three control appearances and the offer button to
      `src/blocks/blocks.module.css`, extending `.listenAgain` and `.listenFallback`.
      **Check:** `npm run build` succeeds and no CSS-module class referenced from
      `ListenView.tsx` is missing from the stylesheet.

## 5. Verification

- [ ] 5.1 Full suite and build.
      **Check:** `npm test`, `npm run typecheck` and `npm run build` all pass; report the
      output rather than summarising it.

- [ ] 5.2 Runtime check in a browser that has **not** been poisoned by an earlier build —
      restart Chrome first, since the wedge survives page reloads (design, Risks). Open
      `/l/body-parts`, tap a card on page 1, then go to page 4 and press the repeat
      control.
      **Check:** the word is audible on page 1 and again on page 4; with
      `speechSynthesis` instrumented, the real utterance fires `start` and `end`, and
      `speechSynthesis.speaking` returns to `false` afterwards.

- [ ] 5.3 Prove the room case: open the teacher link, join as a student in a second window,
      and navigate the teacher to the listening exercise **without touching the student
      window first**.
      **Check:** the student's screen offers "🔊 Turn on sound" rather than silently
      showing nothing; one tap makes the word audible and the offer disappears.

- [ ] 5.4 Prove the honest-failure path by forcing it: with the fake or with speech
      disabled at the OS level, confirm the exercise still completes end to end and the
      written word appears only after the offer was taken.
      **Check:** the exercise reaches `10 / 10` with no error shown, matching the
      "degrades silently" scenarios in the speech spec.

- [ ] 5.5 Check the other five block types recovered their voice, since they share the
      engine and were mute for the same reason.
      **Check:** on `/l/animals`, a card tap on page 1, a completed pair on page 3, a
      sentence on page 4 and a TPR instruction on page 8 are each audible.
