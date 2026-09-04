## Context

See proposal.md — Why for the motivation, and the three delta specs for the behaviour
being contracted: `specs/lesson-player/spec.md` (the trail, the moment, the closing
screen, the pulse) and `specs/sound-effects/spec.md` (the chime and the notes). There is no
`speech` delta: the celebration says nothing, so that capability is untouched (D77).

This change was first planned at `4f76224`, before `fix-silent-speech`, `add-sound-control`
and `add-build-version` landed. Three of those landings move the ground it stands on, and
the design below is written against the code as it is now rather than as it was:

1. **Speech has no `prime()`.** It rides the sticky user activation an earlier tap already
   gave, and arming it with a throwaway utterance is now forbidden by its own spec, because
   cancelling an unstarted utterance wedges Chrome (design D39, D40). A screen that has had
   no gesture at all is offered `enable(text)` from inside a real handler (D43).
2. **Speech is two sources, not one.** A line is played from a prepared recording where one
   exists and synthesised on the device where it does not (D52), behind one phase machine
   — `idle | queued | speaking` — with a `waiting` slot, a start watchdog and a generation
   counter. It is the most delicate module in the repo, and this change ends up not
   touching it at all (D77): the celebration says nothing.
3. **There is a sound setting, and it is the teacher's.** One per room, on by default,
   covering both screens, suppressing what the app volunteers and never what the learner
   presses to hear (D66, D67, D72). It is applied in exactly one place: `quietable()` in
   `src/speech/policy.ts`, wrapping the `speech` prop the player hands every block view.
   PLAN D-27 already records that this change's chime and notes obey the same switch — the
   open question the first draft left is answered, and is a constraint here.

What else exists: `lessonProgress(lesson, state)` derives `done / total / percent` from each
block's `isComplete`; every exercise block is `scored: true` and only `finish` is not, so
Animals has eight scored blocks and a closing slide. Progress is computed in the **store**
— `useLesson` and `useRoom` each memoise it — and `roomStoreIsALessonStore` is a
compile-time assertion that the two agree. `LessonPlayer` renders the percentage bar, the
sound control, the `3 / 9` position, and passes the wrapped `voice` to every block view.
`FinishView` renders five literal stars and the message. `MatchView` already solves
"announce a transition once, but not the one you arrived on" with a ref initialised to the
current value — the pattern the moment reuses. `speakableLines(lesson)` enumerates every
line a lesson can speak and drives `scripts/audio.ts`; it returns `[]` for `finish`, and
`speakable.test.ts` asserts that `finish` is the only silent type. `styles.css` collapses
`animation-duration` and `transition-duration` under `prefers-reduced-motion` — but not
`animation-delay`.

Constraints that shape the work:

1. **Nothing new in lesson state.** State is what crosses the socket, what the Durable
   Object stores, and what `applyAction` runs on in two places. A celebration is not
   lesson state; adding a field for it would bump the version, cost a snapshot and reach
   the Worker for the sake of decoration.
2. **No exercise learns anything.** The block views take `lesson, block, state, seed,
   dispatch, speech` and nothing about rooms, roles or the shell (design D13). The moment
   must not be the seventh thing every view has to know.
3. **No network after load, no new dependency.** A bundled audio file for the *chime* is
   still a fetch unless inlined; a confetti library is a dependency and a canvas. Neither
   is needed. (Recorded *speech* is a different matter — those clips already exist and are
   preloaded per lesson.)
4. **One setting, one place.** Whatever the app newly volunteers must reach the setting
   through a wrapper at the edge, not through a rule copied into the player's timers.

Decisions continue the shared `Dn` sequence used by code comments, last at **D74**, so this
change opens at D75. PLAN §12's product decisions are a separate sequence, last at **D-27**,
so the product rule this change records is **D-28**.

## Goals / Non-Goals

**Goals**

- One derived shape — the trail — that the header, the closing screen and the moment
  all read, so that "which stars are earned" has exactly one answer.
- The moment observed by each device in its own state, so that solo and shared lessons
  run the same code and the two screens agree without a message.
- Every effect produced from what the repo already contains: CSS and the Web Audio API.
- The sound setting reaching the new noise by the same route it already reaches the old,
  so that "what does the switch cover?" keeps one answer.
- Not one line added to `src/speech/`. Acknowledging a child is a sound and a picture here,
  never a word (D77), so the module that would have had to change does not.

**Non-Goals**

- No memory of "once earned": a star is the block's completion state, so a reset dims
  it (proposal — the rule chosen). No new state field, no browser-only flag.
- No change to what counts as complete, to the block logic, the lesson format, the
  action set, the protocol or the Worker.
- No separate switch for effects, no teacher-awarded star, no tapping the trail to
  navigate (proposal — Not in scope).
- No second "turn on sound" offer for effects. There is one such offer and it is speech's.
- **No spoken praise, and no spoken closing message.** The app does not congratulate out
  loud; that is the teacher's line to say (D77).

## Decisions

### D75 — The trail is derived beside `lessonProgress` and read in the player, not held in the store

`src/shared/reducer.ts` gains `lessonTrail(lesson, state): TrailSlot[]`, one slot per
scored block in lesson order, each `{ blockId, done, current }`, where `done` is that
block's `isComplete` and `current` is whether `state.slide` is that block. The finish
block yields no slot, so nothing is current while the closing screen shows.
`lessonProgress` stays exactly as it is — the footer, the playthrough tests and both
stores still read it.

`LessonPlayer` calls it through `useMemo(() => lessonTrail(lesson, state), [lesson, state])`
rather than receiving it from the store.

*Why:* the trail is progress, and progress is already derived and never stored (design D8).
One function gives the header, the closing screen and the moment detector the same answer,
and the reset rule falls out of it for free: a reset makes the block incomplete, so its
slot is open again.

Deriving it in the player rather than the store is the part that changed since the first
draft. `progress` lives in the store because two stores must agree on it and
`roomStoreIsALessonStore` proves they do; putting `trail` there too would mean editing
`useLesson`, `useRoom`, and the three fake stores that `student-view.test.tsx`,
`build-line.test.tsx` and `lesson-sound.test.tsx` each build by hand — five files touched
so that a pure function of `(lesson, state)` can be called one level higher. The player
already holds both arguments.

*Rejected:* an `earned: string[]` field in `LessonState` — reaches the reducer, the
snapshot and the Durable Object for a decoration, and it is exactly the "remember across
a reset" rule the proposal decided against. *Rejected:* a set kept in the browser only —
would differ between two screens after a reload, which is the one thing progress must
not do. *Rejected:* `trail` on the store beside `progress` — the five files above, for
nothing gained. *Rejected:* inlining the loop in `LessonPlayer` — the moment detector and
the tests need the same shape, and a shared function is where `lessonProgress` lives.

### D76 — The moment is the player's, fired by a transition each device sees in its own state

`LessonPlayer` keeps, in a ref, a snapshot of the previous render's trail — which slots
were `done` and which one was `current` — initialised to the current snapshot on mount and
reset when the lesson changes. On each render it compares: it starts a moment only when the
exercise **that was already on screen** went from open to done — a local
`celebrating: blockId | null` cleared by a 1500 ms timeout. Any other slot that went from
open to done lights quietly. The comparison is a pure function,
`momentBlock(previous, next): string | null` in `src/ui/moment.ts`, so it is unit-tested
without React.

The "already on screen" half of that rule was added after the acceptance run, which found
the case reasoning had missed: a teacher who finishes an exercise while the connection is
down sends the student, on reconnection, a single update that both moves the slide and
marks that exercise complete. Comparing done sets alone celebrated it — congratulating a
child for work their screen never saw happen. Requiring the current slot to be unchanged
also covers the teacher stepping back to something finished earlier, and states the rule
more simply than the two cases it replaces: the moment is for an exercise finished in
front of you.

*Why:* both devices hold the same state — that is what the room guarantees — so both
observe the same transition and play the same moment within a network hop of each other,
and a solo lesson runs the exact same code. Initialising the ref to the current set is
what makes a screen that joins mid-lesson stay quiet about exercises already done; it is
the same trick `MatchView.announced` uses for the pair line. Restricting the moment to
the exercise on screen is what keeps a catch-up snapshot after an outage from firing
three moments at once for exercises nobody is looking at.

*Rejected:* a `celebrated` field in state — constraint 1, and it would bump the version
on both devices for a purely visual event. *Rejected:* a room message — solo mode has no
room, so the moment would need two implementations. *Rejected:* firing it from the block
views — constraint 2, six views would each learn it, and the closing screen would still
need the trail from somewhere else. *Rejected:* firing for any slot, on-screen or not —
see the catch-up case above.

### D77 — The celebration is wordless

The moment is a chime, a flying star and a burst of confetti. It says nothing. Neither does
the closing screen: its message is on the page to be read, not read out.

*Why:* the teacher is the voice of a live lesson, and she is the person praising the child.
An app that says "Well done!" a beat after the child finishes is talking across her, in a
second voice, at exactly the moment she was about to speak. The sound and the picture do the
acknowledging without competing for the same channel — and they arrive faster than any voice
could, which is what "within the same second" needs.

This replaced a design that had praise waiting its turn behind the exercise's own line: a
single held follow-up in `speech.ts`, released at `finished()`, with the four phrases
recorded in the lesson's voice so the child never heard a second speaker. It was built and
tested and it worked — the recorded praise landed 1486 ms after "The rabbit says Squeak!",
measured, without cutting it off. It was removed because saying nothing is better than
saying it well: the whole apparatus existed to make the app's voice tolerable next to the
teacher's, and not having one is the simpler answer to that.

So nothing in `src/speech/` changes. No `speakAfter`, no held slot, no wrapping it in
`policy.ts`, no praise phrases in the recording script, no closing message added to
`speakableLines`. The speech module is left exactly as `fix-silent-speech` left it, which
is worth something on its own: it is the most delicate module in the repo, and the best
change to it is none.

*Rejected:* praise on the device's default voice — a second speaker appearing four times a
lesson, at the moments meant to feel personal. *Rejected:* praise as a recorded clip in the
lesson's own voice — what was actually built, and still one voice too many. *Rejected:* a
spoken closing message — the same objection, and the message is already on screen in large
type where a child can be asked to read it.

### D78 — The setting reaches the new noise by wrapping, exactly as it reaches the old voice

`src/sound/policy.ts` gains `quietSound(base, muted)`, the same shape as `quietable()` in
`src/speech/policy.ts`: while muted every effect is a no-op. The player pairs it with
`useEffect(() => { if (muted) sound.stop() }, [muted])`, the mirror of the
`speech.cancel()` it already runs there, which is what makes the spec's "turning the sound
off mid-effect stops it" true. It is applied at the player's edge and memoised on `muted`,
exactly as the speech wrapper is.

*Why:* constraint 4, and D67's reasoning applies unchanged — a rule copied into the
player's timers is a rule the next thing that makes noise will not have. Two capabilities,
one rule, applied the same way at the same edge, so "what does the switch cover?" keeps a
single answer.

Nothing is replayed when the setting comes back on. An effect marks something happening
now, and a chime for an exercise finished two exercises ago would be a lie about where the
lesson is.

*Rejected:* checking `muted` inside `LessonPlayer` before each call — two more places for
the rule to live, and the block views would still reach speech through a wrapper, so the
setting would have two implementations. *Rejected:* teaching `src/sound/sound.ts` the
setting directly — it would then need the room's state, which is the coupling `policy.ts`
exists to prevent. *Rejected:* a separate switch for effects — PLAN D-27.

### D79 — The chime and the notes are synthesised with the Web Audio API, unlocked lazily

New `src/sound/sound.ts` mirrors `speech.ts` in shape: `createSound(host)` returning
`{ chime(), notes(count, gapMs), stop(), enable(), isAvailable() }`, with the app instance
built on `globalThis`. `chime()` is three short sine notes (a rising triad, about 350 ms)
through a gain envelope; `notes(n, gap)` schedules `n` rising notes on the audio clock, one
per star; `stop()` releases the scheduled nodes.

The `AudioContext` is created **on first use, inside the call that needs it**, not from a
`pointerdown` listener at mount. If it is created `suspended` — no user activation yet — it
is resumed, and the effect is simply lost. `enable()` resumes it explicitly and is called
from the one place that already exists for this: the "Turn on sound" offer in `ListenView`,
which runs inside a real gesture handler.

*Why:* constraint 3, and the first draft's `prime()` no longer has an analogue to copy.
`speech.prime()` was removed by `fix-silent-speech` (D39) precisely because arming audio
ahead of time — queueing something in order to discard it — is what broke Chrome; the
lesson generalises. Creating the context at the moment of the first chime rides the same
sticky activation speech rides, needs no listener at mount, and costs one `resume()` call
in the case where activation has not happened. A synthesised tone needs no asset, no format
decision and no fetch, and it starts with no latency, which is what "within the same
second" means when a clip or a voice takes a few hundred milliseconds to open its mouth.
Web Audio is a separate pipeline from both `HTMLAudioElement` and `speechSynthesis`, so
the chime cannot cut a line in progress and a line need not wait for the chime — the two
directions the effects spec asks for. A fake host makes it testable the way
`speech.test.ts` already is.

*Rejected:* a `pointerdown` listener that primes at mount, as first drafted — it is the
rehearsal D39 forbids, dressed differently, and the effects spec now says so outright.
*Rejected:* a second "turn on sound" offer for effects — the learner would face two
buttons for one problem. *Rejected:* bundled audio files for the chime — an asset in
`public/` plus a fetch, or a data URI that Vite inlines only under a size limit, for the
same activation gate. *Rejected:* a spoken word instead of a tone — slower, and not ours
to say (D77).

### D80 — The closing screen says each thing once

Two pieces of duplication go, both on that screen only:

- **The header's trail stands down.** `LessonPlayer` renders it for every slide except the
  finish block. The same stars are already on the page, one per exercise and large enough
  to count.
- **The slide's title goes with it.** The player already treats `finish` specially (it
  hides the hint); it now hides the `h2` as well, so the closing message is the screen's
  heading. Animals reads "🎉 Great job!" as its title and "Great job learning animals!" as
  its message — the shorter one under the stars was saying the same thing twice.

*Why:* the closing screen has exactly one subject, which is how many stars were earned.
A second, smaller copy of them in the header is the same information competing with itself,
and a title that paraphrases the message underneath it is the same sentence twice. Neither
is a lesson-authoring problem to push onto the content: `title` is a useful field on every
other block, and lessons keep it.

*Rejected:* asking lesson authors to leave `title` empty on finish blocks — data bent
around a rendering decision, and every existing lesson would need editing. *Rejected:*
dropping `message` and keeping `title` — the message is the one written for the child, and
the title is a label for the slide. *Rejected:* keeping the trail everywhere for
consistency — consistency that repeats itself is not a virtue on the one page whose whole
job is to show those stars.

### D81 — The flourish is CSS on elements the player owns; nothing is random

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

Reduced motion needs one addition, not none. The global rule in `styles.css` collapses
`animation-duration` and `transition-duration` but leaves `animation-delay` alone, so the
closing row's `index × 250 ms` stagger would survive it and the stars would still trickle
in over two seconds. The player's own reduced-motion block therefore zeroes
`animation-delay` on the closing stars as well. The chime and the notes still happen —
reduced motion is about movement.

*Why:* the flight is the link between "you did this exercise" and "that star up there is
yours" — it is what makes the two ideas one. Measuring once at the start is a dozen lines;
a layout pass per frame is not needed. Deterministic particles cost nothing and keep the
repo's "no randomness at render" habit intact even where it would be harmless.

*Rejected:* `canvas-confetti` — a dependency and a canvas for one second of decoration.
*Rejected:* random particles at render — harmless here, but the code base's one rule
about randomness would then have an exception nobody can explain. *Rejected:* relying on
the global reduced-motion rule alone, as first drafted — it does not cover delay, and the
claim that "`prefers-reduced-motion` needs nothing" was simply wrong. *Rejected:* no
flight, only a bounce — loses the connection the trail exists to make.

### D82 — The closing celebration belongs to the player; the finish block keeps its message

When the slide on screen is the finish block, `LessonPlayer` renders the closing row
above the block view: one star per slot, gold where `done`, unfilled otherwise, each with
`animation-delay: index × 250 ms`. On mount it calls `effects.notes(goldCount, 250)` and
then, after the last star, a larger confetti burst — through the wrapped instance, so a
quiet lesson gets the stars and the burst in silence. All timers are cleared when the slide
is left. `FinishView` loses its five literal stars and keeps the message, which the player
now shows as the screen's heading (D80).

*Why:* the closing screen needs the trail, and the trail is the player's. Passing it into
every block view widens a contract six views do not want for the sake of one, and the
player already treats `finish` specially (it hides the hint). The finish block stays "a
slide, not an exercise" with exactly one job — its message — and a lesson author still
writes nothing new.

*Rejected:* `trail` on `BlockViewProps` — constraint 2. *Rejected:* a star count in the
finish block of the lesson file — data must not carry derived state, and a lesson author
would have to keep it in step with the block list. *Rejected:* keeping the five stars — the
proposal's whole point.

### D83 — The way forward pulses from state, not from a timer

`nextDue = isBlockComplete(current) && slide < blocks.length − 1`. When true and the
screen steers (`canSteer`), the footer's next arrow and the panel's "Next →" carry a
pulse class. There is no flag set by the moment and nothing to clear.

*Why:* derived means it cannot be wrong: it pulses after a moment, and it also pulses
when the teacher returns to an exercise completed earlier or joins a room mid-lesson
where the exercise on screen is already done — cases a flag set by the moment would
miss. It also stops of its own accord on the closing screen, where `slide` is the last
one, which is the spec's "nowhere left to go". On the student's screen there is no
control to pulse (design D22), so the spec's "nothing on the student's screen" is already
true.

*Rejected:* a `pulseUntilNav` flag started by the moment — a second source of truth that
is silent exactly when the moment did not play.

### D84 — The header is a three-track grid, so its group is centred on the page

`.header` becomes `grid-template-columns: 2.5rem minmax(0, 1fr) 2.5rem`. The way out takes
the first track; a new `.headerCenter` element holds the lesson's name, the trail, the
sound control and `headerAction`, centred within the second; the third stays empty and is
the width of the first.

That empty track is the whole point. Centring the group in "whatever is left after the back
arrow" puts it 26 px right of the page's centre — invisible in a mockup, and plainly wrong
next to a centred exercise, which is what sits underneath it.

The trail can no longer be `flex: 1`: an item that grows absorbs the spare width, and a
group with no spare width around it cannot be centred. It becomes `flex: 0 1 <basis>` with
the basis spelled out from a `--slots` custom property the player sets from `trail.length`.
Left to `flex-basis: auto`, a browser measures the row's own contents and settles on the
width of the **star glyph** rather than the width of a mark — eight marks huddle into
150 px instead of 305. Measured, not guessed. The marks still shrink, which is what lets a
long lesson share a narrow line, and at that breakpoint the glyph is scaled by the same
count (`min(1rem, calc(180px / var(--slots)))`) so fourteen of them stay inside their boxes.

*Why a wrapper element at all:* the four centred things arrive from three places — two are
the player's own, one is conditional on `canSteer`, and `headerAction` is a prop. Auto
margins or `justify-content` on the header cannot group them; a container can, and it is
also the thing that wraps as a unit when the window is too narrow for one line.

*Rejected:* `justify-content: center` on the header — centres the back arrow too, so it
leaves the leading edge. *Rejected:* absolutely positioning the back arrow — it overlaps
the group at the width where the trail takes its own line. *Rejected:* an empty balancing
`<span>` on the right — the same effect as the third grid track, but as DOM that means
nothing. *Rejected:* a fixed basis such as `flex: 0 1 20rem` for the trail — a five-mark
lesson would then carry 130 px of slack and push the title left of centre.

## Risks / Trade-offs

- **Both devices chime, and the teacher is on a call.** → This is already how the pair
  line, the listening target and the sentence reach both screens today, from state. The
  chime follows the same path rather than inventing a second one, and the teacher has a
  switch for all of it (D-27) — which is what closed this as an open question rather than
  leaving it as one. A short tone doubling through Zoom is also a good deal less intrusive
  than a doubled voice, which is part of why the celebration has none (D77).
- **An `AudioContext` on a screen that has had no gesture** — the normal state of a
  student's tab. → The context is created suspended, `resume()` is attempted, and the
  chime for that one moment is lost; the visible moment is intact and the "Turn on sound"
  offer fixes both voices at once (D79).
- **Many exercises in a narrow window, now sharing the header with the sound control.** →
  Slots are `flex: 1; min-width: 0` with the star glyph on a `clamp`. The budget is
  tighter than the first draft assumed: back arrow, title, trail, sound control and — in a
  solo lesson — the invite button. The spec gained a fourteen-exercise scenario so the
  check is written down; Animals has eight.
- **A catch-up snapshot completes several exercises at once.** → Only the slot that was
  already on screen can start a moment (D76); the rest light quietly, including one the
  same update navigates to.
- **React StrictMode runs effects twice in development.** → The transition is read from a
  ref updated in an effect, so the second pass sees no difference; a unit test drives the
  detector with the same trail twice and expects `null`.

## Migration Plan

Nothing to migrate: no state shape, no protocol message, no lesson field, no new recording
and no deployed resource changes. A room opened before the change plays the moment the
instant a device with the new code observes a completion. Rollback is a revert: the header
shows the percentage bar again and the closing screen its five stars.

## Open Questions

- Whether the chime is the right sound — a rising triad was chosen because it is short,
  major and over before it can become a nuisance, but only a real lesson will say whether a
  child hears it as a reward or a notification. Changing it is three numbers in
  `src/sound/sound.ts` and nothing in the specs, the approach or the tasks depends on the
  answer.
