## 1. The drawing the app carries

- [ ] 1.1 Create `src/shared/scenes.ts`: `SCENE_IDS = ['body'] as const`, `SceneId`, and a
  `SCENES` record giving each scene its drawing size (`{ width: 220, height: 420 }` for
  `body`, the coordinate space of the reference page). Data only — no React, no DOM
  (design D85). **Check:** `npx tsc --noEmit` passes and `src/shared/purity.test.ts` still
  passes, so the Worker can import it.
- [ ] 1.2 Create `src/scenes/BodyScene.tsx` — the figure from
  `docs/reference/body_parts_lesson.html` as inline SVG with
  `viewBox="0 0 220 420"`, `preserveAspectRatio="xMidYMid meet"`, `width="100%"`,
  `aria-hidden`, and no interactive element inside it. **Check:** rendered on its own in a
  test it produces one `<svg>` with that `viewBox`, contains no `<button>`, and
  `git diff package.json` is empty — no drawing library entered the project.
- [ ] 1.3 Create `src/scenes/index.ts` with `scenes: { [S in SceneId]: SceneComponent }`,
  the same exhaustive mapped-type shape the two block registries use. **Check:** removing
  an entry is a compile error (verified once by hand and recorded), and
  `npx tsc --noEmit` passes.

## 2. `hotspot` — labelling the drawing

- [ ] 2.1 Add the block and its state to `src/shared/types.ts`: `{ type: 'hotspot';
  items: ItemRef; scene: SceneId; spots: Record<string, [number, number, number, number]>;
  speak?: string }` and `HotspotState = { order: string[]; selected: string | null;
  placed: string[]; wrong: { item: string; spot: string } | null }` in `BlockStateMap`
  (design D87). **Check:** `npx tsc --noEmit` now fails only in the two registries and
  `speakableLines`, naming the missing `hotspot` member — the exhaustiveness the design
  relies on.
- [ ] 2.2 Create `src/shared/blocks/hotspot.ts`: `scored: true`; `init` shuffles the
  selected item ids into `order`; `reduce` handles `pick` — side `a` selects or re-selects
  a word (refusing a word already placed), side `b` places the held word when the spot's
  item id matches and otherwise sets `wrong`, and a side `b` pick with nothing selected
  returns the state **by reference**; `isComplete` is every selected item placed. Register
  it in `src/shared/blocks/index.ts`. **Check:** `npx tsc --noEmit` passes and
  `src/shared/purity.test.ts` passes.
- [ ] 2.3 Add `hotspotSpeech(block, item)` beside the logic — the block's `speak` template
  rendered for the item, or `null` where the block declares none — mirroring
  `matchPairSpeech`. **Check:** a named test returns `null` for a block without `speak`
  and the filled line for one with it.
- [ ] 2.4 Give it an answer key: title `Where each word goes`, one row per selected item,
  `label` the English word, `value` the position in words derived from the spot's centre —
  vertical third (`top`/`middle`/`bottom`) and horizontal third (`left`/`centre`/`right`),
  joined as `top · centre` — and `mark` `done` when placed, `current` while held, else
  `open` (design D93). **Check:** a named test in `src/shared/blocks/hotspot.test.ts`
  asserts `nose` at `[0.45, 0.13, 0.10, 0.05]` reads `top · centre`, and a spot centred at
  `[0.8, 0.9]` reads `bottom · right`.
- [ ] 2.5 Validate it in `src/shared/validate.ts`: a Zod branch (scene from
  `SCENE_IDS`, `spots` a record of four-number tuples, optional `speak`) plus cross-checks
  — every selected item has a spot, every rectangle lies inside the unit square with a
  positive width and height, and `speak`'s tags are carried by every selected item.
  **Check:** `src/shared/validate.test.ts` gains four named rejections — unknown scene,
  missing spot, rectangle outside the drawing, zero-sized rectangle — each asserting the
  message names the block and the offending item.
- [ ] 2.6 Test the logic in `src/shared/blocks/hotspot.test.ts`: a correct placement sticks
  and clears `wrong`; a wrong placement sets `wrong` and places nothing; tapping a second
  word moves the selection; a spot tapped with nothing selected returns the same object
  (`toBe`); a word already placed cannot be re-selected; placing the last word completes
  the block. **Check:** each is a named test and `npm test` passes.
- [ ] 2.7 Create `src/blocks/HotspotView.tsx`: the scene from the registry with the spots
  positioned over it in percentages, each an inflated tap target of at least 44 px around
  the declared rectangle's centre with the declared rectangle as its visible outline, the
  containing rectangle winning an overlap (design D88); the word bank beside it; a tapped
  word speaks its English word, a correct placement speaks `hotspotSpeech` where the block
  declares one; the wrong spot and the wrong word carry the shake class the other blocks
  use. Register it in `src/blocks/index.ts` and add the styles to `blocks.module.css`.
  **Check:** `npx tsc --noEmit` and `npm run build` pass.
- [ ] 2.8 Test the view in `src/blocks/hotspot-view.test.tsx` with the existing fake
  speech: tapping a word then its spot dispatches two `pick` actions with sides `a` and
  `b`; the placed word leaves the bank and appears on the drawing; the block's declared
  line is spoken on a correct placement and the plain word on selection; with the fake
  speech quiet, nothing is spoken and the placement still dispatches. **Check:** each is a
  named test and `npm test` passes.

## 3. `memory` — pairs face down

- [ ] 3.1 Add the block and its state to `src/shared/types.ts`: `{ type: 'memory'; items:
  ItemRef; left: Face; right: Face; count?: number; speak?: string }` and `MemoryState =
  { order: string[]; up: string[]; matched: string[]; tries: number }`, where a card id is
  `<itemId>#a` / `<itemId>#b` (design D89). **Check:** `npx tsc --noEmit` fails only where
  the new member is unhandled.
- [ ] 3.2 Create `src/shared/blocks/memory.ts` with `cardItem(cardId)` and `cardFace(cardId)`
  helpers: `init` picks `count` items with the seed as `match` does, builds two cards per
  item and shuffles the board; `reduce` handles `tap` — a card already up or matched
  returns the state by reference; with two mismatched cards up the tapped card replaces
  them (they turn down) and `tries` is unchanged by that clearing; a second card closes the
  pair into `matched` when it belongs to the same item, and otherwise leaves both up;
  `tries` increments once per completed attempt (a second card turned up); `isComplete` is
  every pair matched. Register it. **Check:** `npx tsc --noEmit` and the purity test pass.
- [ ] 3.3 Give it an answer key: title `Pairs`, one row per item, `label` the left face,
  `value` the right face followed by the 1-based board positions of its two cards —
  `dog · 3 & 8` — `mark` `done` once matched, `current` while one of its cards is up
  (design D93). **Check:** a named test asserts the positions match the card's index in
  `order` plus one, and that finding a pair marks exactly that row done.
- [ ] 3.4 Validate it in `src/shared/validate.ts`: the Zod branch, and the same cross-checks
  `match` has — both faces renderable by every selected item, `count` no greater than the
  selection, `speak`'s tags present. **Check:** `validate.test.ts` gains three named
  rejections mirroring the matching block's, each naming the block and the item.
- [ ] 3.5 Test the logic in `src/shared/blocks/memory.test.ts`: turning up one card; a pair
  closing and leaving play; a miss leaving both cards up; the next tap turning the miss
  down and the tapped card up in one transition; a tap on an up or matched card returning
  the same object (`toBe`); `tries` counting attempts rather than taps; completion when the
  last pair closes; and — since both screens must agree — that a board built from the same
  seed twice is identical. **Check:** each is a named test and `npm test` passes.
- [ ] 3.6 Create `src/blocks/MemoryView.tsx`: a grid of cards face down, a card showing its
  face when up or matched, matched cards locked and dimmed, the tries line, and speech
  following `MatchView`'s rule — the face on turn-up, the block's line when a pair closes,
  and silence on the closing tap where a line follows it (design D90). Register it and add
  the styles. **Check:** `npx tsc --noEmit` and `npm run build` pass, and at a 380 px
  viewport a six-pair board fits with no horizontal scroll — judged by eye and recorded as
  a manual check.
- [ ] 3.7 Test the view in `src/blocks/memory-view.test.tsx`: a face-down card shows no
  face and has an accessible name that does not name its item; tapping dispatches `tap`
  with the card id; the pair line is spoken once when a pair closes and the second card's
  own text is not; with the fake speech quiet nothing is spoken and the pair still closes.
  **Check:** each is a named test and `npm test` passes.

## 4. `scramble` — building the sentence

- [ ] 4.1 Add the block and its state to `src/shared/types.ts`: `{ type: 'scramble';
  items: ItemRef; template: string }` and `ScrambleState = { order: string[]; index:
  number; placed: number[]; wrong: number | null }` (design D91). **Check:**
  `npx tsc --noEmit` fails only where the new member is unhandled.
- [ ] 4.2 Create `src/shared/blocks/scramble.ts` with `scrambleTarget(state)` — the item
  being built or `null` — and `scrambleChips(lesson, block, state, seed)`, deriving the
  chips from the template rendered for the current item, split on whitespace and shuffled
  with `seedFor(seed, 'chips', state.index)`, never stored. `reduce` handles `pick` (side
  `a`, `target` the chip index as a string): accepted when the chip's **text** equals the
  next expected word — so either copy of a repeated word is accepted — otherwise `wrong`;
  and `tap` with the current item's id advances past it, resetting `placed` and `wrong`.
  `isComplete` is every item built. Register it. **Check:** `npx tsc --noEmit` and the
  purity test pass.
- [ ] 4.3 Give it an answer key: title `Sentences`, one row per item in `order`, `label`
  the item's picture, `value` the rendered sentence in full, `mark` `done` for items
  already built, `current` for the one on screen (design D93). **Check:** a named test
  asserts the current row's value is the full sentence for the current item and that
  advancing moves the `current` mark to the next row.
- [ ] 4.4 Validate it in `src/shared/validate.ts`: the Zod branch, the template's tags
  carried by every selected item, and the rendered sentence at least two words long for
  every selected item. **Check:** `validate.test.ts` gains two named rejections — a
  missing tag and a one-word sentence — each naming the block and the item.
- [ ] 4.5 Test the logic in `src/shared/blocks/scramble.test.ts`: the next correct word is
  placed; a wrong chip sets `wrong` and keeps every placed word; a sentence containing the
  same word twice accepts either chip at that point; the chips for one index are stable
  across calls and identical for the same seed; finishing the last word leaves the sentence
  complete without advancing; a `tap` naming the current item advances and reshuffles, and
  a `tap` naming any other item returns the same object (`toBe`); building every item
  completes the block; and `{article}` rendering empty for a plural item produces no empty
  chip. **Check:** each is a named test and `npm test` passes.
- [ ] 4.6 Create `src/blocks/ScrambleView.tsx`: the sentence being built above, the
  shuffled chips below, the item's picture as the prompt, the wrong chip shaking, the
  finished sentence shown whole and spoken once, and a way forward that dispatches the
  advancing `tap` — shown only once the sentence is finished. Register it and add the
  styles. **Check:** `npx tsc --noEmit` and `npm run build` pass.
- [ ] 4.7 Test the view in `src/blocks/scramble-view.test.tsx`: tapping a chip dispatches
  `pick` with that chip's index; the finished sentence is spoken exactly once and as one
  line, not word by word; no chip tap speaks anything (design D92); the way forward appears
  only when the sentence is finished and dispatches `tap` with the current item's id; with
  the fake speech quiet the sentence is shown and not spoken. **Check:** each is a named
  test and `npm test` passes.

## 5. Nine types, everywhere the engine counts them

- [ ] 5.1 Extend `src/shared/blocks/speakable.ts`: `hotspot` yields each selected item's
  English word plus its `speak` line; `memory` yields both faces' speech plus its pair
  line; `scramble` yields the rendered sentence per item and nothing word-level.
  **Check:** `src/shared/blocks/speakable.test.ts` passes, including its existing
  agreement check that every line a view speaks is enumerated — extended to the three new
  views.
- [ ] 5.2 Extend `src/shared/blocks/blocks.test.ts` and `answer-key.test.ts` so the
  contract cases run over all nine types: `reduce` returns its input by reference for an
  action it refuses, `init` is deterministic for a given seed, and every scored type
  returns a key whose rows are non-empty text. **Check:** the tests enumerate
  `Object.keys(blockLogic)` rather than a hand-written list, so a tenth type cannot slip
  past them, and `npm test` passes.
- [ ] 5.3 Extend the fixture lesson in `src/shared/__fixtures__/lesson.ts` with one block
  of each new type, and confirm `src/shared/reducer.test.ts` and `determinism.test.ts`
  still pass with the longer lesson — including that the three new blocks are scored and
  raise the fixture's block total. **Check:** `npm test` passes with no assertion changed
  other than counts, and the counts are updated deliberately rather than to make a test
  green.

## 6. The lessons that teach with them

- [ ] 6.1 Add **Label the Body** to `lessons/body-parts.json` after the sentence block: a
  `hotspot` on scene `body` selecting all ten items, with the spots converted from
  `docs/reference/body_parts_lesson.html` to fractions of 220 × 420, and
  `"speak": "{this} {be} my {en}."`. **Check:** the lesson validates, the block plays end
  to end in the browser, and every spot sits on the part it names — judged by eye and
  recorded as a manual check.
- [ ] 6.2 Add **Build It** to `lessons/body-parts.json` after the labelling block: a
  `scramble` over all items with `"template": "{this} {be} my {en}."`. **Check:** the
  lesson validates and "These are my eyes." is built and heard for a plural item.
- [ ] 6.3 Add **Memory** to `lessons/animals.json` after the matching block: a `memory`
  over all items, `left: emoji`, `right: en`, `count: 6`, with
  `"speak": "{article} {en} says {tag:sound}!"`. **Check:** the lesson validates, six pairs
  are laid out, and closing a pair speaks the animal's sound line.
- [ ] 6.4 Confirm the two lessons still load from the home screen and that the star trail
  and the footer position count the new blocks. **Check:** Body Parts shows eight scored
  exercises and Animals ten, with progress reaching 100% when every one is completed —
  recorded as a manual check.

## 7. Docs

- [ ] 7.1 Update `README.md`: three rows in the block table (`hotspot` — `scene`, `spots`,
  `speak`; `memory` — `left`, `right`, `count`, `speak`; `scramble` — `template`), a short
  paragraph on scenes saying plainly that a new drawing needs a developer while a new
  lesson on an existing drawing does not, and `src/scenes/` in "How it is built".
  **Check:** no sentence in `README.md` still says the engine has six exercise types.
- [ ] 7.2 Update `docs/PLAN.md`: §5's table gains the three types and the backlog line
  loses them; §8's tree lists `src/scenes/`; §9 records what this change delivers of v0.2;
  §12 gains **D-28** (a diagram is drawn by the app and placed by the lesson — the narrow
  exception to "lessons are data", and what it costs), **D-29** (memory is cooperative:
  no turns and no per-side score, because an action does not carry who sent it) and
  **D-30** (a new block type ships used by a real lesson in the same change). **Check:**
  nothing left in `PLAN.md` contradicts the delta specs — in particular §4's sentence
  deferring the body diagram to v0.2.
- [ ] 7.3 Update the `exercise-blocks` capability's Purpose in
  `openspec/specs/exercise-blocks/spec.md`, which says "These six exercises are the whole
  vocabulary of the engine", when this change's specs are synced — a delta cannot carry a
  Purpose. **Check:** after `openspec archive`, the main spec's Purpose says nine and the
  requirements list the three new exercises.

## 8. Quality gates

- [ ] 8.1 Run the full gate. **Check:** `npm run typecheck`, `npm test` and `npm run build`
  all pass, and the result is reported honestly, naming anything skipped.
- [ ] 8.2 Confirm nothing outside the block layer moved. **Check:** `git diff --stat` shows
  no change to `src/shared/reducer.ts`, `src/shared/room.ts`, `src/shared/protocol.ts`,
  `worker/`, `src/ui/LessonPlayer.tsx`, `src/ui/TeacherPanel.tsx` or `src/speech/`, and
  `git diff package.json` is empty (design D84).

## 9. Acceptance

- [ ] 9.1 Play Body Parts alone from the home screen through both new exercises.
  **Check:** every word can be placed on the body and the diagram completes; every sentence
  can be built and is spoken whole when it closes; both blocks report complete and the
  lesson reaches its closing screen.
- [ ] 9.2 Play Animals' memory block alone. **Check:** a miss stays visible until the next
  tap, that tap turns the missed cards down and the tapped card up, closing a pair speaks
  the animal's line once, and finding six pairs completes the block.
- [ ] 9.3 Invite a student under `wrangler dev` and play all three from the **student's**
  browser. **Check:** both screens show the same board, the same bank order and the same
  scrambled words; every placement, pair and word appears on both; the teacher's key shows
  the positions, the pairs and the sentence being built.
- [ ] 9.4 With the teacher's sound off, play all three. **Check:** nothing is spoken by any
  of them, every one still completes, and turning sound back on restores speech without a
  reload.
- [ ] 9.5 Reload the student's tab mid-way through each block. **Check:** the placed words,
  the matched pairs and the built sentences come back exactly as they were, and the boards
  are laid out identically to before the reload.
- [ ] 9.6 Have the teacher reset each of the three blocks. **Check:** each returns to its
  opening state on both screens with a genuinely different shuffle, and completing it again
  works.
- [ ] 9.7 Check all three at a 380-pixel viewport, and the body diagram on a real tablet if
  one is to hand. **Check:** no horizontal scroll; the eyes, nose and mouth can each be hit
  with a finger; the memory board's six pairs fit; chips wrap rather than overflow.
- [ ] 9.8 Report which checks were automated and which were performed by hand, in the
  change's `verification.md`. **Check:** the manual tier is named as manual, never
  presented as test coverage.
