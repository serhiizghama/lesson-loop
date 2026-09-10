## 1. The format grows parts, without anything being required to use them

- [x] 1.1 Add `Part = { id: string; title: string; emoji: string; items: string[] }` and
  `parts?: Part[]` to `Lesson` in `src/shared/types.ts`, with a comment saying that a
  narrowed lesson never carries it (design D1, D2).
  *Check:* `npm run typecheck` passes and the eight existing lesson files still load.
- [x] 1.2 Add `{ select: 'new' }` to `ItemRef` and `only?: string[]` to `BlockBase`.
  *Check:* `npm run typecheck` passes; `resolveItems` does not compile without handling
  the new arm, and is made to throw on it with a message naming the block (it may only
  ever be reached by a bug — a narrowed lesson has none).
- [x] 1.3 Extend the zod schemas in `src/shared/validate.ts` for `parts`, `select:'new'`
  and `only`, all optional.
  *Check:* a unit test loads a topic declaring two parts and a block with `only` and gets
  `ok: true`; a topic whose block has `only: ['nope']` gets an error naming the part.
- [x] 1.4 Confirm every current lesson file is still valid with no edits.
  *Check:* `npm test -- lessons` passes untouched.

## 2. Narrowing

- [x] 2.1 Write `narrow(lesson, choice)` in a new `src/shared/narrow.ts`, where `choice`
  is a part id or the whole topic. Items: parts 1..k cumulative, or all. Blocks: those
  whose `only` contains the chosen part id, or that declare none; every block for the
  whole-topic choice, in file order. `select:'new'` becomes `select:'ids'` over the chosen
  part's items, or all items for the whole topic (design D3).
  *Check:* unit tests for each rule, including that block order is the file's order and
  that a cumulative part keeps the earlier part's items in file order.
- [x] 2.2 Make `narrow` erase every trace of the topic: no `parts`, no `only`, no
  `select:'new'` in the result; `title` and `emoji` taken from the chosen part.
  *Check:* a test walks the returned lesson and asserts all three are absent — the
  guarantee that replaces a separate `Topic` type (design D2).
- [x] 2.3 Add `choicesOf(lesson)` returning the sizes a topic offers — each with its id,
  its title, and how many words it teaches — and an empty list for a topic with no parts.
  *Check:* a ten-word two-part topic returns three choices reporting 5, 5 and 10; an
  un-parted topic returns none.
- [x] 2.4 Keep `src/shared` pure.
  *Check:* `npm test -- purity` passes.

## 3. Every size is validated

- [x] 3.1 Add the structural checks on `parts` before any narrowing: an item id no item
  declares, an item named by two parts, a part naming nothing, a block's `only` naming an
  unknown part (design D6).
  *Check:* one test per case, each asserting the message names the part and the item.
- [x] 3.2 Run the existing cross-checks over every derived size, prefixing each error with
  the size it came from.
  *Check:* a fixture topic whose second part leaves `sort` with one usable bucket fails
  validation, the message names both the part and the block, and the same topic passes
  when the part is fixed — the defect in the teacher's own file (proposal, design D6).
- [x] 3.3 Check `match.count` and `listen.choices` against each size, not only the file.
  *Check:* a topic whose part-one lesson has fewer items than a block's `count` fails,
  naming the size.

## 4. Addresses

- [x] 4.1 Extend `parseRoute` with `/l/<topic>/<choice>` and keep `/l/<topic>`; add
  `lessonPath(topicId, choiceId?)` (design D5).
  *Check:* `router.test.ts` covers both forms, an unknown choice, and that `/r/` and `/t/`
  are unchanged.
- [x] 4.2 In `App`, resolve a route to a topic and a choice: narrow before rendering, and
  show the "there is no such lesson" screen when the choice is not one the topic offers.
  *Check:* a test renders `/l/animals/nope` and finds the missing-lesson screen, and
  `/l/animals/wild` and finds that lesson's first exercise.
- [x] 4.3 Key `SoloLesson` on topic-plus-choice so switching size starts fresh (design D7).
  *Check:* a test completes an exercise on one size, switches to another, and finds no
  progress and no stars carried over.
- [x] 4.4 Confirm a room still opens on whatever lesson is in play, with no worker change.
  *Check:* `npm test -- worker-routes` and the room tests pass untouched, and
  `wrangler.jsonc` is not edited.

## 5. The choice on the home screen

- [x] 5.1 Make a topic card with parts expand in place to its sizes, each saying what it
  teaches; a topic without parts opens directly as today (design D8).
  *Check:* a test finds three choices on a two-part topic, none on an un-parted one, and
  that tapping one navigates to that size's address.
- [x] 5.2 Label the whole-topic choice with the topic's own word count, not a fixed number.
  *Check:* a test asserts Animals offers "all 10" and Shapes "all 8".
- [x] 5.3 Keep the card readable at 380px with the sizes expanded.
  *Check:* the narrow-window test covers an expanded card; nothing overlaps and the page
  does not scroll sideways.

## 6. Animals and Shapes become one file each

- [x] 6.1 Copy `animals-1`, `animals-2`, `shapes-1`, `shapes-2` into
  `src/shared/__fixtures__/` as the migration's reference.
  *Check:* the fixtures load and validate as ordinary lessons.
- [x] 6.2 Author `lessons/animals.json`: ten items, parts `known` and `wild`, teaching
  blocks on `select:'new'`, `sort` and `listen` on `all` with `only: ['wild']`, block order
  taken from `animals-2` (design D9).
  *Check:* `narrow` to `known` equals the `animals-1` fixture and to `wild` equals the
  `animals-2` fixture, allowing only the two differences design D9 records.
- [x] 6.3 Author `lessons/shapes.json` the same way: eight items, parts `basic` and `more`,
  a `phrases` block per part carrying that part's own lines, `match` with `only: ['more']`.
  *Check:* `narrow` to each part equals the corresponding fixture.
- [x] 6.4 Delete `animals-1.json`, `animals-2.json`, `shapes-1.json`, `shapes-2.json`, and
  move their pictures and recordings to the merged topics' names if the asset names carry
  the lesson id.
  *Check:* `npm run build` succeeds, every picture and recording still resolves, and the
  home screen lists six topics.

## 7. The remaining four topics gain parts

- [x] 7.1 `colours`: two parts of five, each part's words spread across the `sort` buckets
  so part one is a real question on its own.
  *Check:* every size validates and the first part's `sort` fills at least two buckets.
- [x] 7.2 `body-parts`: two parts of five.
  *Check:* every size validates; no new pictures or recordings were needed.
- [x] 7.3 `food`: two parts of five.
  *Check:* every size validates.
- [x] 7.4 `numbers`: two parts of five.
  *Check:* every size validates.
- [x] 7.5 Confirm no asset work was required for any of the four.
  *Check:* `git status` shows no additions under `public/` or the audio directory.

## 8. A room finds its lesson by name

Added during implementation: opening a room on a part left both screens blank, because
the room does not send its lesson — both participants resolve it from `lessons/` by the
id in the state (design D6a).

- [x] 8.0 Give a built lesson the id of its address (`animals/wild`), split `lessons.ts`
  into `topicById` (the file) and `lessonById` (a size, narrowed), file pictures by topic,
  and offer the sizes rather than the files in the room's lesson switcher.
  *Check:* a room opened on a part plays it on both screens, "Change lesson" lists the
  sizes and switching to one works, and a built lesson passes `validateLesson` — which is
  what the wire runs on `switch-lesson`.

## 9. Documentation and close-out

- [x] 9.1 Update `docs/PLAN.md`: mark D-36 superseded and record the new decisions (the
  topic file, the cumulative part, `only`, the address, per-size validation).
  *Check:* D-36 reads as superseded and points at the new decision ids.
- [x] 9.2 Remove "re-cutting the remaining four lessons to five words each" from what
  remains of v0.2, and say what replaced it.
  *Check:* §9 no longer lists it.
- [x] 9.3 Update `README.md` where it says a topic longer than five words becomes another
  file.
  *Check:* the "add a lesson" section describes parts and still says adding a lesson is a
  file and no code.
- [x] 9.4 Full verification.
  *Check:* `npm run typecheck`, `npm test` and `npm run build` all pass, and a lesson is
  opened at each size in `npm run dev:worker` with a second browser joined to a room on a
  part.
