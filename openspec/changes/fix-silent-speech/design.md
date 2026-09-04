## Context

See `proposal.md` — Why for the failure and its measured behaviour. What matters here is
the shape of the thing being changed.

`src/speech/speech.ts` is a ~80-line closure over a `SpeechHost` (normally `globalThis`),
handed to every block view as a `speech` prop by `LessonPlayer`. Its whole public surface
is `speak`, `isAvailable`, `prime`, `cancel`. It is deliberately client-only:
`src/shared/purity.test.ts` forbids `speechSynthesis` inside `src/shared`, because that
directory is bundled into the Worker. Nothing about this change may move speech into
shared code.

Three properties of the Web Speech API drive every decision below.

**Cancelling an utterance that has been accepted but has not started wedges Chrome.**
Measured in Chrome 152 / macOS: the cancelled utterance reports `error: canceled`, the
next one receives no `start`, no `end`, no `error`, `speechSynthesis.speaking` latches to
`true`, and every subsequent utterance — including ones created outside the app — queues
behind it and never plays. Cancelling one that has already *started* is fine; that is the
normal replace path and it works.

**Failure is not reported.** A blocked or wedged engine does not throw and does not fire
`error`. It fires nothing. The only way to learn that the device did not speak is to
notice that `start` never arrived.

**Chrome gates speech on sticky user activation** (`navigator.userActivation.hasBeenActive`),
not on being inside the gesture's call stack. Any prior tap on the page arms it; a student
whose screen is turned by the teacher has had no tap at all, so their device refuses. iOS
Safari has historically been stricter and wanted the call inside the handler itself.

## Goals / Non-Goals

**Goals:**

- Make it structurally impossible for the app to cancel an utterance that has not started,
  at any tap rate, without asking any caller to think about it.
- Give `speech` an honest answer to "did the learner hear that?", and let the UI subscribe
  to it.
- Give the listening exercise a repeat control whose appearance is derived from that
  answer, plus a gesture-carrying way out for a screen that was never tapped.

**Non-Goals:**

- Recorded audio assets. Rejected below; keeping the door open is enough.
- Any change to lesson JSON, the reducer, the room protocol, or the Worker. Speech is
  per-device and stays out of synchronised state — two learners on two devices may
  legitimately have different sound, and the room must not try to reconcile that.
- Choosing a nicer voice, or a voice picker. `pickVoice()` keeps its current behaviour.
- A global sound indicator elsewhere in the app. Only the listening exercise is
  load-bearing on audio; the other five blocks print their word on screen already.

## Decisions

### D1: Delete the priming utterance rather than delay its cancellation

`prime()` and its silent `utter(' ', 0)` go away entirely, along with the `pointerdown`
listener and `prime` on the `Speech` type. `LessonPlayer`'s effect keeps only the
`speech.cancel()` cleanup.

Nothing replaces it. Chrome needs sticky activation, which the tap that opened the lesson
already supplied; the learner's first real word is what proves speech works, and if it
does not work, D3 notices and D5 offers a fix that *is* inside a gesture handler.

*Rejected: keep the priming utterance but defer the real word by a tick* (`setTimeout(0)`,
or waiting for the primer's `end`). It removes the specific 7 ms race but keeps a
throwaway utterance in the engine, keeps the cancel-before-start path reachable under
rapid taps, and buys nothing — the primer never had a job that sticky activation does not
already do. It also delays every first word behind a real spoken pause.

*Rejected: prime with `speechSynthesis.resume()` instead of an utterance.* Cheaper, but it
is a no-op on a non-paused engine and does not affect activation, so it is ceremony.

### D2: One utterance in flight, with a hand-off gate

`speak()` stops calling `cancel()` unconditionally. The module tracks a phase and a single
waiting slot:

| Phase on `speak(text)` | Action |
|---|---|
| `idle` | speak `text` now |
| `speaking` (its `start` fired) | `cancel()`, then speak `text` — the safe replace path |
| `queued` (accepted, not started) | store `text` in the waiting slot and return |

When the in-flight utterance fires `start`, a waiting word takes over immediately
(`cancel()` is safe now). When it fires `end` or `error`, a waiting word is spoken
directly. The slot holds one word, so four rapid taps leave exactly one — the last —
which is what the spec requires.

This is the whole fix for the race, and it lives in one place. No block view learns
anything about it.

*Rejected: a fixed `setTimeout` delay between cancel and speak.* Picking the number is
guesswork, it is wrong on a slow device, and it makes every replacement laggy in exchange
for a probabilistic guarantee. The lifecycle events say exactly when it is safe; use them.

*Rejected: never cancel at all, and let the queue drain.* Violates the existing "utterances
SHALL NOT accumulate" requirement — four taps would play four words at a child.

### D3: A watchdog turns "no `start` event" into a status

Every utterance is timed from the moment it is handed to the engine. If `start` has not
fired within a grace period, or if `error` fires, the module's status becomes `silent` and
stays there for the session.

Grace period: **1500 ms**, as one named constant. Local macOS/Windows voices start in well
under 100 ms; Chrome's remote Google voices are the slow case at a few hundred. 1500 ms
clears both with room to spare while still being short enough that a child is not staring
at a dead button. During the wait the control shows its speaking state, so the delay reads
as loading rather than as nothing happening.

*Rejected: polling `speechSynthesis.speaking` on an interval.* It is the flag that lies —
it latched to `true` in the wedged case while nothing played. The `start` event is the
only trustworthy signal.

*Rejected: treating the very first failure as fatal and never retrying.* D5's enable action
deliberately clears the status back to untested and tries again, because the single most
common cause of a first failure is a screen that has had no gesture yet — a condition the
learner can fix.

### D4: `isAvailable()` becomes a four-state status the UI can subscribe to

| Status | Meaning | Listening exercise shows |
|---|---|---|
| `unsupported` | no `speechSynthesis` / no `SpeechSynthesisUtterance` | the written word, immediately |
| `untested` | API present, nothing proven either way | the repeat control, ready |
| `working` | a `start` event has been observed | the repeat control, ready |
| `silent` | watchdog tripped or `error` fired | "turn on sound", then the written word |

`unsupported` is separated from `silent` on purpose: offering "turn on sound" on a device
with no speech API at all is a promise that cannot be kept, so that case goes straight to
the written word. This is the one place the spec's "offer first, reveal second" ordering is
skipped, and it is skipped because the offer would be a lie.

The module also exposes whether an utterance is in flight, and a `subscribe(listener)`
returning an unsubscribe. React reads it through `useSyncExternalStore`, which is the
supported way to consume an external mutable store in React 19 and avoids tearing when
several views observe the same module.

*Rejected: threading speech state down as props from `LessonPlayer`.* The state changes on
engine events, not on renders, so `LessonPlayer` would need its own subscription and a
re-render of the whole player for a button label. The store belongs where the events are.

*Rejected: a boolean `isAvailable()` plus a separate `hasFailed()`.* Two booleans encode
four states badly and invite the impossible combination.

### D5: "Turn on sound" is a real gesture, and the module remembers it was tried

`speech.enable(text)` is called from the button's `onClick` — inside the gesture handler,
which is what iOS Safari wants and what Chrome's sticky activation gets for free. It
resets the status to `untested`, best-effort clears a wedged engine (`cancel()` then
`resume()`), and speaks `text`. D3's watchdog then decides: `working`, or `silent` again.

The module keeps an `enableAttempted` flag, because "silent and never asked" and "silent
and asked, still nothing" are different screens and the difference is device-scoped, not
block-scoped. Putting it in `ListenView`'s `useState` would re-offer the failed button
every time the block re-mounts — after a reset, or after the teacher navigates away and
back.

### D6: The repeat control is restyled, not replaced

`.listenAgain` grows into the exercise's primary control with three appearances (ready,
speaking, silent) in `blocks.module.css`. It stays tappable while speaking — replacing the
word mid-utterance is legitimate, and disabling the one button a child is jabbing at is
worse than letting them jab.

Its label carries the state in words as well as colour, because the audience is children
who may not read English yet *and* a teacher watching over Zoom who needs to know in one
glance whether the student's device has sound. The emoji does that work: 🔊 ready,
🔈 speaking, 🔇 silent.

### D7: Rejected at the product level — recorded audio, and deleting the exercise

*Recorded audio files per item* (an `audio` field in lesson JSON, `HTMLAudioElement`
playback) is the maximally reliable answer and was considered first. It loses on the
project's own architecture rule: "Lessons are data (JSON), never code — a new lesson must
require zero new code." Recorded audio makes a new lesson require a new *asset pipeline*,
which is the same tax wearing a different hat, on a product whose selling point is that
the teacher writes a JSON file. It also cannot cover the `sentence` block, which composes
its lines from templates at runtime, so TTS would have to be fixed anyway. Kept on the
table as a later upgrade if pronunciation quality, not reliability, turns out to be the
complaint.

*Deleting the listening exercise* was the other option on the table. It loses because the
exercise is not what is broken. The engine is, and it is broken for all six block types —
deleting `listen` would hide the symptom while cards, matching, sentences, sorting and the
physical-response game stayed mute, on an app whose speech spec opens with "Spoken English
is what makes these exercises a language lesson rather than a picture game."

## Risks / Trade-offs

- **The 1500 ms grace period is a guess about other people's devices.** A genuinely slow
  remote voice could be marked `silent` while it was merely loading, and the learner would
  be offered a "turn on sound" button they did not need. → Tapping it costs one tap and
  clears the status back to `untested`, so a false positive is recoverable rather than
  terminal. The constant is named and lives in one place.

- **iOS Safari may still refuse the auto-spoken word on entering the exercise**, because
  the `useEffect` that speaks it is not inside the gesture's call stack. → This is exactly
  what D5 is for: the failure is detected, and the offered button speaks from inside a
  handler. Worth an explicit check on a real iPhone before this is called done, since it is
  the one platform this design does not fully reason its way to.

- **The wedge already inflicted on a user's browser is not repaired by this change.**
  Chrome's TTS controller survives page reloads; a browser poisoned by the current build
  may need a restart before it speaks again. → Nothing in the app can fix that. It must be
  said out loud when verifying, or the fix will look like it failed.

- **Every existing priming test is deleted, not adapted.** They assert the silent utterance
  and the `pointerdown` listener, both of which are the bug. → The replacement suite has to
  cover more than they did: the hand-off gate under rapid calls, the watchdog, the status
  transitions, and a direct regression test that `cancel()` is never called while an
  utterance is queued-but-unstarted. That last one is the test that would have caught this.

- **The fake `SpeechHost` in tests must now emit lifecycle events**, which makes it a
  meaningfully more complex fake and therefore a thing that can itself be wrong. → Keep it
  event-accurate to the real API (`start` before `end`; `error` instead of `end`; neither,
  for the wedged case) and drive the timings with vitest fake timers.

- **Four states is more surface than one boolean**, and every consumer of `isAvailable()`
  now has a subtler question to answer. → Only `ListenView` reads it today; the other five
  views only call `speak()`, which stays a fire-and-forget void.

## Migration Plan

Not applicable — client-only behaviour with no persisted or synchronised state. The change
ships in one build; rollback is reverting the commit. Nothing in a room, a lesson file, or
the Worker is versioned by it.

## Open Questions

None that block implementation. The iOS Safari behaviour under D5 is a verification step,
not an unknown that changes the design: whichever way it lands, the offered button is the
mitigation.
