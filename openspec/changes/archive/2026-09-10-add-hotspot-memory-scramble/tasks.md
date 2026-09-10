## 1. The drawing the app carries

- [x] 1.1 Create `src/shared/scenes.ts`: `SCENE_IDS = ['body'] as const`, `SceneId`, and a
  `SCENES` record giving each scene its drawing size (`{ width: 220, height: 420 }` for
  `body`, the coordinate space of the reference page). Data only — no React, no DOM
  (design D125). **Check:** `npx tsc --noEmit` passes and `src/shared/purity.test.ts` still
  passes, so the Worker can import it.
- [x] 1.2 Create `src/scenes/BodyScene.tsx` — the two-panel diagram D128 calls for, in the
  friendly style of `docs/reference/body_parts_lesson.html`: a large head on the left
  carrying `hair`, `eyes`, `ears`, `nose` and `mouth`, and a small whole figure on the right
  carrying `arm`, `hand`, `leg` and `foot`. Inline SVG with `viewBox="0 0 700 480"`,
  `preserveAspectRatio="xMidYMid meet"`, `width="100%"`, `aria-hidden`, and no interactive
  element inside it. **Check:** rendered on its own in a test it produces one `<svg>` with
  that `viewBox` and contains no `<button>`; a named test computes the pairwise distance
  between the Body Parts block's declared centres in the scene's own space and asserts the
  smallest is at least 110; and `git diff package.json` is empty — no drawing library
  entered the project.
- [x] 1.3 Create `src/scenes/index.ts` with `scenes: { [S in SceneId]: SceneComponent }`,
  the same exhaustive mapped-type shape the two block registries use. **Check:** removing
  an entry is a compile error (verified once by hand and recorded), and
  `npx tsc --noEmit` passes. **Verified:** removing `body: BodyScene` gives
  `TS2741: Property 'body' is missing in type '{}'`.

## 2. `hotspot` — labelling the drawing

- [x] 2.1 Add the block and its state to `src/shared/types.ts`: `{ type: 'hotspot';
  items: ItemRef; scene: SceneId; spots: Record<string, [number, number, number, number]>;
  speak?: string }` and `HotspotState = { order: string[]; selected: string | null;
  placed: string[]; wrong: { item: string; spot: string } | null }` in `BlockStateMap`
  (design D127). **Check:** `npx tsc --noEmit` now fails only in the two registries and
  `speakableLines`, naming the missing `hotspot` member — the exhaustiveness the design
  relies on.
- [x] 2.2 Create `src/shared/blocks/hotspot.ts`: `scored: true`; `init` shuffles the
  selected item ids into `order`; `reduce` handles `pick` — side `a` selects or re-selects
  a word (refusing a word already placed), side `b` places the held word when the spot's
  item id matches and otherwise sets `wrong`, and a side `b` pick with nothing selected
  returns the state **by reference**; `isComplete` is every selected item placed. Register
  it in `src/shared/blocks/index.ts`. **Check:** `npx tsc --noEmit` passes and
  `src/shared/purity.test.ts` passes.
- [x] 2.3 Add `hotspotSpeech(block, item)` beside the logic — the block's `speak` template
  rendered for the item, or `null` where the block declares none — mirroring
  `matchPairSpeech`. **Check:** a named test returns `null` for a block without `speak`
  and the filled line for one with it.
- [x] 2.4 Give it an answer key in the shape `AnswerKeyRow` already defines (`id`, `label`,
  `value`, `mark`): title `Where each word goes`, one row per selected item, `label` the
  English word, `value` the position in words derived from the spot's centre — vertical
  fifth (`top`/`upper`/`middle`/`lower`/`bottom`) and horizontal third
  (`left`/`centre`/`right`), joined as `top · centre` — and `mark` `done` when placed, `current` while held, else `open`
  (design D133). **Check:** a named test in `src/shared/blocks/hotspot.test.ts` asserts a
  spot of `[0.45, 0.14, 0.09, 0.05]` reads `top · centre`, one centred at `[0.8, 0.9]` reads
  `bottom · right`, and the nine spots of the Body Parts block read nine distinct positions.
- [x] 2.5 Validate it in `src/shared/validate.ts`: a Zod branch (scene from
  `SCENE_IDS`, `spots` a record of four-number tuples, optional `speak`) plus cross-checks
  — every selected item has a spot, every rectangle lies inside the unit square with a
  positive width and height, no two selected items share a centre, and `speak`'s tags are
  carried by every selected item. **Check:** `src/shared/validate.test.ts` gains five named
  rejections — unknown scene, missing spot, rectangle outside the drawing, zero-sized
  rectangle, two items on one spot — each asserting the message names the block and the
  offending item.
- [x] 2.6 Test the logic in `src/shared/blocks/hotspot.test.ts`: a correct placement sticks
  and clears `wrong`; a wrong placement sets `wrong` and places nothing; tapping a second
  word moves the selection; a spot tapped with nothing selected returns the same object
  (`toBe`); a word already placed cannot be re-selected; placing the last word completes
  the block. **Check:** each is a named test and `npm test` passes.
- [x] 2.7 Create `src/blocks/HotspotView.tsx`: the scene from the registry with the spots
  positioned over it in percentages, each an inflated tap target of at least 110 px in the
  stage's coordinates around the declared rectangle's centre with the declared rectangle as
  its visible outline, the containing rectangle winning an overlap and the nearest centre
  otherwise, and a tap inside no target dispatching nothing (design D128); the word bank
  beside it; a tapped word speaks its English word, a correct placement speaks
  `hotspotSpeech` where the block declares one; the wrong spot and the wrong word carry the
  shake class the other blocks use. Lay out from the stage's 880 px — no viewport units, no
  media queries (design D103). Register it in `src/blocks/index.ts` and add the styles to
  `blocks.module.css`. **Check:** `npx tsc --noEmit` and `npm run build` pass, and
  `grep -nE '\bv[wh]\b|@media' src/blocks/blocks.module.css` shows nothing new.
- [x] 2.8 Test the view in `src/blocks/hotspot-view.test.tsx` with the existing fake
  speech: tapping a word then its spot dispatches two `pick` actions with sides `a` and
  `b`; the placed word leaves the bank and appears on the drawing; a tap on the drawing
  outside every target dispatches nothing; the block's declared line is spoken on a correct
  placement and the plain word on selection; with the fake speech quiet, nothing is spoken
  and the placement still dispatches. **Check:** each is a named test and `npm test` passes.

## 3. `memory` — pairs face down

- [x] 3.1 Add the block and its state to `src/shared/types.ts`: `{ type: 'memory'; items:
  ItemRef; left: Face; right: Face; count?: number; speak?: string }` and `MemoryState =
  { order: string[]; up: string[]; matched: string[]; tries: number }`, where a card id is
  `<itemId>#a` / `<itemId>#b` (design D129). **Check:** `npx tsc --noEmit` fails only where
  the new member is unhandled.
- [x] 3.2 Create `src/shared/blocks/memory.ts` with `cardItem(cardId)` and `cardFace(cardId)`
  helpers: `init` picks `count` items with the seed as `match` does, builds two cards per
  item and shuffles the board; `reduce` handles `tap` — a card already up or matched
  returns the state by reference; with two mismatched cards up the tapped card replaces
  them (they turn down) and `tries` is unchanged by that clearing; a second card closes the
  pair into `matched` when it belongs to the same item, and otherwise leaves both up;
  `tries` increments once per completed attempt (a second card turned up); `isComplete` is
  every pair matched. Register it. **Check:** `npx tsc --noEmit` and the purity test pass.
- [x] 3.3 Give it an answer key: title `Pairs`, one row per item, `label` the left face,
  `value` the right face followed by the 1-based board positions of its two cards —
  `dog · 3 & 8` — `mark` `done` once matched, `current` while one of its cards is up
  (design D133). **Check:** a named test asserts the positions match the card's index in
  `order` plus one, and that finding a pair marks exactly that row done.
- [x] 3.4 Validate it in `src/shared/validate.ts`: the Zod branch, and the same cross-checks
  `match` has — both faces renderable by every selected item, `count` no greater than the
  selection, `speak`'s tags present. **Check:** `validate.test.ts` gains three named
  rejections mirroring the matching block's, each naming the block and the item.
- [x] 3.5 Test the logic in `src/shared/blocks/memory.test.ts`: turning up one card; a pair
  closing and leaving play; a miss leaving both cards up; the next tap turning the miss
  down and the tapped card up in one transition; a tap on an up or matched card returning
  the same object (`toBe`); `tries` counting attempts rather than taps; completion when the
  last pair closes; and — since both screens must agree — that a board built from the same
  seed twice is identical. **Check:** each is a named test and `npm test` passes.
- [x] 3.6 Create `src/blocks/MemoryView.tsx`: a grid of cards face down, a card showing its
  face when up or matched (through `Picture` where the face is the picture), matched cards
  locked and dimmed, the tries line, and speech following `MatchView`'s rule — the face on
  turn-up, the block's line when a pair closes, and silence on the closing tap where a line
  follows it (design D130). Lay the board out to the stage's fixed 880 × 620 box rather than
  to the window. Register it and add the styles. **Check:** `npx tsc --noEmit` and
  `npm run build` pass, and a twelve-card board fits the reference box without the stage
  growing taller than its own reference height — judged by eye and recorded as a manual
  check.
- [x] 3.7 Test the view in `src/blocks/memory-view.test.tsx`: a face-down card shows no
  face and has an accessible name that does not name its item; tapping dispatches `tap`
  with the card id; the pair line is spoken once when a pair closes and the second card's
  own text is not; with the fake speech quiet nothing is spoken and the pair still closes.
  **Check:** each is a named test and `npm test` passes.

## 4. `scramble` — building the sentence

- [x] 4.1 Add the block and its state to `src/shared/types.ts`: `{ type: 'scramble';
  items: ItemRef; template: string }` and `ScrambleState = { order: string[]; index:
  number; placed: number[]; wrong: number | null }` (design D131). **Check:**
  `npx tsc --noEmit` fails only where the new member is unhandled.
- [x] 4.2 Create `src/shared/blocks/scramble.ts` with `scrambleTarget(state)` — the item
  being built or `null` — and `scrambleChips(lesson, block, state, seed)`, deriving the
  chips from the template rendered for the current item, split on whitespace and shuffled
  with `seedFor(seed, 'chips', state.index)`, never stored. `reduce` handles `pick` (side
  `a`, `target` the chip index as a string): accepted when the chip's **text** equals the
  next expected word — so either copy of a repeated word is accepted — otherwise `wrong`;
  and `tap` with the current item's id advances past it, resetting `placed` and `wrong`.
  `isComplete` is every item built. Register it. **Check:** `npx tsc --noEmit` and the
  purity test pass.
- [x] 4.3 Give it an answer key: title `Sentences`, one row per item in `order`, `label`
  the item's English word, `value` the rendered sentence in full, `mark` `done` for items
  already built, `current` for the one on screen (design D133). **Check:** a named test
  asserts the current row's value is the full sentence for the current item and that
  advancing moves the `current` mark to the next row.
- [x] 4.4 Validate it in `src/shared/validate.ts`: the Zod branch, the template's tags
  carried by every selected item, and the rendered sentence at least two words long for
  every selected item. **Check:** `validate.test.ts` gains two named rejections — a
  missing tag and a one-word sentence — each naming the block and the item.
- [x] 4.5 Test the logic in `src/shared/blocks/scramble.test.ts`: the next correct word is
  placed; a wrong chip sets `wrong` and keeps every placed word; a sentence containing the
  same word twice accepts either chip at that point; the chips for one index are stable
  across calls and identical for the same seed; finishing the last word leaves the sentence
  complete without advancing; a `tap` naming the current item advances and reshuffles, and
  a `tap` naming any other item returns the same object (`toBe`); building every item
  completes the block; and `{article}` rendering empty for a plural item produces no empty
  chip. **Check:** each is a named test and `npm test` passes.
- [x] 4.6 Create `src/blocks/ScrambleView.tsx`: the sentence being built above, the
  shuffled chips below, the item's picture as the prompt (through `Picture`), the wrong
  chip shaking, the finished sentence shown whole and spoken once, and a way forward that
  dispatches the advancing `tap` — shown only once the sentence is finished. Chips wrap
  within the stage's reference width. Register it and add the styles. **Check:**
  `npx tsc --noEmit` and `npm run build` pass.
- [x] 4.7 Test the view in `src/blocks/scramble-view.test.tsx`: tapping a chip dispatches
  `pick` with that chip's index; the finished sentence is spoken exactly once and as one
  line, not word by word; no chip tap speaks anything (design D132); the way forward appears
  only when the sentence is finished and dispatches `tap` with the current item's id; with
  the fake speech quiet the sentence is shown and not spoken. **Check:** each is a named
  test and `npm test` passes.

## 5. Twelve types, everywhere the engine counts them

- [x] 5.1 Extend `src/shared/blocks/speakable.ts`: `hotspot` yields each selected item's
  English word plus its `speak` line; `memory` yields both faces' speech plus its pair
  line; `scramble` yields the rendered sentence per item and nothing word-level.
  **Check:** `src/shared/blocks/speakable.test.ts` passes — its existing sweep over
  `Object.keys(blockLogic)` already demands a block of each new type in the fixture and
  lines from each, so 5.3 must land with this.
- [x] 5.2 Extend the fixture lesson in `src/shared/__fixtures__/lesson.ts` with one block
  of each new type — a `hotspot` on the `body` scene, a `memory` over its items, a
  `scramble` with a two-word-plus template — and update the counts the existing tests
  assert. `src/shared/blocks/blocks.test.ts` and `answer-key.test.ts` are written per type
  by hand rather than swept, so add the three cases: `reduce` returns its input by
  reference for an action each refuses, `init` is deterministic for a given seed, and each
  answer key's rows are non-empty text. **Check:** `npm test` passes; the only assertions
  changed are counts, and each is changed deliberately rather than to make a test green.
- [x] 5.3 Confirm `src/shared/reducer.test.ts` and `src/shared/determinism.test.ts` still
  pass with the longer fixture, including that the three new blocks are scored and raise
  its scored-block total. **Check:** `npm test` passes.

## 6. The lessons that teach with them

- [x] 6.1 Add **Label the Body** to `lessons/body-parts.json` after the sentence block: a
  `hotspot` on scene `body` selecting by ids the nine parts the reference page actually
  places — `hair`, `eyes`, `ears`, `nose`, `mouth`, `arm`, `hand`, `leg`, `foot` — with the
  spots given as fractions of the `body` scene's 700 × 480 space, and `"speak": "{this} {be} my {en}."`. `teeth` is
  deliberately not selected: the reference gives it the same rectangle as `mouth` and hides
  it (design D134). Select by ids rather than `select: all` so the block travels with its
  words when the lesson is cut to five (D-36). **Check:** the lesson validates, the block
  plays end to end in the browser, and every spot sits on the part it names — judged by eye
  and recorded as a manual check.
- [x] 6.2 Add **Build It** to `lessons/body-parts.json` after the labelling block: a
  `scramble` over the same nine ids with `"template": "{this} {be} my {en}."` — already a
  level of that lesson's sentence block, so no new line is spoken. **Check:** the lesson
  validates and "These are my eyes." is built and heard for a plural item.
- [x] 6.3 Add **Memory** to `lessons/animals-2.json` after the sound-match block: a `memory`
  over `select: all`, `left: emoji`, `right: en`, `count: 6`, with
  `"speak": "{article} {en} says {tag:sound}!"` — the line that lesson's `sounds` block
  already declares. Part two rather than part one, because a memory board wants a spread and
  revision blocks belong to the part that has one (D-37). **Check:** the lesson validates,
  six pairs are laid out, and closing a pair speaks the animal's sound line.
- [x] 6.4 Run `npm run audio` and inspect its diff. **Check:** it reports no new clip — the
  three templates were chosen to be lines these lessons already speak. If any line is new,
  the generated clips and `src/speech/clips.ts` are regenerated and committed with the
  change rather than left to TTS (D52).
- [x] 6.5 Confirm the two lessons still load from the home screen and that the star trail
  and the footer position count the new blocks. **Check:** Body Parts shows **seven** scored
  exercises (cards, match, sentence, listen, tpr, hotspot, scramble) and Animals part two
  **nine** (two cards, two matches, sentence, tpr, sort, listen, memory), with progress
  reaching 100% when every one is completed — recorded as a manual check.

## 7. Docs

- [x] 7.1 Update `README.md`: three rows in the block table (`hotspot` — `scene`, `spots`,
  `speak`; `memory` — `left`, `right`, `count`, `speak`; `scramble` — `template`), placed
  before the `finish` row, a short paragraph on scenes saying plainly that a new drawing
  needs a developer while a new lesson on an existing drawing does not, and `src/scenes/` in
  "How it is built". **Check:** the table lists every member of `BlockType` and nothing
  else.
- [x] 7.2 Update `docs/PLAN.md`: §4 drops "except `hotspot` (the body diagram), which is
  deferred to v0.2"; §5 gains a third table for the three types and its backlog line loses
  them, noting that `memory` arrives without the alternating turns and per-side score that
  entry imagined; §8's tree lists `src/scenes/`; §9 records what this leaves of v0.2 —
  re-cutting the remaining four lessons to five words, and tablet polish; §12 gains
  **D-40** (a diagram is drawn by the app and placed by the lesson — the narrow exception to
  "lessons are data", and what it costs), **D-41** (memory is cooperative: no turns and no
  per-side score, because an action does not carry who sent it — and why that overrides the
  backlog entry) and **D-42** (a new block type ships used by a real lesson in the same
  change). **Check:** the numbering continues from D-39, nothing in `PLAN.md` still defers
  the body diagram, and nothing left in it contradicts the delta specs.

## 8. Quality gates

- [x] 8.1 Run the full gate. **Check:** `npm run typecheck`, `npm test` and `npm run build`
  all pass, and the result is reported honestly, naming anything skipped.
- [x] 8.2 Confirm nothing outside the block layer moved. **Check:** `git diff --stat` shows
  no change to `src/shared/reducer.ts`, `src/shared/room.ts`, `src/shared/protocol.ts`,
  `src/shared/ink.ts`, `worker/`, `src/ui/LessonPlayer.tsx`, `src/ui/TeacherPanel.tsx` or
  `src/speech/`, and `git diff package.json` is empty (design D124).
- [x] 8.3 Confirm the stage still lays out at its reference width with each new block on
  screen, so a mark drawn over an exercise means the same thing on both screens (D103).
  **Check:** a named test renders each of the three inside the player and asserts the
  stage's laid-out width is `STAGE_REFERENCE_PX`.

## 9. Acceptance

- [x] 9.1 Play Body Parts alone from the home screen through both new exercises.
  **Check:** every word can be placed on the body and the diagram completes; every sentence
  can be built and is spoken whole when it closes; both blocks report complete and the
  lesson reaches its closing screen.
- [x] 9.2 Play Animals part two's memory block alone. **Check:** a miss stays visible until
  the next tap, that tap turns the missed cards down and the tapped card up, closing a pair
  speaks the animal's line once, and finding six pairs completes the block.
- [x] 9.3 Invite a student under `wrangler dev` and play all three from the **student's**
  browser. **Check:** both screens show the same board, the same bank order and the same
  scrambled words; every placement, pair and word appears on both; the teacher's key shows
  the positions, the pairs and the sentence being built.
- [ ] 9.4 With the teacher's sound off, play all three. **Check:** nothing is spoken by any
  of them, every one still completes, and turning sound back on restores speech without a
  reload.
  **Partly done:** the diagram was played to completion with the sound off and still earned
  its star; `memory` and `scramble` were not replayed quiet at runtime — their view tests
  cover what each speaks. See `verification.md`.
- [ ] 9.5 Reload the student's tab mid-way through each block. **Check:** the placed words,
  the matched pairs and the built sentences come back exactly as they were, and the boards
  are laid out identically to before the reload.
  **Partly done:** done for the diagram and the sentence builder in a room — both came back
  exactly, with identical boards. The memory board was not reloaded inside a room.
- [ ] 9.6 Have the teacher reset each of the three blocks. **Check:** each returns to its
  opening state on both screens with a genuinely different shuffle, and completing it again
  works.
  **Partly done:** done from the teacher's panel for the diagram and the sentence builder,
  and on its own screen for the memory board. Each reshuffled genuinely.
- [ ] 9.7 Draw over each of the three in a room. **Check:** marks land on the same content
  on both screens, drawing answers nothing, and taking the pen leaves the marks and the
  exercise both intact.
  **Partly done:** drawing across the diagram answered nothing, as required. The stroke was
  not seen to arrive on the other screen — the drag missed the intended tab's ink layer.
- [ ] 9.8 Check all three at a 380-pixel viewport, and the body diagram on a real tablet if
  one is to hand. **Check:** no horizontal scroll; the eyes, ears, nose and mouth can each
  be hit with a finger; the memory board's six pairs are readable; chips wrap rather than
  overflow.
  **Not done:** the targets measure 103 px in the stage's coordinates, which the tested
  scale puts at about 44 px on a 380-pixel screen — but the browser window here would not
  resize that small, so nothing was observed at that width. Needs a real device.
- [x] 9.9 Report which checks were automated and which were performed by hand, in the
  change's `verification.md`. **Check:** the manual tier is named as manual, never
  presented as test coverage.
