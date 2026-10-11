## 1. Types, renderer and validation

- [x] 1.1 Add the five block shapes and their state shapes to `src/shared/types.ts`, per
      D151–D155.
      *Check:* `npm run typecheck` fails only on the two registries and on `speakable.ts`'s
      exhaustive switch.
- [x] 1.2 `src/shared/text.ts`:
      - `renderTemplate(template, item, other?)` renders `{other}` as the other item's `en`;
      - add a helper that replaces `{row:<id>}` from a map of chosen texts;
      - add a helper listing the `{row:…}` names a template uses.

      *Check:* `src/shared/text.test.ts` covers `{other}`, `{row:…}`, an unknown row left
      untouched, and tidy punctuation after a replaced row.
- [x] 1.3 In `src/shared/validate.ts`, add the schemas and cross-checks of the
      lesson-format delta:
      - `reveal`: tags in `speak`;
      - `dialogue`: exactly two roles, at least two lines, each line's role is 0 or 1,
        tags present;
      - `talk`: at least two levels, none empty;
      - `prefer`: at least two items; rounds within n·(n−1)/2; tags present; `{other}`
        rejected in every other block's templates;
      - `combine`, per D155: rows vs `{row:…}` both ways, exactly one item row, `for`
        within the selection, an option per row for every item, an agreeing combination
        for every item.

      Every check runs at every size.
      *Check:* new cases in `src/shared/validate.test.ts`, one per rule, each asserting
      its named error text, pass.

## 2. Logic

- [x] 2.1 `src/shared/blocks/reveal.ts` per D151.
      *Check:* `reveal.test.ts` covers:
      - peek then reveal, and reveal without a peek;
      - moving on refused before the reveal and with the wrong id;
      - completion without a final tap;
      - the key marking the current item.
- [x] 2.2 `src/shared/blocks/dialogue.ts` per D152.
      *Check:* `dialogue.test.ts` covers:
      - lines revealed in order and capped at the last;
      - a swap at any time, which leaves the lines alone;
      - moving on refused until every line is shown;
      - completion;
      - the key's done / current / open marks.
- [x] 2.3 `src/shared/blocks/talk.ts` per D153.
      *Check:* `talk.test.ts` covers:
      - `new` always asking at level 1;
      - `harder` climbing and capping at the last level;
      - no repeat within a level until it is exhausted, then a wrap;
      - completion on the first last-level question;
      - the same orders for the same seed.
- [x] 2.4 `src/shared/blocks/prefer.ts` per D154.
      *Check:* `prefer.test.ts` covers:
      - every round a different pair of two different items;
      - choosing only from the current pair;
      - moving on only with the chosen id;
      - completion;
      - the rendered sentence for both choices of a pair.
- [x] 2.5 `src/shared/blocks/combine.ts` per D155. Export the agreeing-combination finder
      that both validation and the view use.
      *Check:* `combine.test.ts` covers:
      - choosing an item clearing a pick that no longer belongs;
      - a pick refused for an excluded item;
      - `hear` refused while a row is empty;
      - completion when every item is heard;
      - the mood check;
      - the finder returning only agreeing picks.
- [x] 2.6 Register all five in `src/shared/blocks/index.ts` and add their lines to
      `speakable.ts`:
      - `reveal`: `speak` per item;
      - `dialogue`: every line per item;
      - `talk`: every question;
      - `prefer`: every ordered pair;
      - `combine`: nothing, with the exception's comment.

      In `speakable.test.ts`, list `combine` beside `finish` as deliberately recordless.
      *Check:* `npm run typecheck` passes. `blocks.test.ts` and `answer-key.test.ts` cover
      19 types.

## 3. Views

- [x] 3.1 `RevealView`: the blur by stage; an empty `alt` and "A hidden picture" while
      blurred; *Peek*, *Reveal*, the line, and *Next →* except on the last item.
      *Check:* `reveal-view.test.tsx` asserts:
      - before the reveal, the markup contains neither the item's word nor its picture's
        alt;
      - the line is volunteered only on the transition to revealed.
- [x] 3.2 `DialogueView`: the role labels with Teacher / Student, *Swap roles*, the lines
      so far each with its role and a 🔊, *Next line*, and *Next →* after the last line.
      *Check:* `dialogue-view.test.tsx` asserts:
      - the labels move on a swap;
      - the new line is volunteered;
      - the 🔊 replays with `'demand'`.
- [x] 3.3 `TalkView`: the level, the question, *New question*, *Harder*, and 🔊.
      *Check:* `talk-view.test.tsx` asserts:
      - the prompt before the first question;
      - the level label;
      - the question volunteered when asked.
- [x] 3.4 `PreferView`: the two pictures with their words, the sentence once chosen, and
      *Next pair →*.
      *Check:* `prefer-view.test.tsx` asserts the sentence names the chosen item first, and
      that it is volunteered.
- [x] 3.5 `CombineView`: one chip row per declared row (the item row with pictures); the
      built sentence; the mood question; *🔊 Hear it* (with `'demand'`); *🎲 Surprise me*,
      which dispatches the item tap and one pick per row.
      *Check:* `combine-view.test.tsx` asserts:
      - a per-item option hidden for another item;
      - the mood question shown only on a mismatch;
      - *Surprise me* dispatches a full, agreeing set of taps;
      - *Hear it* speaks with `'demand'`.
      *Note (3.1–3.5):* the five views' checks live in one file,
      `src/blocks/conversation-views.test.tsx`, sharing `src/blocks/view-harness.tsx`,
      rather than five files.
- [x] 3.6 Register the five views. Append their styles to `blocks.module.css`.
      *Check:* `npm run typecheck` and `npm test` pass, and the CSS diff is additions only.

## 4. The harness, the fixture and the guide

- [x] 4.1 Teach `tests/support/play.ts` all five types.
      *Check:* `tests/playthrough.test.ts` fails with one of them added to a lesson before
      this task, and passes after it.
- [x] 4.2 Add one block of each type to the fixture, and update the star and slide counts
      that move.
      *Check:* `npm test` passes.
- [x] 4.3 Add five rows to the guide's exercise table. The role-play row says the swap
      only relabels.
      *Check:* `src/ui/guide.test.tsx` passes.

## 5. The lessons (D156)

- [x] 5.1 Make the edits of D156 in the four lessons, by targeted text edits that keep the
      files' formatting.
      *Check:*
      - `npm test` passes, including playthrough at every size;
      - `git diff --stat lessons/` is in the low hundreds of lines, not a reformat;
      - a scratch assertion shows `fruit/a` and `fruit/b` carry `reveal` and `dialogue`
        but not `prefer`, `talk` or `combine`.
- [x] 5.2 `npm run audio`.
      *Check:*
      - it records only new clips, and no combined sentence is among them;
      - `tests/clips.test.ts` shows no line without a clip apart from the combiner's.
      *Note:* 70 clips recorded. The script also lists 11 clips no line uses any more — the
      phrases stand-ins this change replaced. They are left in place, not deleted.
- [x] 5.3 Headless smoke, Playwright, no visible browser, every size of the four topics:
      - peek and reveal one picture;
      - play one dialogue through with a swap;
      - climb Talk Time to the last level;
      - choose one preference;
      - build one sentence including a mood mismatch, then *Surprise me*, then *Hear it*.

      *Check:* screenshots of each, and no console errors.
- [x] 5.4 Headless room smoke: teacher and student pages. Reveal a picture, swap roles,
      climb a talk level, and build a combination on the teacher's side.
      *Check:* the student's page follows each step, and shows no word of the blurred item
      before it is revealed.

## 6. Finish

- [x] 6.1 Run the full gate.
      *Check:* `npm run typecheck`, `npm test` and `npm run build` pass. Paste the summary
      lines.
- [x] 6.2 Update the docs:
      - `README.md`: five rows in the block table; `{other}` and `{row:…}` in the template
        list; the combiner's device voice in the "Every word is spoken" paragraph;
      - `docs/PLAN.md` §9: 2b and 2c delivered, and what remains absent;
      - `docs/PLAN.md` §12: the product decisions — the combiner's device voice, the swap
        that only relabels, the sentence that stops at the full stop, no glosses on chips.

      *Check:* §12 numbers on from D-57.
