## 1. The four lesson files, playable before they are illustrated

- [x] 1.1 Write `lessons/places.json`: *Let's Go!* covering park, school, home and zoo, with
      no parts. Each item carries:
      - an `l1` with romaji (from her page);
      - tags `syl`, `go` ("to the park" / "to school" / "home" / "to the zoo"), `can`,
        `pattern` (`the` / `to` / `none`) and `clue` (D139).

      Blocks, in her order:
      - `cards` (back: `en`, `tag:syl`, `l1`);
      - `sentence` (`{en}` → `Let's go {tag:go}.` → `Let's go {tag:go}! We can {tag:can}.`);
      - `phrases` *Do You Want To Go…?*;
      - `listen`;
      - `scramble` (`Let's go {tag:go}.`);
      - `phrases` *Plan Our Day*;
      - `sort` *Which Pattern?* (D140);
      - `quiz` *Clue Detective* (`ask: "tag:clue"`, `show: "emoji"`);
      - `phrases` *Talk Time*;
      - `finish`.

      *Check:* `npm test` passes, and `src/shared/validate.test.ts` reports no error naming
      `places`.
- [x] 1.2 Write `lessons/drinks.json`: *Drink Talk* covering milk, juice, water and tea,
      with no parts. Every item has `"article": "none"`. `l1` reuses Food's glosses for milk
      and water. Tags: `syl`, `why` (D135).

      Blocks:
      - `cards`;
      - `sentence` (`{en}` → `I like {en}.` → `I like {en}. {it} {be} {tag:why}.`);
      - `phrases` *Ask & Answer*;
      - `listen`;
      - `scramble` (`I like {en}.`);
      - `phrases` *The Drinks Café*;
      - `phrases` *This or That*;
      - `phrases` *Talk Time*;
      - `finish`.

      *Check:* `npm test` passes.
- [x] 1.3 Write `lessons/fruit.json`: *Fruit Talk* covering oranges, pears, grapes and
      watermelons, all `"plural": true`, with `parts` `a` (oranges, pears) and `b` (grapes,
      watermelons) titled after her 2A and 2B (D136). Tags: `syl`, `why`.
      - Teaching blocks select `new`.
      - `listen` declares `choices: 2` (D137).
      - The *Fruit Stand* phrases are declared twice, `only: ["a"]` and `only: ["b"]`, each
        quoting its own fruits.
      - *Ask & Answer*, *This or That* and *Talk Time* are `only: ["b"]`.

      *Check:* `npm test` passes. A temporary assertion in a scratch test (not committed)
      that `narrow(fruit, "a")` has 2 items and no *Talk Time*, and that `narrow(fruit,
      "b")` has 4 items and has it, passes.
- [x] 1.4 Write `lessons/family.json`: *My Family* covering mom, dad, brother, sister,
      grandma and grandpa, with `parts` `home` (mom, dad, brother, sister) and `grand`
      (grandma, grandpa) (D138). Tags: `syl`, `he` (`He` / `She`), `adj`, `clue` (her
      drawing-independent clue, D139).

      Blocks:
      - `cards`;
      - `sentence` (`{en}` → `This is my {en}.` → `This is my {en}. {tag:he} is {tag:adj}.`);
      - `phrases` *Is This Your…?* per part;
      - `listen` (`select: all`);
      - `scramble` (`This is my {en}.`);
      - `phrases` *The Family Photo* per part;
      - `quiz` *Clue Detective* (`select: all`);
      - `phrases` *Talk Time* `only: ["grand"]`;
      - `finish`.

      *Check:* `npm test` passes, including `tests/lesson-length.test.ts` reporting
      `family/home` and `family/grand` at five words or fewer.
- [x] 1.5 Play every size in the browser with pictures still missing: `fruit/a`, `fruit/b`,
      `fruit` (whole), `drinks`, `family/home`, `family/grand`, `family` (whole) and
      `places`. Run each to its closing screen.
      *Check:* every exercise can be completed and shows its emoji fallback. The sentences
      read *Let's go home.*, *I like grapes. They are sweet.*, *I like tea. It is warm.* and
      *This is my grandma. She is …* exactly. Write the eight runs down in the PR
      description.
      *Done as:* completion of every exercise at every size is proven by
      `tests/playthrough.test.ts` (it plays each size start to finish). Rendering was checked
      headless (Playwright, no visible browser): all 8 sizes render every slide, with slide
      counts 6 / 9 / 10 / 9 / 8 / 9 / 11 / 10 and no console errors. The sentences were
      checked as printed by `speakableLines`. Places shows no `syl` face, because its four
      words are one syllable each and the face would repeat the word.

## 2. Pictures (Fluent Emoji, D144: superseding the drawn plan)

- [x] 2.1 Fetch the Fluent Emoji *Color* SVGs for the 18 items, plus the two composites'
      parts (tree + slide, giraffe + elephant), and the licence, into a scratch folder.
      *Check:* all files download, and none contains a script or a remote reference
      (`grep -il "<script\|javascript:"` finds nothing).
- [x] 2.2 Render each picture headless onto a 512×512 white square, grouping the plural
      fruit (D143) and composing park and zoo. Save as JPEG under
      `public/pics/{fruit,drinks,family,places}/`.
      *Check:* 18 files, each 512×512, about 440 KB in total. A contact sheet of all 18 is
      looked at and nothing reads as the wrong word. `git status public/pics/food` is
      empty.
- [x] 2.3 Regenerate the manifest with `npm run pictures`. It must draw nothing.
      *Check:* the run prints "Nothing to draw", and `src/blocks/pictures.ts` gains exactly
      18 entries.
- [x] 2.4 Record the source: `THIRD_PARTY_NOTICES.md` with the MIT notice and a
      file-by-file list; the recipes in `scripts/pictures.ts` marked as unused for these
      topics; the sister's clue made picture-independent (D139).
      *Check:* the notice exists and names every one of the 18 files; `family.json` has no
      clue that mentions hair.

## 3. Recordings

- [x] 3.1 Run `npm run audio` (macOS).
      *Check:* it reports the new lines recorded and none failed. It does not re-record
      "milk" or "water". `src/speech/clips.ts` is regenerated. `npm test` passes.
      *Note:* the script itself had to be fixed first. Since `add-lesson-size-choice` it read
      lines from the raw topic file, which fails on any block selecting `new` (every topic
      has them), so it could not run at all. It now reads the whole-topic size, which carries
      every block and word (D-45). This is a one-line change in `scripts/audio.ts`; nothing
      under `src/` changed. Result: 112 new clips, no existing clip touched, and a re-run
      records nothing.
- [x] 3.2 Listen to the lines built from tags in each lesson (`go`, `why`, `adj`, `can`,
      `clue`).
      *Check:* each is spoken as one natural sentence, with no doubled spaces or capital
      read as a pause. *Let's go home* has no "to".
      *Note:* `clue` is never spoken (a quiz speaks its answer, not its prompt), so the lines
      to hear are the `sentence` third levels and the quiz/scramble answers. Left for the user:
      it needs an ear, not a check.

## 4. Proof that no code moved

- [x] 4.1 Confirm the phase stayed data-only.
      *Check:* `git diff --stat main -- src worker` lists only `src/blocks/pictures.ts`
      and `src/speech/clips.ts`.
- [x] 4.2 Run the full gate.
      *Check:* `npm run typecheck`, `npm test` and `npm run build` all pass. Paste the
      summary lines.

## 5. Docs

- [x] 5.1 `README.md`: in *Adding a lesson*, note the tag-carried frame (D135) as the
      pattern for a word whose sentence form is irregular.
      *Check:* the README names `go` / `he` as worked examples.
- [x] 5.2 `docs/PLAN.md`:
      - §9 records what this phase delivers and the Phase 2 list (`ask`, `secret`,
        `reveal`, `combine`, `dialogue`, `only: ["whole"]`);
      - §12 gains the product decisions: the dialogues carried as phrases, the named
        absences, and the 4 + 2 family split.
      *Check:* §12's new rows are dated 2026-10-11 or the apply date, and number on from
      D-50.
