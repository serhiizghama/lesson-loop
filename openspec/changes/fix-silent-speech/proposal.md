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

Fixing the race makes the app speak again, and that is not the same as making it *reliably
audible*. The bug was ours, and none of what follows is a verdict on the Web Speech API —
but even a correct caller is left standing on whatever voice the device happens to ship.
That voice varies by browser and operating system, is absent on some Linux and kiosk
builds, differs in quality between two students in the same class, and can only be spoken
after a gesture the student's screen may never receive. Everywhere else in the lesson that
is survivable, because the English word is also printed. In the listening exercise the
spoken word *is* the question, and a dependency that thin is the wrong thing to rest it on.

It does not have to be. Every line these lessons can speak is fixed data: the items and
the templates both live in the lesson JSON, so the full set can be enumerated before
anyone opens the app. Measured across both current lessons, that set is **110 distinct
lines, 1470 characters** — about 925 KB once synthesised, and about 70 seconds to
generate. A vocabulary that small does not need to be improvised on the learner's device
every time a child taps a picture.

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
- **Sound gets a prepared source.** Every line a lesson can speak is synthesised ahead of
  time into a small audio clip, committed to the repository and served as a static file.
  Playing a file depends on no device voice, sounds the same for every student, and
  reports its own failures instead of going quiet.
- **The device's synthesiser becomes the fallback, not the mechanism.** A line with no clip
  — a lesson written but not yet generated, a phrase changed since the last run — is still
  spoken the repaired way. So a new lesson speaks the moment its JSON exists, and
  generating its clips is what makes it dependable rather than what makes it work.
- **One command generates the clips.** A committed script enumerates every speakable line
  from the lesson data and synthesises the ones that are missing. Adding a lesson still
  takes zero new code.

## Capabilities

### New Capabilities

None. This change repairs and sharpens behaviour that both affected capabilities already
claim to have.

### Modified Capabilities

- `speech`: priming stops using a cancellable dummy utterance; a new requirement makes
  speech verify that it was actually heard and report itself unavailable when it was not;
  the "degrades silently" requirement is narrowed — silence toward the *learner's
  progress* stays mandatory, but the app may no longer be silent about the fact that it
  cannot speak. Speech also gains a prepared source: it SHALL prefer a recording of a line
  where one exists and fall back to the device's synthesiser where it does not, and the
  set of lines a lesson can speak SHALL be derivable from lesson data alone.
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
- **New:** a clip player and a bundled manifest beside `src/speech/`, an author-time
  generator under `scripts/`, and the clips themselves under `public/audio/`. The clips are
  committed artefacts, the way `add-app-icon` commits its PNGs.
- `package.json` — an `audio` script. No new runtime dependency and nothing added to the
  browser bundle beyond the manifest, which is a few KB of text.
- The clips must be reached as static files and never imported from code:
  `add-cloudflare-deploy` D46 serves `dist/` through an assets binding precisely so static
  bytes do not count against the Worker's bundle size limit, and `public/` is copied into
  `dist/` verbatim.
- `README.md` — "no network call once the page has loaded" needs a word about clips, which
  are same-origin static files fetched when a lesson opens.
- No change to lesson JSON, the reducer, the room protocol, or the Worker. Speech is
  per-device and client-only, already excluded from shared pure code by `purity.test.ts`;
  which source a device used is never synchronised, because two students may legitimately
  differ.
