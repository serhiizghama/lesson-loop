## 1. The route and the way in

- [x] 1.1 Add `{ name: 'guide' }` to `Route` in `src/ui/router.ts`, parsed from the single
  segment `/guide`, and export `guidePath = '/guide'`. The fragment is left alone: on this
  route it names a section, not a teacher's key (design D6).
  *Check:* `npm test -- router` passes with new cases for `/guide`, `/guide/anything`
  (unknown) and `/guide#pacing` (the guide, key ignored).
- [x] 1.2 Render the route in `src/ui/App.tsx`: `route.name === 'guide'` returns `<Guide
  onExit={home} />`, placed before the `unknown` branch.
  *Check:* a test renders the app at `/guide` and finds the guide's heading; at
  `/guide/x` it finds "There is no such page".
- [x] 1.3 Put the way in in the teacher's panel (design D5, revised on the client's
  instruction): "📖 Teacher guide" in `TeacherPanel`, under Change lesson and above the
  answer key, as an `<a href="/guide" target="_blank">` styled in `src/ui/app.module.css`
  to sit with the controls while staying quieter than any of them.
  *Check:* a test renders the panel and finds the link; a second asserts it carries
  `target="_blank"`, so a live lesson is never navigated away from.
- [x] 1.4 Confirm no other screen offers it.
  *Check:* tests render the home screen, a solo lesson, a room's teacher view of the
  exercise and a room's student view, and assert none of them contains `/guide` or the
  words "Teacher guide".

## 2. The page: layout and navigation

- [x] 2.1 Create `src/ui/Guide.tsx` with the section model `{ id, title, body }` and a
  `SECTIONS` array, and derive the contents list from it so a section cannot exist without
  a navigation entry (design D2).
  *Check:* a test asserts the number of contents entries equals the number of `<section>`
  elements, and that every entry's `href` matches a section `id` present in the document.
- [x] 2.2 Create `src/ui/guide.module.css`: two columns on a wide window — the contents
  list sticky on the left, the text on the right — collapsing to one column with the
  contents first on a narrow one (spec: a wide window / a narrow window).
  *Check:* at the full window the contents list and the text are side by side; at 416 px
  the layout is one column, the list is `position: static` and first, and the page does
  not scroll sideways. The narrow width was measured in a real 420 px viewport — an iframe
  injected into the page, since this machine's window manager refuses a window resize —
  so the media query genuinely fired rather than being reasoned about.
- [x] 2.3 Section links are plain `<a href="#id">` anchors, and each `<section>` carries
  that `id` (design D6).
  *Check:* a test asserts every anchor's `href` resolves to an element with the matching
  `id`; opening `/guide#pacing` in the browser lands on that section (task 8.3).
- [x] 2.4 Give the page one way out, returning to the lessons, and the build line at its
  foot using the existing `buildLine(__APP_VERSION__, __BUILT_AT__)` (design D10).
  *Check:* a test clicks the way out and asserts the lesson list is shown; another asserts
  the build line's text is present.

## 3. The content, in eleven sections

Each section is one screen of reading. The whole guide is budgeted at about 1200 words
(design, Risks). Write the prose in the app's voice: second person, present tense, no
apology, no marketing.

- [x] 3.1 `what-it-is` — what the app is, that it is the second window beside the video
  call, that nothing is saved and no one signs in.
  *Check:* the section states all three, and names neither a technology nor a file.
- [x] 3.2 `start` — the five-minute start: pick a topic, pick the size, play it alone once,
  then invite. Five numbered steps, no more.
  *Check:* a teacher following only this section can reach a running room; walked through
  literally in task 8.3.
- [x] 3.3 `choosing` — topics, parts and the size choice: five words or the whole topic,
  what a later part carries and revises, and that the choice is hers per sitting.
  *Check:* the section matches what the home screen actually offers for `animals`, checked
  against the app side by side.
- [x] 3.4 `alone` — teaching with no student connected: the lesson is fully playable, all
  controls are hers, nothing is sent anywhere.
  *Check:* the section says the solo lesson needs no connection, and does not promise
  anything the app does not do offline.
- [x] 3.5 `two-links` — the room: how it is opened mid-lesson carrying the progress, which
  link is the student's, that her own link carries the answer key and must never be sent or
  screen-shared, that a student joining late lands where the lesson is, that changing
  lesson keeps the same student link. Carries the one drawn diagram (design D3), inline
  SVG, showing the two links and what each side sees.
  *Check:* the section names both link shapes, says plainly which one to send, and the
  diagram has a text alternative that says the same thing.
- [x] 3.6 `controls` — every control on the teacher's panel: moving between exercises,
  resetting one, changing lesson, the lock on the student's taps, the sound switch, whether
  the student may draw, whether the student is connected, and the answer key. One line
  each.
  *Check:* every control present in `src/ui/TeacherPanel.tsx` and `src/ui/InkToolbar.tsx`
  has a line, verified by reading the two files against the section.
- [x] 3.7 `pencil` — drawing on the exercise: pen, eraser, undo, clear, that marks are
  shared, that they belong to the exercise, and that the home and closing screens have no
  pencil.
  *Check:* the section agrees with `openspec/specs/shared-drawing/spec.md` on who may
  draw and what a mark belongs to.
- [x] 3.8 `exercises` — the reference table, built in section 4 below.
- [x] 3.9 `stars` — a star is for finishing, never for being right; a wrong answer is a
  shake and another try; the app celebrates without a word because she is the voice of the
  lesson; the closing screen shows the stars actually earned.
  *Check:* the section says mistakes are not counted, and does not claim the app praises
  the child.
- [x] 3.10 `connection` — what a lost connection looks like on each screen, that the
  exercise stays playable, that it reconnects by itself, and what she should do meanwhile
  (carry on; the student holds the exercise until it is back).
  *Check:* the wording matches the notice the app actually shows, read from
  `src/ui/RoomLesson.tsx`.
- [x] 3.11 `running-a-lesson` — how to run a sitting end to end, and what to do when
  something looks wrong: the room's limits (how many may join, that it is discarded after
  a few hours of quiet, that nothing is stored), a reload is safe, a fresh room is cheap,
  and the build line is what to quote when reporting a problem.
  *Check:* every limit stated matches `openspec/specs/synced-rooms/spec.md`.

## 4. The exercise reference

- [x] 4.1 Add the `EXERCISES` table to `src/ui/Guide.tsx`: one row per playable block type
  as `{ type, name, child, teacher }`, typed so that the `type` field is `BlockType`
  (design D2).
  *Check:* `npm run typecheck` passes and a misspelled type is a compile error.
- [x] 4.2 Write the twelve rows — `cards`, `match`, `sentence`, `sort`, `listen`, `tpr`,
  `phrases`, `quiz`, `describe`, `hotspot`, `memory`, `scramble` — each saying in one line
  what the child does and in one what the teacher does. `finish` is not an exercise and is
  described in `stars` instead.
  *Check:* each row is confirmed against that block's own view and its spec — `cards`
  and `match` were also played in the browser. **Not** all twelve were played by hand;
  the other ten were checked by reading `src/blocks/*.tsx` and
  `openspec/specs/exercise-blocks/spec.md` against the row.
- [x] 4.3 Render the table so it stays readable at 420 px — its own horizontal scroll
  container, or stacked rows, never a page that scrolls sideways.
  *Check:* at 420 px the page has no horizontal overflow (task 8.3).

## 5. The screenshots

- [x] 5.1 Capture eight screenshots from one window against `npx wrangler dev` with a real
  room, and save them to `public/guide/`: `home.jpg` (a topic card expanded, showing its
  sizes), `exercise.jpg` (an exercise in play with the star trail in the header),
  `teacher.jpg` (the teacher's view with the controls, the student link and the answer
  key), `student.jpg` (the same exercise as the student sees it), `locked.jpg` (the
  student's screen while locked), `pencil.jpg` (a mark drawn, with the ink toolbar),
  `stars.jpg` (the closing screen with the star actually earned), `offline.jpg` (the
  "working without sync" notice).
  *Check:* all eight files exist and each shows the state named above, confirmed by
  opening them. `invite.png` from the first draft is dropped: pressing Invite navigates
  straight to the teacher's view, so there is no invite screen to photograph — the button
  is visible in `exercise.jpg` and said so in its caption, and the eighth shot went to the
  lock, which is a screen she will have to recognise.
- [x] 5.2 Bring the set inside budget: every shot scaled to exactly 1000×564, ≤ 120 KB
  each and ≤ 600 KB in total (design D3).
  *Check:* `du -ch public/guide` reports **316 KB**, the largest file is 60 KB, and every
  file measures 1000×564.
- [x] 5.3 Add the `PICTURES` manifest to `src/ui/Guide.tsx` and render each with an `alt`
  that says what the picture shows, explicit `width`/`height`, and `loading="lazy"`.
  *Check:* a test asserts every rendered `img` has non-empty `alt` and both dimensions.
- [x] 5.4 Make the guide complete without its pictures.
  *Check:* a test renders the guide, collects the text with `figure` elements removed,
  and asserts each of the eleven sections still carries over 200 characters of prose. Not
  additionally read with images blocked in the browser — the test is the check.
- [x] 5.5 Write the re-capture recipe into `README.md` — the eight shots, the viewport, the
  lesson and the state each one is taken from (design D4).
  *Check:* someone following only the README can retake the same eight pictures.

## 6. The tests that keep it true

- [x] 6.1 `src/ui/guide.test.tsx` (beside the component, not under `tests/` — vitest
  collects only `tests/**/*.test.ts`, so a `.tsx` there would silently never run): every playable type in `blockViews` (all of it except
  `finish`) has a row in `EXERCISES`, and every row names a type the registry has.
  *Check:* the test passes; deleting a row makes it fail, naming the missing type.
- [x] 6.2 Same file: every file named in `PICTURES` exists under `public/guide/` and none
  of them is an absolute URL to another origin — the two assertions
  `tests/app-icon.test.ts` already makes for the icons.
  *Check:* the test passes; renaming a picture makes it fail, naming the file.
- [x] 6.3 Same file: the guide's rendered text contains none of the construction words
  (JSON, worker, reducer, repository, npm, localhost, commit, TypeScript), whole-word and
  case-insensitive, with the list declared in the test (design D8).
  *Check:* the test passes; adding "the Worker serves it" to a section makes it fail.
- [x] 6.4 Add the guide's route to whatever the existing suites walk, so the page is
  rendered at least once by the app's own tests rather than only in isolation.
  *Check:* `npm test` runs the guide through `App` at `/guide` and the run stays green.

## 7. Documentation

- [x] 7.1 `README.md`: a short section saying the guide exists, where it is, that it is the
  teacher's document while the README is the builder's, and that a new block type needs a
  row in it.
  *Check:* the README names `/guide` and the rule, and the re-capture recipe from 5.5 sits
  under the same heading.
- [x] 7.2 `docs/PLAN.md` §9: record the guide as delivered work, outside the v0.2 list.
  *Check:* §9 mentions it and does not claim it was a v0.2 item.
- [x] 7.3 `docs/PLAN.md` §12: add **D-50** — the app carries its own guide for the teacher,
  reachable from the home screen, held to the app by tests.
  *Check:* D-50 is the next free number (D-49 is the tablet-polish deferral) in the table and no other row is renumbered.

## 8. Verification

- [x] 8.1 `npx tsc --noEmit` and `npm run typecheck` pass.
  *Check:* both exit 0, output shown.
- [x] 8.2 `npm test` passes with no test removed or skipped, and `npm run build` succeeds.
  *Check:* **976 tests, 60 files, all passing** — 951 before the change plus 25 new (23 in
  `guide.test.tsx`, 2 in `router.test.ts`). The bundle was measured twice, once with the
  guide stubbed out: JS 370.50 → 389.19 kB (gzip 113.17 → 119.37), CSS 25.42 → 28.85 kB
  (gzip 5.71 → 6.53). **The guide costs about 7 kB gzipped**, against the 50 kB at which
  design D7 says to reconsider.
- [x] 8.3 Browser acceptance under `npx wrangler dev`, because tests hold the page in their
  hands while the app is reached by address.
  *Check:* done — the five steps of `start` were walked literally, opening a room from
  `/l/animals/known` and joining it as the student in a second tab (`/t/KA92#…` and
  `/r/KA92`, taps syncing both ways, "● synced ● student here"); every control in section
  3.6 was read off the panel in front of me; `/guide` was opened at the full window and at
  416 px; the anchors were followed and `#exercises` and `#two-links` landed on their
  sections; the console carried no errors.
  **One limitation, stated rather than glossed:** the Chrome window would not take a
  resize and was never the focused window, so `document.visibilityState` stayed `hidden`
  — lazily-loaded pictures then do not load and captures paint partially. Layout and
  loading were therefore measured from the DOM (all eight images `complete` with their
  natural size, every section's geometry, no horizontal overflow) rather than judged from
  a photograph of the page.
- [x] 8.4 Confirm the guide is inert: opening it makes no request to `/api` or `/ws`, plays
  no sound with the app's sound left on from a lesson, and offers no pencil.
  *Check:* done — 93 requests were recorded on a cold load of `/guide` and **not one goes
  to `/api` or `/ws`**; the rest are the development server's own modules, the icon and
  the manifest. No sound is possible and no pencil is offered because neither the player
  nor any lesson state is on this screen (design D9), which the tests assert by absence.
