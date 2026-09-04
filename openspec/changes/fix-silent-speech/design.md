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

Decisions continue the shared `Dn` sequence, last used at D38 by `add-star-trail`, because
code comments cite decisions by bare number.

## Goals / Non-Goals

**Goals:**

- Make it structurally impossible for the app to cancel an utterance that has not started,
  at any tap rate, without asking any caller to think about it.
- Give `speech` an honest answer to "did the learner hear that?", and let the UI subscribe
  to it.
- Give the listening exercise a repeat control whose appearance is derived from that
  answer, plus a gesture-carrying way out for a screen that was never tapped.
- Take the listening exercise off the device's voice entirely, without making any lesson
  depend on a generation step having been run.

**Non-Goals:**

- Recording anything by hand, or a human voice. The clips are synthesised.
- A voice picker, a per-device sound switch, or letting a lesson choose its own voice. One
  voice for the whole app, chosen once at generation time.
- Generating clips in CI or at build time, or fetching a line's audio at runtime. D53 and
  D54 give the reasons.
- Any change to lesson JSON, the reducer, the room protocol, or the Worker. Speech is
  per-device and stays out of synchronised state — two learners on two devices may
  legitimately have different sound, and the room must not try to reconcile that.
- Choosing a nicer voice, or a voice picker. `pickVoice()` keeps its current behaviour.
- A global sound indicator elsewhere in the app. Only the listening exercise is
  load-bearing on audio; the other five blocks print their word on screen already.

## Decisions

### D39 — Delete the priming utterance rather than delay its cancellation

`prime()` and its silent `utter(' ', 0)` go away entirely, along with the `pointerdown`
listener and `prime` on the `Speech` type. `LessonPlayer`'s effect keeps only the
`speech.cancel()` cleanup.

Nothing replaces it. Chrome needs sticky activation, which the tap that opened the lesson
already supplied; the learner's first real word is what proves speech works, and if it
does not work, D41 notices and D43 offers a fix that *is* inside a gesture handler.

*Rejected: keep the priming utterance but defer the real word by a tick* (`setTimeout(0)`,
or waiting for the primer's `end`). It removes the specific 7 ms race but keeps a
throwaway utterance in the engine, keeps the cancel-before-start path reachable under
rapid taps, and buys nothing — the primer never had a job that sticky activation does not
already do. It also delays every first word behind a real spoken pause.

*Rejected: prime with `speechSynthesis.resume()` instead of an utterance.* Cheaper, but it
is a no-op on a non-paused engine and does not affect activation, so it is ceremony.

### D40 — One utterance in flight, with a hand-off gate

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

### D41 — A watchdog turns "no `start` event" into a status

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

*Rejected: treating the very first failure as fatal and never retrying.* D43's enable action
deliberately clears the status back to untested and tries again, because the single most
common cause of a first failure is a screen that has had no gesture yet — a condition the
learner can fix.

### D42 — `isAvailable()` becomes a four-state status the UI can subscribe to

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

### D43 — "Turn on sound" is a real gesture, and the module remembers it was tried

`speech.enable(text)` is called from the button's `onClick` — inside the gesture handler,
which is what iOS Safari wants and what Chrome's sticky activation gets for free. It
resets the status to `untested`, calls `resume()`, and speaks `text`. D41's watchdog then
decides: `working`, or `silent` again.

It deliberately does **not** call `cancel()` first. That was the original plan, and the
measurements taken while planning this change refute it: `cancel()` followed by `resume()`
did not revive a wedged engine. So the cancel buys nothing against the case it was aimed
at, while being itself the cancel-an-unstarted-utterance pattern that wedges engines — it
would risk the common case (a screen that has simply had no gesture, which speaking from
inside the handler fixes on its own) to chase a case it cannot fix. `resume()` stays: it
is a no-op unless Chrome has paused itself, which it sometimes does.

The module keeps an `enableAttempted` flag, because "silent and never asked" and "silent
and asked, still nothing" are different screens and the difference is device-scoped, not
block-scoped. Putting it in `ListenView`'s `useState` would re-offer the failed button
every time the block re-mounts — after a reset, or after the teacher navigates away and
back.

### D44 — The repeat control is restyled, not replaced

`.listenAgain` grows into the exercise's primary control with three appearances (ready,
speaking, silent) in `blocks.module.css`. It stays tappable while speaking — replacing the
word mid-utterance is legitimate, and disabling the one button a child is jabbing at is
worse than letting them jab.

Its label carries the state in words as well as colour, because the audience is children
who may not read English yet *and* a teacher watching over Zoom who needs to know in one
glance whether the student's device has sound. The emoji does that work: 🔊 ready,
🔈 speaking, 🔇 silent.

### D45 — Recorded audio was rejected here, then reversed; deleting the exercise stays rejected

*Recorded audio* was rejected on two grounds, and **one of them was simply false.** The
claim was that clips "cannot cover the `sentence` block, which composes its lines from
templates at runtime, so TTS would have to be fixed anyway." A template and the vocabulary
it is applied to are both static lesson data, so every line the block can produce is
enumerable without running anything. Measured across both lessons: 110 distinct lines,
1470 characters — the whole app, not just `sentence`. The premise was wrong and the
conclusion went with it. D52 records what replaced it.

The second ground was real but weaker than it looked: clips make a new lesson require an
asset step, against the rule that "a new lesson must require zero new code." D52 answers
it by making clips an *upgrade* to a lesson rather than a precondition for one — a lesson
speaks the moment its JSON exists, through the synthesiser this change repaired.

What is left of the original objection is worth keeping: clips are not free. They are
committed bytes, they go stale when a line is edited, and they need a machine that can
synthesise them. D53 to D56 are about paying that honestly rather than pretending it is
nothing.

*Deleting the listening exercise* was the other option on the table. It loses because the
exercise is not what is broken. The engine is, and it is broken for all six block types —
deleting `listen` would hide the symptom while cards, matching, sentences, sorting and the
physical-response game stayed mute, on an app whose speech spec opens with "Spoken English
is what makes these exercises a language lesson rather than a picture game."

### D52 — Two sources, clip first, synthesiser second

`Speech` keeps the interface this change already gave it — `speak`, `enable`, `getState`,
`subscribe`, `cancel`. Underneath, `speak(line)` looks the line up in a manifest: a hit
plays a clip through an `HTMLAudioElement`, a miss goes to `speechSynthesis` exactly as it
does today. Everything above — the phase machine, the four statuses, the watchdog, the
honest control, the "Turn on sound" offer — is unchanged and shared by both sources.

*Why this ordering rather than clips only:* it is what keeps "lessons are data". A lesson
written this afternoon speaks this afternoon; running the generator is what makes it
dependable, not what makes it work. It also means a line edited in JSON degrades to the
device voice instead of going silent, which is the failure mode an author will actually
hit.

*Why the fallback is worth having at all, given clips are more reliable:* a clip can be
missing for ordinary reasons — a new lesson, a typo fixed after the last run, a phrase
someone reworded. Silence in those cases would be a worse bug than the one this change
exists to fix, and it would be invisible to the author.

The clip path also improves the honesty of D41's watchdog, which is why the spec was
sharpened alongside it: `audio.play()` returns a promise that rejects with a named error
when playback is not permitted, so a blocked clip is *reported* rather than inferred from
1500 ms of nothing. The grace period stays for the synthesiser, which has no such signal.

### D53 — Clips are generated by the author, not by CI and not by the browser

`npm run audio` walks `lessons/*.json`, enumerates every speakable line, and synthesises
the ones missing from `public/audio/`. It is run by whoever edited a lesson, and its
output is committed — the same arrangement `add-app-icon` D28 chose for its PNGs.

*Rejected: generate in CI.* The runner has no macOS voices, so it would need a cloud TTS
key in repository secrets and would spend an API call on every push for output that almost
never changes. It would also make the audio a build artefact that no one has ever heard
before it ships.

*Rejected: synthesise on the fly at runtime, through an API.* It puts a key in the client
or a proxy in the Worker, spends a network round trip before a child hears a word, and
breaks the README's "no network call once the page has loaded" far more thoroughly than
static files do. For 1470 characters of fixed vocabulary it buys nothing.

*Rejected: the unofficial Google Translate TTS endpoint.* Undocumented, CORS-blocked from
a browser, token-gated, rate-limited by IP, and against its terms of service. Not viable
at runtime and not defensible at generation time either.

### D54 — macOS `say` and `afconvert`, with the voice as a parameter

The generator shells out to two tools that ship with macOS:

```
say -v "$VOICE" -r 145 -o line.aiff "the line"
afconvert line.aiff line.m4a -f m4af -d aac
```

Verified end to end on the author's machine: three clips in two seconds, valid mono AAC at
22 kHz, 0.4–1.2 s each. Extrapolated over 110 lines that is **925 KB and about 70
seconds**, once (measured over the full run, not extrapolated). No account, no API key, no cost, and the voice is the same `en-US
Samantha` the Web Speech path already selected, so the two sources do not sound like two
different apps.

The voice is read from an environment variable with `Samantha` as the default, so
switching to the Enhanced variant — or to a cloud TTS later — changes one call, not the
pipeline. That matters for one reason worth writing down: Apple's system voices are
licensed for use on Apple platforms, which is comfortable for an internal teaching tool and
would want revisiting if this were published broadly.

*Rejected: a cloud TTS now* (Google Cloud, OpenAI, ElevenLabs). Better voices, and 1470
characters fits any free tier — but it needs an account, a key and a billing setup for a
job the machine can already do offline. Left as the documented upgrade path instead.

### D55 — Clips are static files under `public/`, never imported from code

They live at `public/audio/<hash>.m4a`, where the hash is taken over the line's exact
text. `public/` is copied into `dist/` verbatim, and `add-cloudflare-deploy` D46 serves
`dist/` through an assets binding for exactly this reason: bundled bytes count against the
Worker's size limit, served bytes do not. An `import` of a clip would quietly move 925 KB
into the bundle; the manifest alone costs 5.9 KB, which is the point of separating them.

Hashing rather than naming files after words means a line edited in JSON simply misses in
the manifest and falls back to the synthesiser, instead of playing the old wording under
the right-looking name. The manifest keeps the original text beside each hash so the
directory stays debuggable.

The hash covers **the voice as well as the line**. Hashing the text alone was the first
plan and it is a trap: the generator skips lines that already have a clip, so installing a
better voice and re-running would match every existing hash and regenerate nothing. The
clips would stay in the old voice permanently, with no signal that the upgrade had done
nothing — precisely the silent-wrong-state this change exists to remove. With the voice in
the hash, changing it produces a new set and the old one falls out into the stale report.

The manifest itself is generated into source and bundled, not fetched: 110 entries is a few
kilobytes, and knowing *whether* a clip exists must not itself require a network call.

### D56 — A lesson's clips are fetched when the lesson opens

Opening a lesson requests its clips up front rather than at the moment each word is
spoken. At roughly 200–400 KB per lesson this is a fraction of what the page already
loads, and it keeps the README's promise honest: once the lesson is on screen, nothing
else goes to the network.

*Rejected: fetch each clip on demand.* Simpler, and slightly faster to first paint — but
the first time each exercise type speaks, the child waits on the network, and on a poor
connection that lands exactly on the word they were asked to identify.

A fetch that fails is not an error the learner sees: the line falls back to the
synthesiser, which is the same path a missing clip takes.

## Risks / Trade-offs

- **The 1500 ms grace period is a guess about other people's devices.** A genuinely slow
  remote voice could be marked `silent` while it was merely loading, and the learner would
  be offered a "turn on sound" button they did not need. → Tapping it costs one tap and
  clears the status back to `untested`, so a false positive is recoverable rather than
  terminal. The constant is named and lives in one place.

- **iOS Safari may still refuse the auto-spoken word on entering the exercise**, because
  the `useEffect` that speaks it is not inside the gesture's call stack. → This is exactly
  what D43 is for: the failure is detected, and the offered button speaks from inside a
  handler. Worth an explicit check on a real iPhone before this is called done, since it is
  the one platform this design does not fully reason its way to.

- **The wedge already inflicted on a user's browser is not repaired by this change.**
  Chrome's TTS controller survives page reloads; a browser poisoned by the current build
  may need a restart before it speaks again. → Nothing in the app can fix that, and it must
  be said out loud when verifying or the fix will look like it failed. Note this affects
  only a browser that already ran the broken build — no learner reaches that state once
  this ships. Clips sidestep it entirely, which is what makes the runtime checks in group 8
  possible on a machine whose synthesiser is still stuck.

- **Committed clips go stale silently.** Edit a line in a lesson JSON and its clip no
  longer matches by hash, so the line quietly reverts to the device voice — correct
  behaviour, but the author may not notice the downgrade. → A generator that reports what
  is missing, and a test that fails when a lesson has lines with no clip, turn a silent
  drift into a visible one. The test must warn rather than block, since a lesson is allowed
  to ship without clips by design (D52).

- **925 KB of binary in git, growing with every lesson.** → It is committed once per line
  and never rewritten, the same trade `add-app-icon` D28 already made for its PNGs. At the
  current rate a lesson costs roughly 300 KB; if the library grows past a few dozen
  lessons this wants revisiting, and the manifest makes that measurable rather than a
  guess.

- **Two defects in this design were found only by running it in a browser**, and both were
  invisible to tests written against a fake. Warming the cache with detached `Audio`
  elements fetches nothing in Chrome, and reusing a warmed element to play from means
  playing one that never finished loading. The fix — `fetch` to warm, a fresh element to
  play — is now pinned by tests that assert warming constructs no media elements at all.
  → The lesson generalises: a fake that answers instantly cannot model a source that
  answers slowly or not at all, so the browser check in group 9 is not optional polish.

- **Audio cannot be verified through browser automation.** Under the debugger attachment
  this project's tooling uses, no media element ever leaves `readyState 0` — not the
  clips, not a synthetic in-memory WAV — while the same bytes decode fine through
  `decodeAudioData` and the same pages play normally in a hand-driven window. An
  automated browser therefore reports silence identically for a correct implementation and
  a broken one, and reading that as "the machine's audio is broken" is a mistake this
  change made once already. → Verify in layers that automation *can* see (the bytes decode,
  the server serves ranges, the right source is chosen, the fetches complete) and leave
  exactly one question — does sound reach the speaker — to a person with a normal window.

- **The generator only runs on macOS.** An author on Linux or Windows cannot produce clips,
  though they can still write lessons that speak through the synthesiser. → Acceptable
  while there is one author on a Mac; D54 keeps the synth step behind one call so a cloud
  TTS can replace it without touching the rest.

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

Client-only behaviour with no persisted or synchronised state: the change ships in one
build and rollback is reverting the commit. Nothing in a room, a lesson file, or the Worker
is versioned by it.

The clips are the only ordering constraint, and it is a soft one. They can land in the same
commit or a later one — until they exist every line falls back to the synthesiser, which is
the same state the app is in the moment this change's first half ships. There is no
migration to run and nothing to back-fill.

## Open Questions

None that block implementation. The iOS Safari behaviour under D43 is a verification step,
not an unknown that changes the design: whichever way it lands, the offered button is the
mitigation.
