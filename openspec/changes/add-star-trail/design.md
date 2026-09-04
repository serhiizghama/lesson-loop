## Context

See proposal.md — Why for the motivation, and the three delta specs for the behaviour
being contracted: `specs/lesson-player/spec.md` (the trail, the moment, the closing
screen, the pulse), `specs/speech/spec.md` (the held follow-up) and `specs/sound/spec.md`
(the chime and the notes).

What exists: `lessonProgress(lesson, state)` derives `done / total / percent` on every
render from each block's `isComplete`; every exercise block is `scored: true` and only
`finish` is not, so Animals has eight scored blocks and a closing slide. `LessonPlayer`
renders the percentage bar in the header, the `3 / 9` position in the footer, and passes
`speech` to every block view. `FinishView` renders five literal stars and the message.
`MatchView` already solves "announce a transition once, but not the one you arrived on"
with a ref initialised to the current state — the pattern the moment reuses. `speech.ts`
cancels whatever is speaking before every utterance and has no notion of "ended".
`styles.css` already zeroes every animation under `prefers-reduced-motion`.

Constraints that shape the work:

1. **Nothing new in lesson state.** State is what crosses the socket, what the Durable
   Object stores, and what `applyAction` runs on in two places. A celebration is not
   lesson state; adding a field for it would bump the version, cost a snapshot and reach
   the Worker for the sake of decoration.
2. **No exercise learns anything.** The block views take `lesson, block, state, seed,
   dispatch, speech` and nothing about rooms, roles or the shell (design D13). The moment
   must not be the seventh thing every view has to know.
3. **No network after load, no new dependency.** A bundled audio file is still a fetch
   unless inlined; a confetti library is a dependency and a canvas. Neither is needed.
4. **Speech does not queue** (spec), and iOS will not play sound of any kind before a
   gesture — the same gate speech already prime()s through.

Decisions continue the shared `Dn` sequence, last used at D31 by `add-app-icon`,
because code comments cite decisions by bare number.

## Goals / Non-Goals

**Goals**

- One derived shape — the trail — that the header, the closing screen and the moment
  all read, so that "which stars are earned" has exactly one answer.
- The moment observed by each device in its own state, so that solo and shared lessons
  run the same code and the two screens agree without a message.
- Every sound and every animation produced from what the repo already contains: CSS,
  the Web Audio API, and `speechSynthesis`.

**Non-Goals**

- No memory of "once earned": a star is the block's completion state, so a reset dims
  it (proposal — the rule chosen). No new state field, no browser-only flag.
- No change to what counts as complete, to the block logic, the lesson format, the
  action set, the protocol or the Worker.
- No per-device sound switch, no teacher-awarded star, no tapping the trail to navigate
  (proposal — Not in scope; Open Questions below).

## Decisions

### D32 — The trail is derived from lesson state beside `lessonProgress`; nothing is stored

`src/shared/reducer.ts` gains `lessonTrail(lesson, state): TrailSlot[]`, one slot per
scored block in lesson order, each `{ blockId, done, current }`, where `done` is that
block's `isComplete` and `current` is whether `state.slide` is that block. The finish
block yields no slot, so nothing is current while the closing screen shows.
`lessonProgress` stays as it is — the footer and the playthrough tests still read it.

*Why:* the trail is progress, and progress is already derived and never stored (design
D8). One function gives the header, the closing screen and the moment detector the same
answer, and the reset rule falls out of it for free: a reset makes the block incomplete,
so its slot is open again.

*Rejected:* an `earned: string[]` field in `LessonState` — reaches the reducer, the
snapshot and the Durable Object for a decoration, and it is exactly the "remember across
a reset" rule the proposal decided against. *Rejected:* a set kept in the browser only —
would differ between two screens after a reload, which is the one thing progress must
not do. *Rejected:* computing the slots inside `LessonPlayer` — the closing screen and
the tests need the same shape, and a shared function is where `lessonProgress` lives.

### D33 — The moment is the player's, fired by a transition each device sees in its own state

`LessonPlayer` keeps, in a ref, the set of slot ids that were `done` on its previous
render, initialised to the current set on mount and reset when the lesson changes. On
each render it compares: if the slot for the exercise **on screen** went from open to
done, it starts a moment for that block — a local `celebrating: blockId | null` cleared
by a 1500 ms timeout. Any other slot that went from open to done lights quietly. The
comparison is a pure function, `momentBlock(previous, next): string | null` in
`src/ui/moment.ts`, so it is unit-tested without React.

*Why:* both devices hold the same state — that is what the room guarantees — so both
observe the same transition and play the same moment within a network hop of each other,
and a solo lesson runs the exact same code. Initialising the ref to the current set is
what makes a screen that joins mid-lesson stay quiet about exercises already done; it is
the same trick `MatchView.announced` uses for the pair line. Restricting the moment to
the exercise on screen is what keeps a catch-up snapshot after an outage from firing
three moments at once for exercises nobody is looking at.

The praise phrase is chosen from the state so both screens say the same thing:
`seedFor(state.seed, blockId, generation)` modulo the four phrases ("Well done!",
"Great job!", "Perfect!", "You did it!"). No clock, no `Math.random`.

*Rejected:* a `celebrated` field in state — constraint 1, and it would bump the version
on both devices for a purely visual event. *Rejected:* a room message — solo mode has no
room, so the moment would need two implementations. *Rejected:* firing it from the block
views — constraint 2, six views would each learn it, and the closing screen would still
need the trail from somewhere else. *Rejected:* firing for any slot, on-screen or not —
see the catch-up case above.

### D34 — Praise is a held follow-up inside the speech module

`Speech` gains `speakAfter(text)`: if nothing is in progress it speaks at once; otherwise
it holds `text`, one at a time, and speaks it from the current utterance's `end` event.
Any `speak()` — and any later `speakAfter()` — replaces the held line. `cancel()` drops
it. A safety timer bounded by the utterance length speaks the held line if `end` never
arrives, and a cancelled or errored utterance drops it.

*Why:* the completing tap in a matching block speaks "The dog says Woof!" on both
devices, and "Well done!" 500 ms later would cut it mid-word; the spec forbids a queue
precisely so that taps never pile up. One held line that any tap discards is the smallest
exception that lets the praise wait its turn — what a person would do — without
reintroducing a backlog. The speech spec delta says so in as many words.

*Rejected:* a fixed delay before praise — guesses the sentence length and is wrong on a
slow voice. *Rejected:* skipping praise whenever speech is busy — the matching block,
the most common completion, would never be praised. *Rejected:* a real queue — the spec's
"tapping several cards quickly" scenario exists because a queue is what a child hears as
the app talking over itself.

### D35 — The chime and the notes are synthesised with the Web Audio API

New `src/sound/sound.ts` mirrors `speech.ts`: `createSound(host)` returning
`{ chime(), notes(count, gapMs), prime(), isAvailable() }`, the app instance built on
`globalThis`. `chime()` is three short sine notes (a rising triad, about 350 ms) through
a gain envelope; `notes(n, gap)` schedules `n` rising notes on the audio clock, one per
star. `prime()` creates the `AudioContext` and resumes it from the first `pointerdown`,
registered once by `LessonPlayer` next to `speech.prime()`. Without `AudioContext`, or
when it refuses to run, every call is a no-op.

*Why:* constraint 3. A synthesised tone needs no asset, no format decision and no fetch,
and it starts with no latency — which is what "within the same second" means when
`speechSynthesis` takes a few hundred milliseconds to open its mouth. Web Audio and
`speechSynthesis` are separate pipelines, so the chime cannot cut a line in progress
(spec "The chime does not cut speech"). A fake host makes it testable the way
`speech.test.ts` already is.

*Rejected:* bundled audio files — an asset in `public/` plus a fetch, or a data URI that
Vite inlines only under a size limit, for the same gesture gate. *Rejected:* speaking the
praise as the sound — it is already the praise, and it is late. *Rejected:* no sound —
the tick alone is what the app does today, and today is the problem.

### D36 — The flourish is CSS on elements the player owns; nothing is random

Three pieces, all rendered by `LessonPlayer`, all `aria-hidden` and `pointer-events:
none`, all removed when the moment ends:

- **The flying star.** A star element appears at the centre of the stage and animates to
  its slot. At the start of the moment the player measures the slot's and the stage's
  rectangles once (`useLayoutEffect` with a ref per slot) and writes the offset as two
  custom properties the keyframes translate by. If the slot cannot be measured, the star
  pops in place and fades — the moment still reads.
- **The slot.** The earned slot gets a bounce keyframe and its gold fill.
- **The confetti.** About twenty small spans over the stage; each particle's direction
  and distance come from its index (the golden angle, `i × 137.5°`, and `i mod 3` for
  distance), not from `Math.random`, so a re-render mid-burst draws the same burst.

`prefers-reduced-motion` needs nothing: the global rule in `styles.css` already collapses
every animation to a frame, so the star is simply in its slot and the confetti simply
gone, while the chime and the praise still happen (spec "Reduced motion").

*Why:* the flight is the link between "you did this exercise" and "that star up there is
yours" — it is what makes the two ideas one. Measuring once at the start is a dozen lines;
a layout pass per frame is not needed. Deterministic particles cost nothing and keep the
repo's "no randomness at render" habit intact even where it would be harmless.

*Rejected:* `canvas-confetti` — a dependency and a canvas for one second of decoration.
*Rejected:* random particles at render — harmless here, but the code base's one rule
about randomness would then have an exception nobody can explain. *Rejected:* no flight,
only a bounce — loses the connection the trail exists to make.

### D37 — The closing celebration belongs to the player; the finish block keeps its message

When the slide on screen is the finish block, `LessonPlayer` renders the closing row
above the block view: one star per slot, gold where `done`, unfilled otherwise, each with
`animation-delay: index × 250 ms`. On mount it calls `sound.notes(goldCount, 250)`, then
after the last star a larger confetti burst, then `speech.speak(block.message)`. All
timers are cleared and speech cancelled when the slide is left. `FinishView` loses its
five literal stars and keeps the message.

*Why:* the closing screen needs the trail, and the trail is the player's. Passing it into
every block view widens a contract six views do not want for the sake of one, and the
player already treats `finish` specially (it hides the hint). The finish block stays "a
slide, not an exercise" with exactly one job — its message — and a lesson author still
writes nothing new.

*Rejected:* `trail` on `BlockViewProps` — constraint 2. *Rejected:* a star count in the
finish block of the lesson file — data must not carry derived state, and a lesson author
would have to keep it in step with the block list. *Rejected:* keeping the five stars —
the proposal's whole point.

### D38 — The way forward pulses from state, not from a timer

`nextDue = isBlockComplete(current) && slide < blocks.length − 1`. When true and the
screen steers (`canSteer`), the footer's next arrow and the panel's "Next →" carry a
pulse class. There is no flag set by the moment and nothing to clear.

*Why:* derived means it cannot be wrong: it pulses after a moment, and it also pulses
when the teacher returns to an exercise completed earlier or joins a room mid-lesson
where the exercise on screen is already done — cases a flag set by the moment would
miss. On the student's screen there is no control to pulse (design D22), so the spec's
"nothing on the student's screen" is already true.

*Rejected:* a `pulseUntilNav` flag started by the moment — a second source of truth that
is silent exactly when the moment did not play.

## Risks / Trade-offs

- **Both devices play the sound and the praise, and the teacher is on a call.** → This
  is already how the pair line, the listening target and the sentence are spoken today:
  by both devices, from state. The moment follows the same path rather than inventing a
  second one; whether the doubling through Zoom bothers her is an Open Question with a
  small answer.
- **`end` never fires for an utterance** (some engines drop it on cancel or on a voice
  change). → The held follow-up has a safety timer bounded by the text length, and a
  cancel drops it. The worst case is praise a second late, never praise lost forever or
  spoken twice.
- **An `AudioContext` that was never unlocked** — a teacher who reloads and only
  watches has not tapped since load. → `prime()` listens for the first `pointerdown`,
  exactly like speech; until then the chime is silent and the visible moment is intact.
- **Many exercises in a narrow window.** → Slots are `flex: 1; min-width: 0` with the
  star glyph on a `clamp`, so fourteen slots fit beside the title and the invite button
  at 380 px; Animals has eight. The narrow-window scenario in the existing spec is the
  check.
- **A catch-up snapshot completes several exercises at once.** → Only the slot on screen
  can start a moment (D33); the rest light quietly.
- **React StrictMode runs effects twice in development.** → The transition is read from a
  ref updated in an effect, so the second pass sees no difference; a unit test drives the
  detector with the same trail twice and expects `null`.
- **The speech spec is softened.** → By exactly one held line that any tap discards, with
  five scenarios pinning it, including that a second follow-up replaces the first.

## Migration Plan

Nothing to migrate: no state shape, no protocol message, no lesson field and no deployed
resource changes. A room opened before the change plays the moment the instant a device
with the new code observes a completion. Rollback is a revert: the header shows the
percentage bar again and the closing screen its five stars.

## Open Questions

- Whether the teacher wants a per-device switch for sound and speech together. Everything
  the app says already plays on both devices; if a real lesson shows the doubling through
  Zoom is a nuisance, one switch covering speech and effects alike is its own small
  change and alters nothing here.
- Whether the four praise phrases should be spoken by the closing screen's voice as well,
  or the closing message is enough. Content, not behaviour: it changes a string.
