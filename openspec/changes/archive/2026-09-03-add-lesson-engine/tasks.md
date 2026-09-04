## 1. Project scaffold

- [x] 1.1 Initialise a Vite + React + TypeScript project at the repo root (`package.json`,
  `vite.config.ts`, `tsconfig.json`, `index.html`, `src/main.tsx`). Add `zod` as the only
  runtime dependency beyond React. **Check:** `npm run dev` serves a page and
  `npx tsc --noEmit` exits 0.
- [x] 1.2 Configure strict TypeScript (`strict`, `noUncheckedIndexedAccess`,
  `exactOptionalPropertyTypes`) and a `@/` path alias to `src/`. **Check:** `npx tsc
  --noEmit` exits 0 with the strict flags on.
- [x] 1.3 Create the directory skeleton from design.md D1: `src/shared/{blocks}`,
  `src/blocks`, `src/ui`, `src/speech`, `lessons/`. **Check:** the tree matches D1.
- [x] 1.4 Install and configure Vitest with a `test` script. **Check:** `npm test` runs and
  reports zero failures on an empty suite.

## 2. Lesson format and validation

- [x] 2.1 Write `src/shared/types.ts`: `Lesson`, `Item` (including `plural?` and `article?`
  from design D5), `Face`, `ItemRef`, and the discriminated `Block` union for the six v0.1
  types plus `finish`, following docs/PLAN.md §4. **Check:** `npx tsc --noEmit` exits 0.
- [x] 2.2 Write `src/shared/validate.ts` with a zod schema mirroring those types and a
  `validateLesson(data)` returning either the typed lesson or an error listing offending
  paths. **Check:** unit test — a lesson missing `items[0].en` reports the path
  `items.0.en`.
- [x] 2.3 Add cross-reference validation beyond the shape: every item id referenced by a
  block exists, every `withTag` selection is non-empty, every `sort` bucket key is carried
  by at least one selected item, block ids are unique. **Check:** unit tests — one lesson
  per rule fails with a message naming the block and the offending value; a valid lesson
  passes.
- [x] 2.4 Write `resolveItems(lesson, ref)` implementing the three selection forms (explicit
  id list in listed order, all, by tag). **Check:** unit test covering all three, including
  that an explicit list preserves its declared order.

## 3. Deterministic state core

- [x] 3.1 Write `src/shared/rng.ts`: a `mulberry32` PRNG plus a string hash, and
  `shuffleWithSeed(items, seed)`. **Check:** unit test — the same seed yields the same
  permutation across 100 runs, two different seeds yield different permutations, and the
  output is a permutation of the input.
- [x] 3.2 Define `LessonState` and the `Action` union in `src/shared/types.ts` exactly as in
  design D2 and D4. **Check:** `npx tsc --noEmit` exits 0.
- [x] 3.3 Write `createLessonState(lessonId)` drawing the seed once — the only impure call
  in `shared/`. **Check:** unit test — two calls produce different seeds; `v` starts at 0
  and `blocks` is empty.
- [x] 3.4 Write `applyAction(lesson, state, action)` in `src/shared/reducer.ts`: dispatch to
  the block's pure reducer, lazily initialise block state, increment `v` on success, and
  return the **identical state reference** on any invalid or no-op action. **Check:** unit
  tests — a valid action increments `v` by 1; an action for an unknown block returns the
  same reference with `v` unchanged and throws nothing.
- [x] 3.5 Implement `reset` bumping `resets[blockId]` and dropping that block's state so it
  re-initialises with a new order. **Check:** unit test — after reset the block's
  presentation order differs from before, and other blocks' states are untouched.
- [x] 3.6 Write the determinism tests that the next change depends on: replaying a recorded
  action list twice ends in deeply-equal states; two independently created states seeded
  identically then fed the same actions stay equal; a state serialised to JSON and back
  behaves identically. **Check:** all three pass.
- [x] 3.7 Write the purity guard test: walk the import graph of `src/shared/` and fail on
  any import of `react`, `react-dom`, or use of a DOM global. **Check:** the test passes
  now and fails when a `import 'react'` line is temporarily added to a shared file.

## 4. Block logic (pure, `src/shared/blocks/`)

- [x] 4.1 Define the block-logic contract — `init(lesson, block, seed)`, `reduce(block,
  state, action)`, `isComplete(block, state)` — and the registry keyed by block type.
  **Check:** `npx tsc --noEmit` exits 0 and the registry is exhaustive over the block union
  (a missing type is a compile error).
- [x] 4.2 `cards`: state `{ order, flipped }`; tapping flips and records; complete when all
  flipped. **Check:** unit tests for flip, idempotent re-flip, and completion on the last
  card.
- [x] 4.3 `match`: state `{ order.a, order.b, selected, paired, wrong }` with the two sides
  independently shuffled; correct pairs lock in, wrong pairs clear the selection, a second
  tap on the same side moves the selection. **Check:** unit tests for each of the three
  scenarios in the `exercise-blocks` spec, plus completion when all pairs are made.
- [x] 4.4 `sentence`: state `{ item, level }`; `renderSentence(item, template)` substituting
  `{en}`, `{article}` and the verb form, honouring `item.plural` and `item.article` per
  design D5. **Check:** unit tests — "It is **an** eye", "They **are** eyes", and an item
  with an explicit `article` override beating the vowel heuristic.
- [x] 4.5 `sort`: state `{ order, selected, placed }`; correct placement sticks, wrong is
  refused; complete when every selected item is placed. **Check:** unit tests for both
  placement outcomes and completion.
- [x] 4.6 `listen`: state `{ order, index, answered, wrong }`; the target advances only on a
  correct tap; repeating the prompt records no answer; distractors are drawn from the
  block's own selection. **Check:** unit tests — a wrong tap leaves the target unchanged,
  a correct tap advances, and completion follows the last target.
- [x] 4.7 `tpr`: state `{ index, started }`; advances on demand and records no correctness.
  **Check:** unit test — three advances yield three distinct instructions and no score
  field appears in the state.
- [x] 4.8 Write `lessonProgress(lesson, state)` deriving completion counts from
  `isComplete`, storing nothing. **Check:** unit test — progress over a mixed-type lesson
  is computed with no per-type branch in the caller.

## 5. Speech

- [x] 5.1 Write `src/speech/speech.ts`: `speak(text)` cancelling any utterance in flight,
  `en-US` at rate 0.85, an `en-*` voice when the voice list has arrived, never blocking on
  it. **Check:** unit test against a mocked `speechSynthesis` — `cancel` is called before
  each `speak`, and four rapid calls leave exactly one utterance queued.
- [x] 5.2 Add one-time priming on the first `pointerdown` and `isAvailable()`. **Check:**
  unit test — priming runs once for several gestures; `isAvailable()` is false when
  `speechSynthesis` is absent from the mocked global.
- [x] 5.3 Make every call site tolerate absence: no throw, no error UI, progress unaffected.
  **Check:** the block unit tests pass with speech mocked as unavailable.

## 6. React shell and block views

- [x] 6.1 Build the app shell: lesson picker, the current block, a progress bar, and
  previous/next navigation that works from any block regardless of completion. **Check:**
  in the browser, open a lesson, skip forward from an incomplete block and back, and see
  the earlier block's progress preserved.
- [x] 6.2 Wire React state to `applyAction` through a single dispatch point, so no component
  mutates state directly. **Check:** grep — no component outside the dispatch hook writes
  to lesson state.
- [x] 6.3 Write the six block views in `src/blocks/`, each rendering purely from block state
  and emitting actions on tap, with a view registry keyed by block type. **Check:** every
  block type renders in the browser and every interaction produces exactly one action.
- [x] 6.4 Add CSS-module styling with a shared token file: large tap targets, visible
  correct/incorrect feedback, and the closing screen. **Check:** at 380 px wide there is no
  horizontal scrolling and no overlapping controls, per the `lesson-player` spec.
- [x] 6.5 Add the listening exercise's readable fallback when `isAvailable()` is false.
  **Check:** with speech mocked unavailable, the target word is legible and the exercise is
  completable.

## 7. Lesson content

- [x] 7.1 Write `lessons/animals.json` from `docs/reference/animals_lesson.html`: ten items
  with Japanese glosses, romaji, examples and the `sound`, `habitat` and `move` tags, and
  the blocks reproducing all of its original exercises. **Check:** it validates and plays
  end to end.
- [x] 7.2 Write `lessons/body-parts.json` from `docs/reference/body_parts_lesson.html`, with
  the `move` tag driving the physical-response block and correct `plural` flags on eyes,
  ears and teeth. The labelled diagram is deliberately omitted (deferred to v0.2).
  **Check:** it validates, plays end to end, and the sentence block produces "They are
  eyes".
- [x] 7.3 Confirm the format needed no lesson-specific escape hatch. **Check:** grep the
  source for the strings `animals` and `body-parts` — they appear only in the lesson files
  and in the lesson index, never in a code branch.

## 8. Quality gates

- [x] 8.1 Add a test that loads every file in `lessons/` and validates it. **Check:** the
  test fails when a field is deliberately broken in a lesson file and passes when restored.
- [x] 8.2 Add `.github/workflows/ci.yml` running install, typecheck, test and build on push
  and pull request. **Check:** the workflow is green on the branch.
- [x] 8.3 Write `README.md`: what the project is, how to run it, and how to add a lesson.
  **Check:** a reader following it alone can add a third lesson without opening any source
  file.

## 9. Acceptance

- [x] 9.1 Play both lessons start to finish in one browser, offline after first load.
  **Check:** every block completes, progress reaches 100%, the closing screen appears, and
  the network panel shows no request after load.
- [x] 9.2 Run the full gate. **Check:** `npx tsc --noEmit`, `npm test` and `npm run build`
  all pass, and the results are reported honestly including anything skipped.
