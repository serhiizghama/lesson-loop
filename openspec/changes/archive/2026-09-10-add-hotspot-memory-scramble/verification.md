# Verification — add-hotspot-memory-scramble

Run on 2026-09-10, against `npm run dev` (Vite) with `npx wrangler dev` for the room.

## Automated

| Gate | Result |
|---|---|
| `npm run typecheck` (`tsc --noEmit` + the Worker's) | passes |
| `npm test` | **851 passed**, 54 files, 0 failed |
| `npm run build` | passes — 368.9 kB JS, 24.3 kB CSS |
| `npm run audio` | *"Every line already has a clip. Nothing to do."* — no new recording needed, and `git status` on `public/audio` and `src/speech/clips.ts` is clean |

84 of those tests are new (plus the counts updated in two existing files): the three logic modules and their answer keys, the three views,
the new validation rejections, the scene, and the stage-width guards.

`git diff --stat` shows no change to `src/shared/reducer.ts`, `room.ts`, `protocol.ts`,
`ink.ts`, `worker/`, `src/ui/LessonPlayer.tsx`, `src/ui/TeacherPanel.tsx`, `src/speech/`
or `package.json` (design D124).

## By hand, in a browser

Everything below was observed, not inferred.

**Solo, Body Parts**

- The home screen lists **My Body · 7 activities** and **Animals 2 · 9 activities** — the
  counts the plan predicted for the two lessons that gained a block.
- *Label the Body* draws the two-panel scene once, offers nine words, and shows nine
  places. Every tap target measures **at least 103 × 103 px in the stage's coordinates**.
- A word placed on the wrong part is refused: the word stays in the bank, the place shakes,
  nothing is recorded. A word placed on its own part sticks and leaves the bank.
- Placing the last word completes the exercise and earns its star.
- *Build It* refuses a word out of order and keeps the words already placed; the finished
  sentence is shown whole; the way forward appears only once the sentence is finished.
- Every sentence renders grammatically, plurals included: **"These are my eyes."**,
  **"These are my ears."**, "This is my hair."
- With the teacher's **sound off**, the whole diagram can still be played to completion and
  the star is still earned.

**Solo, Animals 2**

- *Memory* lays out twelve cards face down, six to a row, "0 of 6 found · 0 tries", and no
  card gives away what it shows.
- Two cards that do not match stay face up; the **next tap turns them back down and turns
  the tapped card up**, and that tap costs no try — "1 try" stayed "1 try".
- One try reads "1 try" and more read "tries".
- Finding all six pairs completes the exercise and earns its star.
- The teacher's reset gives a genuinely different board.

**In a room (teacher `/t/…` + student `/r/…`, two browser tabs)**

- The teacher's panel says *student here*; both screens hold the same lesson.
- **The two screens agree on every shuffle**: the same nine-word bank in the same order,
  the same four chips in the same order, the same twelve-card board — read off both.
- A placement made on the **student's** screen appears on the teacher's, and the teacher's
  bank shrinks to match. The same for a sentence built by the student, and for two cards
  turned up by the student.
- **The teacher's answer keys** render with no per-type branch:
  - *Where each word goes* — nine rows, each a word against a position said in words, and
    all nine distinct: `eyes upper · centre`, `ears middle · left`, `nose lower · centre`,
    `mouth bottom · centre`, `hair top · centre`, `arm upper · right`, `hand middle · right`,
    `leg lower · right`, `foot bottom · right`.
  - *Sentences* — every sentence in full: "This is my nose.", "These are my eyes.", …
  - *Pairs* — every pair against where its two cards are lying: `bird · 1 & 11`,
    `monkey · 2 & 5`, `fish · 4 & 6`, …
- **Reloading the student's tab mid-way** brings back exactly what was there: the placed
  word, the same bank order, the same chips.
- **The teacher's reset** returns both screens to the opening state with a new shuffle.
- Drawing across the diagram made marks and **answered nothing**: no word was placed, no
  word left the bank.

## Found by the runtime run, and fixed

Tapping *Next word →* on the **last** sentence of a `scramble` block left the exercise
blank — the block was already complete, and advancing past the last item had nothing to
render. The control is no longer offered on the last sentence (the lesson's own control
moves on), and a state past the last item now says "All done! 🎉" rather than showing
nothing. Two tests cover it.

## Not verified, and why

- **The 44 px tap target at a 380-pixel viewport.** The targets were measured at 103 px in
  the stage's coordinates, and the stage scales by `available / 880` (unit-tested), which
  puts them at about 44 px on a 380-pixel screen. That last step is arithmetic: the browser
  window in this environment would not resize below its current size, so the size under a
  finger was **not observed**. Worth one look on a real phone or tablet.
- **A mark relayed between the two screens** while drawing over one of the new exercises.
  Drawing was confirmed not to answer anything, but the stroke itself was not seen to
  arrive on the other screen — the drag did not land on the ink layer of the intended tab.
  The ink path is untouched by this change.
- **Sound off for `memory` and `scramble`** at runtime. Only the diagram was replayed with
  the sound off. What each of the three speaks, and that it speaks only by volunteering, is
  covered by their view tests.
- **The memory board reset and reload inside a room.** Both were verified for the diagram
  and the sentence builder in a room, and for the board on its own screen.
