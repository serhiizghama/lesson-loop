## 1. Rebuild the speech module's contract

- [x] 1.1 Replace the `Speech` type's surface in `src/speech/speech.ts`: drop `prime()`,
      keep `speak(text)` and `cancel()`, and add `getState(): SpeechState`,
      `subscribe(listener): () => void`, and `enable(text)`. Define
      `SpeechState = { status: 'unsupported' | 'untested' | 'working' | 'silent'; speaking: boolean; enableAttempted: boolean }`
      (design D42).
      **Check:** `npm run typecheck` fails only where callers still use `prime()` /
      `isAvailable()` — that list is exactly `src/ui/LessonPlayer.tsx`,
      `src/blocks/ListenView.tsx` and `src/speech/speech.test.ts`, and no file under
      `src/shared` appears in it.

- [x] 1.2 Delete the priming path: remove `unlock()`, the `utter(' ', 0)` call, the
      `pointerdown` listener and the `listening`/`primed` flags (design D39). Remove
      `speech.prime()` from the effect in `src/ui/LessonPlayer.tsx`, keeping the
      `speech.cancel()` cleanup.
      **Check:** `grep -rn "prime\|volume = 0\|pointerdown" src/speech src/ui/LessonPlayer.tsx`
      returns nothing.

## 2. The hand-off gate — the actual bug fix

- [x] 2.1 Implement the single-in-flight state machine in `src/speech/speech.ts`: track
      `phase: 'idle' | 'queued' | 'speaking'` and one waiting slot. `speak()` starts
      immediately when `idle`, cancels-then-speaks when `speaking`, and only fills the
      waiting slot when `queued`. On `start`, a waiting word takes over; on `end`/`error`,
      a waiting word is spoken directly (design D40).
      **Check:** a new test asserts that after `speak('a')` followed immediately by
      `speak('b')` with no `start` event in between, `cancel` was **not** called and only
      one utterance was handed to the engine; after the fake fires `start`, `'b'` is
      spoken.

- [x] 2.2 Add the regression test that names the bug: with a fake host that never fires
      `start`, four rapid `speak()` calls must produce **zero** `cancel()` calls against an
      unstarted utterance.
      **Check:** `npx vitest run src/speech` — the test fails against the current
      `speech.ts` (verify by stashing the fix) and passes with it.

- [x] 2.3 Keep the existing no-backlog guarantee: four rapid taps leave exactly one
      utterance, the last.
      **Check:** the existing "leaves exactly one utterance queued after four rapid taps"
      test passes unchanged against the new implementation.

## 3. The watchdog and the status store

- [x] 3.1 Add the 1500 ms grace-period watchdog as one named constant: an utterance whose
      `start` does not arrive in time, or which fires `error`, sets status `silent`
      (design D41).
      **Check:** a test using `vi.useFakeTimers()` speaks a word, advances 1500 ms with no
      events, and asserts `getState().status === 'silent'`; a second test fires `start`
      before the deadline and asserts `'working'`.

- [x] 3.2 Implement `subscribe(listener)` and emit on every status or `speaking` change.
      **Check:** a test subscribes, speaks, fires `start` then `end`, and asserts the
      listener saw `speaking: true` then `speaking: false`; the returned unsubscribe stops
      further calls.

- [x] 3.3 Report `unsupported` when either `speechSynthesis` or `SpeechSynthesisUtterance`
      is missing, and make every method a safe no-op in that case.
      **Check:** `createSpeech({})` returns status `unsupported`, and
      `speak/cancel/enable/subscribe` neither throw nor schedule a timer.

- [x] 3.4 Implement `enable(text)`: set `enableAttempted`, reset status to `untested`,
      call `resume()` — and *not* `cancel()`, see D43 — then speak `text` so the watchdog
      re-decides (design D43).
      **Check:** a test puts a fake into `silent`, calls `enable('dog')`, fires `start`,
      and asserts status `working` and `enableAttempted: true`; a second test lets the
      watchdog trip again and asserts `silent` with `enableAttempted` still true.

- [x] 3.5 Delete the two obsolete priming tests and confirm the suite still covers rate,
      language, voice choice, empty text and the unsupported device.
      **Check:** `npx vitest run src/speech` is green with no test referencing a silent
      utterance or `pointerdown`.

## 4. The listening exercise

- [x] 4.1 Consume the store in `src/blocks/ListenView.tsx` via `useSyncExternalStore` over
      `speech.subscribe` / `speech.getState` (design D42).
      **Check:** `npm run typecheck` passes and no `speech.isAvailable()` call remains in
      `src/blocks`.

- [x] 4.2 Render the repeat control in its three appearances — 🔊 ready, 🔈 speaking,
      🔇 no sound — leaving it tappable in all of them (design D44).
      **Check:** a component test renders with each status and asserts the control's
      accessible name changes accordingly and is never `disabled`.

- [x] 4.3 Implement the fallback ordering from the spec: status `silent` with
      `enableAttempted: false` shows a "🔊 Turn on sound" action and **hides** the written
      word; `silent` with `enableAttempted: true` reveals the written word; `unsupported`
      reveals the written word immediately with no offer.
      **Check:** three component tests, one per case, asserting the presence and absence of
      both the offer and the English word.

- [x] 4.4 Keep the exercise answerable throughout: pictures stay tappable and a correct tap
      still advances in every status.
      **Check:** a component test in the `silent` status taps the correct picture and
      asserts the dispatched action is unchanged from the working case.

- [x] 4.5 Add the three control appearances and the offer button to
      `src/blocks/blocks.module.css`, extending `.listenAgain` and `.listenFallback`.
      **Check:** `npm run build` succeeds and no CSS-module class referenced from
      `ListenView.tsx` is missing from the stylesheet.

## 5. Verification

- [x] 5.1 Full suite and build.
      **Check:** `npm test`, `npm run typecheck` and `npm run build` all pass; report the
      output rather than summarising it.

- [x] 5.2 Prove the race is gone in a real browser, which needs no audible voice:
      instrument `speechSynthesis.speak`/`cancel`, play through several exercises, read the
      log.
      **Check:** zero `cancel` calls against an utterance that has not fired `start`, and
      the speak count stops growing once interaction stops (no render loop). *Done — 21
      speaks, `cancels: 0`, no growth over 6 s idle.*

- [x] 5.4 Prove the honest-failure path end to end in the app.
      **Check:** the listening exercise offers "🔊 Turn on sound" with the word hidden;
      after the offer fails the control reads "🔇 No sound here" and the word appears; the
      exercise still advances. *Done — reached `2 / 10` with no sound and no error shown.*

- [ ] 5.3 Prove the room case: open the teacher link, join as a student in a second window,
      and navigate the teacher to the listening exercise **without touching the student
      window first**.
      **Check:** the student's screen offers "🔊 Turn on sound" rather than silently
      showing nothing; one tap makes the word audible and the offer disappears. Deferred to
      group 9 — on a synthesiser-only build this cannot be judged on a machine whose engine
      is still wedged, and clips remove that obstacle (design, Risks).

## 6. Enumerating what a lesson says

- [x] 6.1 Add a pure function that collects every line a lesson can speak, covering all six
      block types: card faces, both match faces and the pair sentence, every sentence level
      × item, every TPR prompt × item, and the plain word for listen and sort. It belongs
      beside the block logic in `src/shared/`, where the per-type speech rules already live.
      **Check:** a unit test against `testLesson()` asserts the collection contains a known
      line of every type — including a composed one like `This is my nose.` — and that it is
      deduplicated; `npx vitest run src/shared` stays green and `purity.test.ts` still
      passes, since the function touches no browser API.

- [x] 6.2 Guard the enumeration against a block type being added later and silently left
      unspoken.
      **Check:** a test asserts the enumerator handles every member of `BlockType`, failing
      if a new type is added without a rule — the shape the existing block tests already use.

- [x] 6.3 Report the real numbers for the current lessons from the enumerator itself.
      **Check:** running it over `lessons/*.json` prints 70 lines for animals and 40 for
      body-parts, 110 distinct overall — matching the measurement the proposal cites.

## 7. Generating the clips

- [x] 7.1 Write `scripts/audio.ts` (run through `vite-node`, already installed with vitest —
      plain Node cannot resolve `src/shared`'s extensionless imports, and duplicating the
      enumerator is what group 6 exists to prevent): enumerate lines from `lessons/*.json`, hash each line's
      exact text, skip hashes already in `public/audio/`, synthesise the rest with `say` +
      `afconvert` (design D54). Voice from `$LESSONLOOP_VOICE`, defaulting to `Samantha`.
      Wire it as `npm run audio`.
      **Check:** on a clean `public/audio/`, `npm run audio` produces 110 `.m4a` files in
      roughly 80 seconds and prints what it made; a second run produces nothing new and
      exits without re-synthesising.

- [x] 7.2 Emit the manifest as a generated source module mapping hash → line text, bundled
      rather than fetched (design D55).
      **Check:** the manifest has one entry per file in `public/audio/`, `npm run build`
      succeeds, and the built JS grows by only a few KB — the clips must **not** appear in
      `dist/assets/`, only under `dist/audio/`.

- [x] 7.3 Fail loudly on a broken toolchain rather than writing silence.
      **Check:** with `LESSONLOOP_VOICE` set to a name that is not installed, the script
      exits non-zero naming the voice, and writes no zero-length files.

- [x] 7.4 Add a test that reports lines with no clip as a warning, not a failure — shipping
      a lesson without clips is allowed by design (D52).
      **Check:** the test passes with clips absent and prints the count, naming the lesson
      and the missing lines so an author can see the drift.

## 8. Playing the clips

- [x] 8.1 Add a clip source in `src/speech/` that plays a hashed line through an
      `HTMLAudioElement`, reporting the same start/end/error shape the synthesiser path
      already does so the phase machine is untouched.
      **Check:** unit tests against a fake audio host cover: it resolves the hash, reports
      `start` on play, `end` on ended, and a rejected `play()` promise as an error.

- [x] 8.2 Route `speak()` through the clip source first and the synthesiser on a miss
      (design D52), leaving `enable`, `getState`, `subscribe` and `cancel` unchanged.
      **Check:** a test asserts a line in the manifest never reaches the fake
      `speechSynthesis`, and a line absent from it does; the existing 26 speech tests pass
      unchanged, since they exercise the synthesiser path.

- [x] 8.3 Honour an outright refusal at once instead of waiting out the grace period, per
      the sharpened spec requirement.
      **Check:** a test rejects `play()` with a `NotAllowedError` and asserts the status is
      `silent` without any timer being advanced.

- [x] 8.4 Preload a lesson's clips when the lesson opens (design D56), treating a failed
      fetch as a miss rather than an error.
      **Check:** a test asserts opening a lesson requests exactly the clips its lines hash
      to and nothing else; a test with a failing fetch asserts the line still speaks through
      the synthesiser.

- [x] 8.5 Update `README.md` where it promises "no network call once the page has loaded",
      to say clips are same-origin static files fetched when a lesson opens.
      **Check:** the sentence reads true against what the code does.

## 9. Verification with clips

- [x] 9.1 Full suite and build.
      **Check:** `npm test`, `npm run typecheck` and `npm run build` all pass; report the
      output rather than summarising it.

- [x] 9.2a Runtime check of everything short of the speaker: open `/l/body-parts` and tap a
      card, with `HTMLMediaElement.play` and `speechSynthesis.speak` instrumented.
      **Check:** opening the lesson fetches exactly its 40 clips (329 KB, all complete,
      ≤4 ms each); tapping a card plays the clip and calls `speechSynthesis` zero times.
      *Done.*

- [x] 9.2b Confirm the clip is actually **audible**, in a hand-driven browser window.
      **Check:** the word can be heard while playing the lesson. *Done — confirmed by the
      author playing the lesson in the browser; the clips are audible and sound right.
      Not reproducible under automation, which never loads a media element at all (see
      design, Risks) — this is the one check that had to be made by ear.*

- [x] 9.3 Prove the fallback survives clips that do not arrive: move `public/audio/` aside
      with the manifest left in place, so every clip resolves but none plays — which is
      what a half-deployed asset looks like, and what the SPA fallback serves in
      production too (`not_found_handling` returns `index.html`, not a 404).
      **Check:** the line reaches the synthesiser and the exercise carries on. *Done — the
      browser log shows `CLIP_ATTEMPT f13a696f…m4a` then `SYNTHESISER "hand" rate 0.85
      lang en-US`. This found a real gap: a stalled clip fires no error, so before the fix
      the watchdog declared the device mute and the word was dropped while the device's own
      voice sat unused. Now a stalled clip hands the line on.*

- [x] 9.4 Check the other five block types speak from clips, since they share the source.
      **Check:** every line of every block resolves to a recording, so no block falls back
      by accident. *Done — per-block coverage over `animals.json`: cards 10/10, cards
      10/10, match 10/10, sentence 30/30, listen 10/10, match 30/30, sort 10/10, tpr 10/10,
      finish 0. Combined with 9.2b (clips confirmed audible in the app), every type speaks
      from a recording.*

- [ ] 9.5 (blocked with 9.2b — needs working audio output) Confirm the two sources do not sound like two different apps.
      **Check:** the same line played from a clip and from the synthesiser is the same voice
      at a comparable rate; if not, the generator's voice or rate is wrong.
