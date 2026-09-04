# Verification — add-star-trail

Run on 2026-09-04. Two tiers, kept apart on purpose: what a test asserts on every run, and
what a person looked at once. Nothing below is presented as coverage it does not have.

## Automated

`npm run typecheck`, `npm test` and `npm run build` all pass. **469 tests in 34 files**, up
from the 383 in 29 files that passed before this change.

Revised after review on the same day: the spoken praise and the spoken closing message were
removed, and the closing screen was reduced to showing each thing once. What that took out
is recorded at the end.

New or changed test files:

| File | What it holds |
|---|---|
| `src/shared/reducer.test.ts` | the trail: one slot per exercise, none for the closing slide, lesson order, `current` following `nav`, a reset returning a mark to open and a second completion earning it again, and agreement with `lessonProgress` |
| `src/shared/determinism.test.ts` | two devices replaying the same actions produce equal trails, compared field by field |
| `src/sound/sound.test.ts` | the chime is three rising notes on the audio clock; `notes(5, 250)` schedules five, spaced and rising; the context is built on first use and never at construction; a suspended context is resumed; `stop()` releases; no `AudioContext`, a throwing constructor and the webkit-prefixed one all handled |
| `src/sound/policy.test.ts` | effects dropped while muted, passed through while not; `stop` and `enable` deliberately not suppressed; a new object per setting |
| `src/ui/moment.test.ts` | the detector, including joining mid-lesson, an off-screen completion, a reset, and **arriving at an exercise that is already finished** |
| `src/ui/voice.test.ts` | one "Turn on sound" offer reaching both speech and effects, everything else delegated by reference |
| `src/ui/student-view.test.tsx` | the trail's markup and label, no percentage anywhere, identical trail on both screens, no control among the marks; the pulse present for the teacher and the solo learner, absent for the student and on the closing screen; the closing row's gold and unfilled counts; the closing screen's stood-down header and dropped title |
| `src/ui/lesson-effects.test.tsx` | the player's **effects**, which `renderToStaticMarkup` never runs: turning the setting off stops the effects and cancels speech, and does not fire on an unrelated re-render; the closing screen asks for one note per gold star, asks for none while quiet, stops on leaving, and **says nothing however long it is left running**; a completion chimes once and speaks nothing. Rendered with React's own `act` into jsdom — both already in the project, so no test dependency was added |

**Nothing under `src/speech/` changed at all.** `git diff --stat src/speech/speech.ts
src/speech/policy.ts src/shared/blocks/speakable.ts scripts/audio.ts` is empty, and
`grep -rn "speakAfter\|APP_LINES\|praiseFor" src scripts` finds nothing. That is worth
stating plainly: speech is the most delicate module in the repo, and the final shape of
this change does not touch it.

## Performed by hand

In Chrome against `npm run dev`, and for the room against `npx wrangler dev` with two
tabs and a real Durable Object. These were watched, not asserted; they will not catch a
regression tomorrow.

| Check | Result |
|---|---|
| The header's group is centred | Measured, not eyeballed: the group's centre is **exactly** on the header's centre — 0 px off — at 380 px and at 1440 px, for lessons of five, eight and a cloned fourteen marks, and on the closing screen where there are no marks at all. The way out stays at 12 px from the leading edge in every case. |
| Narrow window, 380 px | Trail takes a line of its own inside the group: 5 marks at 36 px, 8 at 27.7 px, a fourteen-mark stress case at 14.1 px with the glyph scaled to 12.9 px so none overlaps its neighbour. No horizontal scroll, no control pushed off screen, in any of them. |
| Wide window | Two passes were needed. The first spread eight marks across half the header and stretched the current mark into a bar, so the trail and slot widths were capped. The second, after centring, collapsed the marks into a 150 px huddle — a browser sizing `flex-basis: auto` by the star glyph rather than by the mark — which is why the row's width now comes from a `--slots` count the player passes in. |
| A full solo playthrough of Animals | All 8 exercises completed — both card blocks, both matching blocks, the sentence, the listening, the sorting and the physical-response block. Every one celebrated, and the next control pulsed after each. Trail reached "8 of 8 done". |
| The celebration is silent | On a completed cards block: one chime, and the only lines played were the nine card words the taps themselves called for — no praise phrase, nothing after the block's own line. The card's own recorded word still plays on a tap, so the exercise's voice is untouched. |
| The chime | `AudioContext` created on first use and reported `running`; three oscillators scheduled at 0, 90 and 180 ms. |
| The moment does not block the exercise | Mid-moment, the flourish computes `pointer-events: none`, carries `aria-hidden="true"`, `elementFromPoint` at the stage centre returns the card and not the celebration, and no card is disabled. |
| The closing screen | With 5 of 8 earned: 5 gold and 3 unfilled, centred, `notes` counting the gold ones only, the header's marks gone, and "Great job learning animals!" shown once with no title above repeating it. With 8 of 8: 8 gold and the next arrow correctly not pulsing. |
| Leaving the closing screen early | Left mid-sequence: the burst cleared and the row went with the slide, with the notes stopped. |
| A quiet lesson | Sound off: flourish, flying star, 20 confetti, mark bounce and trail update all played, and nothing reached the sound or speech modules at all — the wrapper suppressed it at the edge. Closing screen the same. No "Turn on sound" offer appeared on account of the silence. Turning sound back on replayed nothing for what was missed. |
| Two screens, one room | The **student** completed an exercise. With the teacher touching nothing, her screen played the same moment — flourish and mark landing — and both her footer arrow and her panel's "Next →" began pulsing and stayed pulsing. The student's screen showed the earned mark, no next control and no pulse. |
| Joining a lesson already under way | Student's tab reloaded onto a room with a star earned: the mark was there from the first sample and nothing ever celebrated it. |
| Reset and complete again | Teacher reset from her panel: both screens returned the mark to open and the pulse stopped. The student completed it again and the full moment played. |
| A screen that has had no gesture | The student's tab reported `userActivation.hasBeenActive === false` and showed the "Turn on sound" offer. One click on it **resumed the suspended `AudioContext`** and retried speech, and the offer disappeared. One offer, both outputs — no second button was added. |
| A tab driven only by script | Speech latches to `silent` when no real gesture has happened, so nothing speaks there at all. Worth knowing before reading a silent tab as proof of anything: the silence checks above were repeated on a tab given a genuine click first, where the card words really do play. |
| Console | No errors or warnings on either tab. |

## What was **not** verified, and why

- **Reduced motion was checked as CSS, not as behaviour.** The rule zeroing
  `animation-delay` on the closing stars, the confetti and the flying star was confirmed
  present in the built stylesheet and confirmed to match 8 rendered elements, alongside the
  global rule zeroing durations. It was **not** observed under an operating system with
  the setting actually on — this environment has no way to turn it on.
- **The muted-tab pass was not run.** Task 9.9 asked for a playthrough with the browser
  tab muted. The quiet-lesson pass covers the same ground from the app's side; a muted tab
  is the platform's side and was not exercised.
- **The catch-up-after-an-outage path was not observed live.** The Worker was stopped, and
  the teacher's own screen was confirmed to stay fully playable and to celebrate her own
  completion while unsynced. But on restarting `wrangler dev` the room was gone and the
  student's socket never reconnected, so the reconnection snapshot never arrived. The
  behaviour it would have exercised is covered by unit tests instead — see below, because
  that failure is what found the one real defect in this change.

## The defect the acceptance run found

Reasoning about the catch-up case in the abstract turned up something the original design
missed. A teacher who finishes an exercise while the connection is down sends the student,
on reconnection, a **single** update that both moves the slide and marks that exercise
complete. The detector compared done sets only, so the student's screen would have
celebrated an exercise it never saw being worked on — congratulating a child for someone
else's work.

`momentBlock` now also requires the exercise to have been the one already on screen. That
is a simpler rule than the two cases it replaces — *the moment is for an exercise finished
in front of you* — and it also stops a celebration when a teacher steps back to something
finished earlier. Both are pinned by tests, the design records it under D76, and the
lesson-player spec gained the scenario "Arriving at an exercise that is already finished".

A second, smaller thing was measured rather than assumed: `praiseFor` originally took the
seeded hash modulo four. `seedFor` ends in FNV-1a, whose bottom two bits are barely mixed,
and appending the `'praise'` salt leaves them exactly as they were — so the salt would have
done nothing and the praise would have come from the block's own card-shuffling number. The
draw now goes through `mulberry32`, as every other choice in the app does, and a test
demonstrates the trap it avoids.

## What the revision removed

Spoken praise and the spoken closing message were built, tested and measured working, and
then taken out on review. Removed with them:

- `speakAfter` and its held slot in `src/speech/speech.ts`, its wrapper in
  `src/speech/policy.ts`, and their tests — so `src/speech/` is byte-identical to `main`.
- `APP_LINES` and `praiseFor`, the closing message's entry in `speakableLines`, and the
  app's own lines in `scripts/audio.ts`.
- The nine clips `npm run audio` had recorded for them, deleted after the manifest was
  rebuilt without them (`src/speech/clips.ts` back to reporting them as matching no line).
- The `speech` delta spec, which had existed only for the follow-up.

Kept, because they were the point: the chime, the closing screen's notes, every visual, and
the fact that both screens do the same thing from the same state.

**One side effect to be aware of:** running `npm run audio` also recorded the lines of
`lessons/colours.json`, `food.json` and `numbers.json`, three uncommitted lessons that had
no clips before. `src/speech/clips.ts` is therefore +140 entries against `main` for reasons
that have nothing to do with this change. Those recordings are presumably wanted, but they
do not belong in this change's commit.
