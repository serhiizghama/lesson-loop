## Why

One piece of the teacher's own material still cannot be taught here. Her Body Parts
lesson labels a drawing of a body — tap a word, tap the spot it belongs to — and it is one
of the three exercises `lesson-format` still carves out by name ("other than the labelled
body diagram, the drill in which the teacher awards a star for a spoken attempt, and the
exercise in which the learner draws a shape"). Of those three, the diagram is the one the
engine can now afford: the other two need a way for the teacher to score a person and a
block built on the ink, and this needs a drawing. A year of vocabulary about a body is
still being taught on cards that show a nose floating on its own.

The second problem is shape, not coverage. The engine has nine exercises — `cards`,
`match`, `sentence`, `sort`, `listen`, `tpr`, `phrases`, `quiz`, `describe` — and
`add-shapes-and-shorter-lessons` widened what a lesson can *ask* considerably: a quiz asks
by a tag and answers with a picture, a description asks two questions and adds them up
into a sentence. What none of them does is ask a child to hold something in their head, or
to build English rather than choose it. Every one of the nine shows the answer somewhere on
the screen at the moment it is asked for, and the two that produce a sentence — `sentence`
and `describe` — render the finished line for the child to read. Nothing trains recall, and
nothing asks for assembly.

Three types close both gaps and are the ones PLAN §5 already names in its backlog:

- **`hotspot`** puts vocabulary back where it lives — a nose on a face, not a nose on a
  card — and finally makes her body diagram expressible.
- **`memory`** is the first exercise whose answer is not on screen when it is asked for:
  the words are face down, and finding a pair means remembering where its half was.
- **`scramble`** is the first exercise where the child assembles a sentence word by word
  instead of choosing a ready-made one. Producing "This is my nose." from four loose words
  is a different skill from reading it.

Five decisions were taken with the client's students in mind and are fixed:

- **A diagram is drawn by the app, placed by the lesson.** The app carries a small
  catalogue of named scenes (`body` is the first); a lesson names one and says which item
  sits in which rectangle of it. This qualifies "lessons are data, never code" (D-3): a new
  lesson on an existing diagram is still data alone, but a **new** diagram is a file in
  `src/scenes/` and a deploy. It is the same line D-38 already drew for the shapes, which
  are exact SVG in the app rather than borrowed glyphs; the alternative — the drawing
  itself inside the lesson JSON — was rejected in design.
- **The scene is drawn to be tapped, not merely to be looked at.** The exercise stage is
  laid out at a fixed reference width and scaled down to the screen (D-35), so a rectangle
  a child must hit on a phone is worth about four tenths of its size in the layout. A part
  the scene draws too small to hit is a defect in the scene, not something the lesson
  author compensates for by drawing an anatomically wrong nose.
- **`memory` is cooperative: no turns, no score per side** — which is a deliberate
  departure from the backlog entry that named it ("pairs, alternating turns,
  teacher-vs-student score"). An action in this model does not carry who sent it, so "the
  student's turn" would be a rule the app displays and cannot enforce, and enforcing it
  would mean putting identity into the reducer for one exercise. The two players find the
  pairs together; the exercise counts tries, and nothing else. Turn-taking can be added
  later as its own change if a real lesson asks for it.
- **`scramble` builds from a template, per item**, the way `tpr` and `sentence` already
  do: the block declares `"{this} {be} my {en}."` and the engine renders it for every
  word of the lesson. No free text enters the lesson format — `phrases` remains the one
  place literal English is written out (D119), and it is that because a model phrase is a
  fact about English rather than about an item.
- **Every new type is used by a real lesson in this change.** A block type nobody teaches
  with is untested where it counts.

## What Changes

- **`hotspot`** — a scene is drawn with the selected items' labels beside it. Tap a word,
  then tap the place on the drawing it names: a correct placement sticks and the label
  settles on the spot, a wrong one is refused with the same shake a wrong sort gets. The
  exercise is complete when every selected item is placed. A block MAY declare a line
  spoken on a correct placement, as `match` does for a completed pair.
- **`memory`** — the selected items are laid out face down, twice each: once by one face,
  once by another (a picture and its word by default). Tapping a card turns it up and
  speaks what it shows; turning up two that belong together locks them face up, and a
  block MAY declare the line spoken when a pair closes. Two that do not belong together
  stay up until the next tap turns them back — the app has no clock and needs none. The
  exercise is complete when every pair is found.
- **`scramble`** — one item at a time, the sentence the block declares is rendered for it
  and its words are offered shuffled. Tapping the next correct word places it; any other
  word is refused with feedback and nothing is lost. When the sentence is whole it is
  spoken, and a tap moves on to the next word of the lesson. The exercise is complete when
  every item's sentence has been built.
- **The three land in her lessons**: Body Parts gains **Label the Body** (`hotspot`, on
  the `body` scene) and **Build It** (`scramble`, `{this} {be} my {en}.`); Animals part two
  gains **Memory** (`memory`, picture against word) — part two because a memory board wants
  a spread of words and a later part carries the whole vocabulary (D-37).
- **The format gains three block shapes and their validation**: an unknown scene, a spot
  outside the drawing, a selected item with no spot, two items sharing one spot, a template
  naming a tag an item does not carry, a sentence that renders to a single word — each is a
  named error before anything is rendered, as every other block's mistakes already are.
- **The teacher gets an answer key for each**, computed from lesson data like the rest and
  in the same uniform shape the panel already renders: where each word goes on the diagram
  (named in plain words — "top · centre"), where the two halves of each pair are lying, and
  the sentence being built.
- Deliberately **not** in scope: turns and per-side scoring in `memory`; a second scene;
  sentences in a `scramble` block that are not tied to a vocabulary item; taking a placed
  word back (nothing wrong can be placed, so there is nothing to undo); drag-and-drop
  anywhere; re-cutting Body Parts to five words (D-36's remaining work, which this change
  is written to survive); any change to the nine existing types, to the action set, to the
  ink, to the room protocol or to the player.

## Capabilities

### New Capabilities

None. Three exercises belong with the other nine, and the scene catalogue is part of what a
lesson may declare — neither is a capability of its own.

### Modified Capabilities

- `exercise-blocks`: gains one requirement per new exercise — what it presents, what
  counts as right, what a wrong answer does, and when it is complete. Its existing "an
  exercise speaks unasked only while the lesson's sound is on" requirement grows to name
  the three new places the app volunteers a line: a turned-up card, a labelled spot, a
  finished sentence. Its existing "every exercise is driven by tapping" requirement gains
  the rule that makes a small drawn part hittable, and loses the count of exercises it
  still states as six.
- `lesson-format`: gains the three block declarations and the rules that make them valid,
  and gains the scene catalogue — that a diagram is named by the lesson and drawn by the
  app, and what that costs. Its "the format covers the teacher's existing material"
  requirement loses one of its three named exceptions: the labelled body diagram is no
  longer carved out, while the teacher-scored speaking drill and the self-marked drawing
  stay deferred by name (D-39).
- `teacher-view`: its answer-key requirement gains the three new keys and the rule that a
  key naming a position says it in words, so the panel still renders a key it has never
  seen before without a per-type branch.

## Impact

- **Changed:** `src/shared/types.ts` (three block shapes, three state shapes),
  `src/shared/validate.ts` (their schemas and cross-checks),
  `src/shared/blocks/index.ts` and `src/blocks/index.ts` (two registries),
  `src/shared/blocks/speakable.ts` (the lines the three can speak),
  `src/shared/__fixtures__/lesson.ts` (a block of each new type),
  `src/blocks/blocks.module.css`, `lessons/body-parts.json`, `lessons/animals-2.json`,
  `README.md`, `docs/PLAN.md`.
- **New:** `src/shared/blocks/hotspot.ts`, `memory.ts`, `scramble.ts` (logic and answer
  keys), `src/blocks/HotspotView.tsx`, `MemoryView.tsx`, `ScrambleView.tsx`,
  `src/shared/scenes.ts` (the scene names and their coordinate space — data, no React) and
  `src/scenes/` (the artwork, starting with the body).
- **Unchanged:** `src/shared/reducer.ts`, the action set, `LessonState`'s shape, the room
  protocol, `src/shared/room.ts`, the ink (`src/shared/ink.ts` and the layer over the
  stage), the Worker, `src/ui/LessonPlayer.tsx`, `src/ui/TeacherPanel.tsx` and
  `src/speech/`. The three exercises are expressed in the actions and the block contract
  that already exist; nothing new crosses the socket and no dependency is added.
- **Recordings:** the lines these three blocks speak are deliberately lines the lessons
  already speak — `{this} {be} my {en}.` is already a level of Body Parts' sentence block,
  and Animals' pair line and plain words are already recorded — so `npm run audio` should
  produce no new clip. That is a check, not an assumption: it is run and its diff inspected
  (D52).
- **Tests:** each new logic module gets its own tests (init, every refusal, completion,
  the answer key), the block-contract and answer-key tests gain their three cases,
  `speakable.test.ts`'s existing sweep over `Object.keys(blockLogic)` picks the three up by
  itself and holds the views to what they actually speak, `validate.test.ts` gains the new
  rejections, and each view gets a rendering test.
- **Docs:** `README.md`'s block table gains three rows and a note on scenes; `docs/PLAN.md`
  §4 loses the body-diagram deferral, §5 moves the three out of the backlog and records
  that `memory` arrives without the turns that entry imagined, §8's tree lists
  `src/scenes/`, §9 records what this leaves of v0.2, and §12 gains the product decisions
  above as **D-40** onwards.
- **Ordering:** this is the only open change; `add-drawing-overlay` is archived and its
  specs synced. The fixed, scaled stage it introduced (D-35) is a constraint on all three
  new views rather than a conflict, and the ink layer needs no work: a mark belongs to a
  block id and these are three more block ids. What this change does **not** settle is
  D-36's remaining work — Body Parts is still a ten-word lesson due to be cut in two — so
  both new Body Parts blocks are written to be split along with it rather than to depend on
  its ten items.
