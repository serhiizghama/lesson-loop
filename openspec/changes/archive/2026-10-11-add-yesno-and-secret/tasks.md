## 1. Types and validation

- [x] 1.1 Add the two block shapes and their state shapes to `src/shared/types.ts`:
      - `yesno`: `items`, `question`, `yes`, `no`, `check?: boolean`; state `{ order,
        asked, index, answer, wrong }` (D145);
      - `secret`: `items`, `rounds`, `guess`, `found`; state `{ order, round, tried, found }`
        (D147).

      *Check:* `npm run typecheck` fails only on the two registries, with a missing-member
      error. That is the mapped type asking for them.
- [x] 1.2 In `src/shared/validate.ts`, add the schemas and cross-checks:
      - empty templates;
      - a template tag that a selected item lacks;
      - a checked `yesno` selecting fewer than two items;
      - a selection containing an item with id `yes` or `no`;
      - a `secret` selecting fewer than two items, or with `rounds` below 1 or above the
        selection.

      Each check runs at every size (D-46).
      *Check:* new cases in `src/shared/validate.test.ts`, each asserting the named error
      text including the size, pass under `npm test`.
- [x] 1.3 Change `only` validation (D148):
      - accept `all` in a topic with parts;
      - reject a part whose id is `all`;
      - keep today's error for `only` in a topic without parts.

      *Check:* `validate.test.ts` covers all three. A new case in the narrowing tests shows
      a block with `only: ["all"]` present in `narrow(topic, 'all')` and absent from every
      part, with `narrow.ts` unchanged (`git diff src/shared/narrow.ts` is empty).

## 2. Logic

- [x] 2.1 Write `src/shared/blocks/yesno.ts`:
      - `init`: seeded `order`; `asked` per D145;
      - `reduce` per D146;
      - `isComplete`: when the last item has an answer;
      - `answerKey`: each item's question and, for a check, the true answer with its reply,
        marked done, current or open;
      - export the helpers the view needs (current item, question text, reply text).

      *Check:* `src/shared/blocks/yesno.test.ts` covers:
      - an opinion accepting both answers;
      - a check accepting only the true one;
      - a repeated wrong answer returning the state by reference;
      - moving on refused before an answer and refused with the wrong id;
      - completion without a final tap;
      - `asked` identical for the same seed, and different after a reset generation;
      - across 200 seeds, a check asks a false question between 35% and 65% of the time.
- [x] 2.2 Write `src/shared/blocks/secret.ts`:
      - `init`: seeded `order`;
      - `reduce` per D147;
      - `isComplete`: on the last round, found;
      - `answerKey`: the secret of each round, done, current or open;
      - export a helper for the tile order (lesson order, never `order`).

      *Check:* `secret.test.ts` covers:
      - a wrong tile added to `tried`, and a second tap on it refused by reference;
      - the secret found;
      - moving on only with the secret's id while found;
      - `tried` cleared each round;
      - every round hiding a different item;
      - completion on the last round;
      - the tile order being the same for every seed.
- [x] 2.3 Register both in `src/shared/blocks/index.ts`, and add their lines to
      `speakable.ts`: questions, yes and no replies for every selected item; guess and found
      lines for every selected item.
      *Check:* `npm run typecheck` passes. `blocks.test.ts` and `answer-key.test.ts`, which
      iterate the registry, now cover 14 types with no per-type branch added.

## 3. Views

- [x] 3.1 `src/blocks/YesNoView.tsx` per D150.
      *Check:* `yesno-view.test.tsx` asserts:
      - the question is readable with the sound off;
      - the 🔊 control speaks with the sound off, and nothing speaks on arrival;
      - a wrong answer to a check shows no reply;
      - the reply appears after a right answer, and *Next →* is absent on the last item.
- [x] 3.2 `src/blocks/SecretView.tsx` per D150.
      *Check:* `secret-view.test.tsx` asserts:
      - before the secret is found, the rendered student view contains neither the
        secret's picture nor its word;
      - a tried tile is disabled;
      - the found line is spoken only with the sound on;
      - *Next secret →* is absent on the last round.
- [x] 3.3 Register both views in `src/blocks/index.ts`. Append their styles to
      `blocks.module.css`.
      *Check:* `npm run typecheck` and `npm test` pass, and `git diff
      src/blocks/blocks.module.css` shows only additions.

## 4. The test harness knows the new types

- [x] 4.1 Teach `tests/support/play.ts` to play `yesno` (the true answer, then move on) and
      `secret` (tap the secret, then move on).
      *Check:* before this task, temporarily add a `yesno` block to a lesson and see
      `tests/playthrough.test.ts` fail. After it, the test passes.
- [x] 4.2 Add one block of each type to `src/shared/__fixtures__/lesson.ts`, and update the
      hard-coded star counts that move (`src/ui/student-view.test.tsx` and any other
      failures).
      *Check:* `speakable.test.ts` covers both types, and `npm test` passes.
- [x] 4.3 Add both types to the guide's exercise table, in the teacher's words.
      *Check:* `src/ui/guide.test.tsx` passes, which fails while a registry type has no row.

## 5. The lessons (D149)

- [x] 5.1 Make the edits in Drink Talk, Let's Go! (adding tag `np`), My Family and Fruit
      Talk exactly as in D149.
      *Check:* `npm test` passes, including playthrough at every size. A scratch assertion
      (not committed) shows `fruit/b` has no `yesno`, `prefer` or `talk`, and `fruit/all`
      has all three.
- [x] 5.2 Record the new lines with `npm run audio`.
      *Check:* it reports only new clips, and `tests/clips.test.ts` shows no line of the
      four topics without a clip.
- [x] 5.3 Smoke the four topics headless (Playwright, no visible browser), in every size:
      - answer one `yesno` each way;
      - in My Family, give a wrong answer to a false check;
      - play one secret round with a wrong guess first.

      *Check:* screenshots show the reply after a right answer only, a crossed-out tile and
      a revealed secret, with no console errors. Write the runs down in the PR description.
- [x] 5.4 Smoke a room headless: `wrangler dev` plus two pages, teacher and student. On the
      teacher's page, answer a checked `yesno` and play a secret round.
      *Check:* both pages show the same question, and the student page follows each answer
      and each found secret. The teacher's key shows the true answer and the secret; the
      student's page never shows the secret before it is found.

## 6. Finish

- [x] 6.1 Run the full gate.
      *Check:* `npm run typecheck`, `npm test` and `npm run build` pass. Paste the summary
      lines.
- [x] 6.2 Update the docs:
      - `README.md`: two rows in the block table; `only: ["all"]` in *How long is a
        lesson?*;
      - `docs/PLAN.md` §9: 2a delivered, and `ask` → `yesno` named;
      - `docs/PLAN.md` §12: the product decisions — the dropped lesson-21 follow-up, no
        first-try stars, the secret visible in state.

      *Check:* §12's new rows number on from D-54.
