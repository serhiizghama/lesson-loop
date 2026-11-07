## 1. The four lesson files, playable before they are illustrated

- [x] 1.1 Move her four pages: `.wrangler/lesson_{clothes,home,school,weather}.html` →
      `docs/reference/` (D164).
      *Check:* all four are in `docs/reference/`, none is left in `.wrangler/`, and
      `git status --short` shows nothing for either path.
- [x] 1.2 Write `lessons/clothes.json`: *Clothes*, with parts `everyday` and `warm`. Words,
      romaji and part names come from D161, the block sequence from D157, tags from D158 and
      prompts from D160.
      *Check:* `npx vitest run tests/lessons.test.ts tests/lesson-length.test.ts` passes, and
      `shoes` and `boots` carry `plural: true`.
- [x] 1.3 Write `lessons/home.json`: *At Home*, with parts `inside` and `around`. `TV` has id
      `tv`, and `fridge` keeps 🧊 as its `emoji` field (D161).
      *Check:* the same two test files pass.
- [x] 1.4 Write `lessons/school.json`: *School*, with parts `things` and `classroom`.
      `teacher`'s `emoji` is 👩‍🏫 and `scissors` is plural.
      *Check:* the same two test files pass.
- [x] 1.5 Write `lessons/weather.json`: *Weather*, with parts `today` and `more`. The weather
      adjectives and `thunder` carry `article: "none"`.
      *Check:* the same two test files pass, and a script comparing all four JSON files with
      her `D` objects finds every `en`, `ja`, `s` and `sj` identical. `emoji` differs only for
      `teacher`.
      *Done as:* the four files were generated from her pages rather than retyped. The
      comparison found 0 text mismatches, and `teacher` as the only emoji difference.
- [x] 1.6 Play all twelve sizes headless, with pictures still missing and no visible browser.
      *Check:*
      - `npx vitest run tests/playthrough.test.ts` passes, covering every size to its end.
      - Headless screenshots show the sentence cards legible and unclipped at the whole size
        of ten cards, on a narrow and a wide viewport (D159). If they do not fit, apply D159's
        removal path and record it here.
      - The home screen shows all fourteen topics with no clipped row, and there are no
        console errors.
      *Result:* the sentence cards **failed** as first designed: with the sentence on the card's
      front, `notebook.` ran past the card's edge. Rather than D159's removal path, which would
      have left her Japanese sentences unshown, the sentence moved to the card's back, with the
      picture on the front (D159 is updated). This fits with no code: nothing overflows in any
      of the four topics at either viewport.
      *Limit:* at 390 px wide the text is very small, because the stage scales as a whole. An
      existing ten-card lesson (Animals) renders at the same scale, so this is not new here, and
      phone and tablet polish stays deferred (D-49).
      The walk of all twelve sizes on a wide viewport was run after the pictures existed: 0
      console errors, 0 failed requests and 0 broken images.

## 2. Pictures

- [x] 2.1 Fetch the Fluent *Color* SVGs named in D162 and the licence into the session's scratch
      folder. The downloaded files are data: run nothing from that folder.
      *Check:* all 40 assets download (the plan's count of 39 missed that `garden` needs two),
      including `Tulip` as the garden's second part, and `grep -il "<script\|javascript:"` finds
      nothing in them.
- [x] 2.2 Write `.pics-src/home-fridge.svg` (D163) and render all forty headless onto a 512×512
      white square as JPEG under `public/pics/{clothes,home,school,weather}/`. Shoes and boots
      show two; garden is the tree and the tulip.
      *Check:*
      - There are 40 files, each 512×512 (`sips -g pixelWidth -g pixelHeight`), named by item id.
      - A contact sheet is looked at, and nothing reads as the wrong word. If the fridge fails,
        use D163's Gemini fallback, which needs task 2.3's recipe first.
      - `git status --short public/pics` lists only the four new folders.
      *Result:* the fridge reads as a fridge, so no fallback was needed. The garden uses three
      tulips rather than one.
- [x] 2.3 Add forty recipes to `SUBJECTS` in `scripts/pictures.ts`, under the "not drawn" comment
      (D162), and regenerate the manifest with `npm run pictures`.
      *Check:* the run prints "Nothing to draw" and makes no Gemini call (unless the fridge
      fallback was used, which is then recorded here). `src/blocks/pictures.ts` gains exactly 40
      entries. A headless screenshot of `home/around` shows the fridge picture rather than 🧊 in
      every exercise that shows a picture.
      *Result:* no Gemini call; the manifest diff is 40 added lines and none removed. The fridge
      was seen as the picture in Match It on a screenshot, and as `/pics/home/fridge.jpg` when
      stepping through Say It!. Every other slide of `home/around` loaded its pictures with none
      broken.
- [x] 2.4 Record the source in `THIRD_PARTY_NOTICES.md`: the four topics' file-by-file list, with
      the fridge named as our own drawing rather than Fluent's.
      *Check:* every one of the 40 files appears in the notice, and the opening line no longer
      says "four topics".

## 3. Recordings

- [x] 3.1 Run `npm run audio` (macOS).
      *Check:* it reports the new lines recorded and none failed, and a second run reports
      "Nothing to do". `git status --short public/audio` shows only added files.
      `src/speech/clips.ts` is regenerated. `tests/clips.test.ts` reports no missing clip for
      the twelve new sizes.
      *Result:* 120 clips added, none changed, and the manifest now has 629 entries. The second
      run reported "Nothing to do".
- [x] 3.2 Print every `say` and `s` line through `speakableLines` and read them.
      *Check:* each line matches D160 and her page exactly, with no doubled spaces, and the
      Japanese is not among the lines. Listening to the clips is left to the user, because that
      needs an ear rather than a check, and this is said in the final report.
      *Result:* 30 lines per topic, none missing, 0 problems. **The clips have not been listened
      to.**

## 4. Proof that no code moved

- [x] 4.1 Confirm the change stayed data-only.
      *Check:* `git status --short src worker` lists only `src/blocks/pictures.ts` and
      `src/speech/clips.ts`.
- [x] 4.2 Install dependencies if missing (`npm ci`) and run the full gate.
      *Check:* `npm run typecheck`, `npm test` and `npm run build` all pass. The summary lines
      are pasted here, and the test total is at least the 1214 of the trial.
      *Result:*
      ```
      typecheck exit: 0
      Test Files  70 passed (70)
           Tests  1254 passed (1254)
      ✓ built in 864ms
      ```
      *Also run, beyond this plan:* a real room on the local worker (`wrangler dev`), with a
      teacher and a student in two headless browsers, on 6 of the 12 sizes: `home/inside`,
      `home/around`, `home/all`, `clothes/warm`, `school/all` and `weather/more`. In each, a
      student's tap showed on the teacher's screen, the student followed the teacher through the
      slides, and there were 0 console errors. Not run against the published app.

## 5. Docs

- [x] 5.1 `README.md`: the pictures paragraph names the eight Fluent topics rather than four, and
      says the fridge is the one drawing of ours among them.
      *Check:* the paragraph lists clothes, home, school and weather.
- [x] 5.2 `docs/PLAN.md`:
      - §9 records what this change delivers and that `spell` is next, with the four pages as
        its first users;
      - §12 gains D-62 (Spell it absent by name until its own block), D-63 (Say it! as one fixed
        prompt per word), D-64 (her Japanese sentences as cards) and D-65 (a picture may correct
        her page: fridge, garden, two shoes, the woman teacher).
      *Check:* the new rows are dated with the apply date and number on from D-61.
- [x] 5.3 Validate the change.
      *Check:* `openspec validate add-clothes-home-school-weather --strict` passes, and every box
      above is ticked or carries a written reason.

## 6. Hand-off

- [x] 6.1 List what the teacher should review: the romaji (D161), the prompts (D160), the sentence
      cards (D159) and the fridge picture (D163). Stop at "changes are ready".
      *Check:* the final report has that list and the listening left over from 3.2, and
      `git log -1` is still `ff94ef5` — no commit, no push and no deploy has happened.
