## 1. Shape artwork, before anything needs it

- [x] 1.1 Add a `SHAPES` table to `scripts/pictures.ts` beside `COLOURS` (D120): eight
      entries — circle, square, triangle, rectangle, star, heart, oval, diamond — each a
      single filled path on the existing 512 viewBox, in its declared colour.
      *Check:* `npm run pictures` writes `public/pics/shapes-1/` and `public/pics/shapes-2/`
      once the lesson files exist; until then, run it and confirm it still reports the ten
      colour swatches and draws nothing new.
- [x] 1.2 Open each of the eight SVGs in a browser at 64px and at 512px and confirm the
      shape is the shape it is named — in particular that the oval is an ellipse and not a
      circle, and that the rectangle is not square.
      *Check:* visual, eight files, written down in the PR description.

## 2. Move the animals pictures before the lesson is renamed

- [x] 2.1 `git mv` `public/pics/animals/{dog,cat,rabbit,duck,fish}.jpg` to
      `public/pics/animals-1/`, and `{bird,elephant,lion,monkey,bear}.jpg` to
      `public/pics/animals-2/`. Copy all ten into `animals-2/` as well, since
      `animals-2.json` carries the full vocabulary (D113).
      *Check:* `ls public/pics/animals-1 public/pics/animals-2` shows 5 and 10 files, and
      `public/pics/animals` no longer exists.
- [x] 2.2 Rename the originals in `.pics-src/` from `animals-<item>.jpg` to
      `animals-1-<item>.jpg` / `animals-2-<item>.jpg` to match the new lesson ids (D121).
      *Check:* `ls .pics-src | grep '^animals'` shows no bare `animals-` prefix left.

## 3. The three block types — types, validation, logic

- [x] 3.1 Add the three block shapes and their state shapes to `src/shared/types.ts`:
      `phrases` (`lines: string[]`, state `{ played: string[] }`), `quiz` (`ask: Face`,
      `show: Face`, `count?: number`, `speak?: string`, state
      `{ order, index, answered, wrong }`), `describe` (`questions: [Question, Question]`,
      `speak?: string`, state `{ order, index, given: { a, b }, wrong }`) — D115.
      *Check:* `npm run typecheck` fails on the two registries with a missing-member error,
      which is the mapped type doing its job (D114).
- [x] 3.2 Add schemas and cross-checks to `src/shared/validate.ts`: a phrase list with no
      lines or an empty line; a quiz whose `ask` face a selected item does not carry; a quiz
      with `ask` equal to `show`; a description with other than two questions; a description
      question whose face resolves to one value across the selection.
      *Check:* new cases in `src/shared/validate.test.ts`, each asserting the named error
      text, pass under `npm test`.
- [x] 3.3 Write `src/shared/blocks/phrases.ts` — `init`, `reduce` on `tap` by index,
      `isComplete` when every line is played, `answerKey` listing every phrase marked
      done/open, `scored: true`.
      *Check:* `src/shared/blocks/phrases.test.ts` covers init, replaying a played line
      leaving state identical by reference, completion, and the key.
- [x] 3.4 Write `src/shared/blocks/quiz.ts` — seeded order, seeded choices containing the
      target exactly once and clamped to the selection size (D117), `reduce` on `tap`
      accepting the target and recording `wrong` otherwise, `answerKey` showing the prompt
      against its answer with the current row marked.
      *Check:* `quiz.test.ts` covers a correct answer advancing, a wrong answer returning
      the same state object by reference for nothing but `wrong`, choices never repeating
      the target, a four-item lesson offering four choices, and completion.
- [x] 3.5 Write `src/shared/blocks/describe.ts` — two questions addressed as `pick` sides
      a and b (D115), choices as the distinct values in seeded order (D118), an item
      finished only when both are given, `answerKey` showing both answers with their marks.
      *Check:* `describe.test.ts` covers one answer not advancing, both answers advancing,
      a wrong answer on one side not losing the other, and completion.
- [x] 3.6 Register all three in `src/shared/blocks/index.ts` and add their spoken lines to
      `speakable.ts`.
      *Check:* `npm run typecheck` passes, and `blocks.test.ts` / `answer-key.test.ts` —
      which iterate the registry — now cover nine types with no per-type branch added.

## 4. The three views

- [x] 4.1 `src/blocks/PhrasesView.tsx` — every phrase in writing with its own speak control;
      heard phrases marked; the control speaks whether or not the lesson's sound is on.
      *Check:* a rendering test asserts the written phrases are present with sound off, and
      `speakable.test.ts` asserts the control speaks with sound off while nothing speaks on
      arrival.
- [x] 4.2 `src/blocks/QuizView.tsx` — the prompt rendered by its declared face, the choices
      by theirs, wrong choices shaken and nothing lost.
      *Check:* a rendering test with `ask: "tag:thing"` and with `ask: "emoji"` asserts the
      prompt is readable in both, and that every choice is tappable with sound off.
- [x] 4.3 `src/blocks/DescribeView.tsx` — one item, two rows of choices, and the combined
      sentence shown when both are answered.
      *Check:* a rendering test asserts the sentence appears only after the second answer,
      and appears with sound off without being spoken.
- [x] 4.4 Register the three views in `src/blocks/index.ts` and add their styles to
      `blocks.module.css`, append-only so the two open changes merge cleanly.
      *Check:* `npm run typecheck` and `npm test` pass; the diff of `blocks.module.css`
      contains no modified line.

## 5. The lessons

- [x] 5.1 Write `lessons/animals-1.json` — dog, cat, rabbit, duck, fish; the vocabulary,
      sounds, matching, sentence, listening and movement blocks from `animals.json`,
      restricted to these five. No sorting block (D113).
      *Check:* it appears on the home screen, plays end to end in one browser, and
      `lessonFailures` is empty.
- [x] 5.2 Write `lessons/animals-2.json` — all ten animals as items; the teaching blocks
      select bird, elephant, lion, monkey and bear by id; the sorting and listening blocks
      select all ten as revision (D113).
      *Check:* it plays end to end, and the sorting exercise offers all three habitat
      buckets with animals in each.
- [x] 5.3 Delete `lessons/animals.json`.
      *Check:* `npm run build` succeeds and the home screen shows two animals lessons and
      no third.
- [x] 5.4 Write `lessons/shapes-1.json` — circle, square, triangle, rectangle, each with a
      Japanese gloss, a `colour` tag and a `thing` tag for the riddles; blocks: `cards`,
      `phrases` (her four Lesson 1 model sentences), `quiz` asking by `tag:thing`, `quiz`
      asking by `emoji`, `describe` on shape and colour, `finish`.
      *Check:* it plays end to end, every picture is the SVG and not the emoji fallback, and
      the teacher's panel shows a key for each of the three new exercises.
- [x] 5.5 Write `lessons/shapes-2.json` — all eight shapes as items; teaching blocks select
      star, heart, oval and diamond; `match` (picture against word) and `describe` select
      all eight as revision; `phrases` carries her Lesson 2 sentences.
      *Check:* it plays end to end, the description exercise offers four colours and eight
      shapes, and `lessonFailures` is empty.
- [x] 5.6 Run `npm run pictures` and confirm it draws nothing and only rewrites the manifest
      and the SVGs (D121).
      *Check:* its output reports `0 pictures` drawn for every lesson, and
      `git diff --stat src/blocks/pictures.ts` shows only the expected key changes.

## 6. Guardrails and documentation

- [x] 6.1 Add the five-word test (D122): for every lesson file, the items its teaching
      blocks select, minus those taught by an earlier lesson of the same topic, is at most
      five.
      *Check:* the test passes on the four new lessons and fails when a sixth item is added
      to `shapes-1.json`'s card block — verified by making that edit, seeing red, and
      reverting it.
- [x] 6.2 Update `README.md`'s block table with the three new rows, and `docs/PLAN.md`: §5
      moves `quiz` out of the backlog and records that it lost its timer, §9 records what
      this delivers of v0.2, §12 gains D112–D122 as product decisions where they are product
      decisions.
      *Check:* no section of PLAN.md still describes the engine as having six block types.
- [x] 6.3 Run the full suite.
      *Check:* `npm run typecheck`, `npm test` and `npm run build` all pass, and
      `tests/snapshot-size.test.ts` is unchanged — nothing here belongs in the room snapshot.
- [x] 6.4 Play both Shapes lessons in a room with two browsers, one as teacher and one as
      student, and confirm the three new exercises stay in step and the answer keys are
      right.
      *Check:* manual, both lessons, written down in the PR description.
