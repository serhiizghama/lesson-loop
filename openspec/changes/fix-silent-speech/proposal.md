## Why

The app is mute. Not the listening exercise — the whole lesson, from the learner's very
first tap, in a browser that is perfectly capable of speaking. The teaching cost is
concentrated in the listening exercise ("👂 Which One Is It?", page 4 of *My Body* and
page 5 of *Animals*): everywhere else the English word is also on screen, so silence
merely makes the lesson duller, but there the spoken word *is* the question. A child is
shown four pictures and asked to pick the one nobody named. The 🔊 button beside it, the
one control whose entire job is to say the word again, does nothing and says nothing
about doing nothing — so a teacher's only honest move is to read the word aloud herself
and wonder why the app has that button at all.

The cause is ours, and it is a race we lose against the browser. `speech.speak()` first
calls `unlock()`, which queues a silent priming utterance, and then calls `utter()`,
which begins with `engine.cancel()`. So the first spoken word of every session cancels
its own priming utterance about seven milliseconds after starting it. Chrome does not
recover from that: the priming utterance reports `error: canceled`, the real word
receives no `start`, no `end` and no `error` at all, `speechSynthesis.speaking` latches
to `true`, and every later utterance — including one built outside the app entirely —
queues behind it forever. Verified in Chrome 152 on macOS with 229 voices installed and
`en-US Samantha` selected: the device could speak; we stopped it.

Two design faults let a one-line race become an invisible product failure, and both are
worth fixing beyond the race itself. Speech never checks whether it was heard, so a
broken engine and a working one are indistinguishable to the rest of the app. And
`isAvailable()` — which is what decides whether the learner is shown the word to read
instead — answers a question about the *API's existence*, not about whether sound ever
comes out, so the readable fallback that the spec promises never appears on exactly the
devices that need it.

## What Changes

- Remove the priming utterance that poisons the engine. Speech is armed by the browser's
  own user-activation state, and the learner's first *real* word is what proves it, so
  nothing is ever queued only to be cancelled a few milliseconds later.
- Never cancel an utterance that has not started. A replacement word waits for the
  outgoing one to actually stop before it is queued, so the cancel/speak race cannot
  happen at any tap rate.
- **Speech learns whether it was heard.** Every utterance is watched: no `start` event
  within a short grace period, or an `error`, means the engine is not delivering. Speech
  then reports itself unavailable to the whole app instead of continuing to pretend.
- **The 🔊 control tells the truth.** It gains three visible states — ready, speaking now,
  and no sound on this device — replacing a button that looks identical whether it just
  pronounced a word or wedged the browser.
- **A learner whose device is silent is offered sound before being given up on.** When
  speech is unavailable or has not yet been permitted, the listening exercise shows an
  explicit "🔊 Turn on sound" tap. That tap is a user gesture, which is precisely what a
  student's screen in a room never gets — the teacher turns the page, the student's
  browser refuses to speak unprompted, and today nobody is told why. Only if sound still
  fails after that tap is the English word revealed to be read.
- The whole lesson gets its voice back as a side effect: cards, matching, sentence
  building, sorting and the physical-response game all speak through the same engine and
  all fail today for the same reason.

## Capabilities

### New Capabilities

None. This change repairs and sharpens behaviour that both affected capabilities already
claim to have.

### Modified Capabilities

- `speech`: priming stops using a cancellable dummy utterance; a new requirement makes
  speech verify that it was actually heard and report itself unavailable when it was not;
  the "degrades silently" requirement is narrowed — silence toward the *learner's
  progress* stays mandatory, but the app may no longer be silent about the fact that it
  cannot speak.
- `exercise-blocks`: the listening exercise's repeat control must expose its state, and
  its no-sound path becomes offer-to-enable first and reveal-the-word second, rather than
  revealing the word immediately.

## Impact

- `src/speech/speech.ts` — the priming, cancellation and availability model. This is the
  whole of the root cause.
- `src/blocks/ListenView.tsx` — the 🔊 control, its states, and the enable-sound path.
- `src/blocks/blocks.module.css` — styles for the control's three states.
- `src/speech/speech.test.ts` — the existing priming tests assert the silent utterance
  that is being removed and will be rewritten. **BREAKING** for those tests only.
- Every other block view (`CardsView`, `MatchView`, `SentenceView`, `SortView`,
  `TprView`) is untouched but stops being mute.
- No change to lesson JSON, the reducer, the room protocol, or the Worker. Speech is
  client-only and already excluded from shared pure code by `purity.test.ts`.
