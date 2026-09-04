## Why

One piece of the teacher's own material still cannot be taught here. Her Body Parts
lesson labels a drawing of a body — tap a word, tap the spot it belongs to — and it was
the single exercise the v0.1 format was allowed not to cover (`lesson-format`: "other
than the labelled body diagram"). Everything else she had was expressed in data; that one
was deferred, and a year of vocabulary about a body is still being taught on cards that
show a nose floating on its own.

The second problem is shape, not coverage. All six exercises ask the same thing of a
child: *recognise this and put it somewhere*. Nothing asks them to remember what they saw
a moment ago, and nothing asks them to **produce** English — the sentence exercise renders
a finished sentence for them to read. By the third lesson on the same six mechanics a
seven-year-old is no longer surprised by anything, and v0.2 is about to add four to six
more lessons on top of that.

Three types close both gaps and are the ones PLAN §9 already names:

- **`hotspot`** puts vocabulary back where it lives — a nose on a face, not a nose on a
  card — and finally makes her body diagram expressible.
- **`memory`** is the first exercise that trains recall rather than recognition: the words
  are face down, and finding a pair means remembering where its half was.
- **`scramble`** is the first exercise where the child assembles a sentence word by word
  instead of choosing a ready-made one. Producing "This is my nose." from four loose words
  is a different skill from reading it.

Four decisions were taken with the client's students in mind and are fixed:

- **A diagram is drawn by the app, placed by the lesson.** The app carries a small
  catalogue of named scenes (`body` is the first); a lesson names one and says which item
  sits in which rectangle of it. This qualifies "lessons are data, never code": a new
  lesson on an existing diagram is still data alone, but a **new** diagram is a file in
  `src/scenes/` and a deploy. The alternative — the drawing itself inside the lesson JSON
  — was rejected in design.
- **`memory` is cooperative: no turns, no score per side.** An action in this model does
  not carry who sent it, so "the student's turn" would be a rule the app displays and
  cannot enforce — and enforcing it would mean putting identity into the reducer for one
  exercise. The two players find the pairs together; the exercise counts tries, and
  nothing else. Turn-taking can be added later as its own change if a real lesson asks
  for it.
- **`scramble` builds from a template, per item**, the way `tpr` and `sentence` already
  do: the block declares `"{this} {be} my {en}."` and the engine renders it for every
  word of the lesson. No free text enters the lesson format.
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
  the `body` scene) and **Build It** (`scramble`, `{this} {be} my {en}.`); Animals gains
  **Memory** (`memory`, picture against word).
- **The format gains three block shapes and their validation**: an unknown scene, a spot
  outside the drawing, a selected item with no spot, a template naming a tag an item does
  not carry — each is a named error before anything is rendered, as every other block's
  mistakes already are.
- **The teacher gets an answer key for each**, computed from lesson data like the rest:
  where each word goes on the diagram (named in plain words — "top · centre"), where the
  two halves of each pair are lying, and the sentence being built.
- Deliberately **not** in scope: turns and per-side scoring in `memory`; a second scene;
  sentences in a `scramble` block that are not tied to a vocabulary item; taking a placed
  word back (nothing wrong can be placed, so there is nothing to undo); drag-and-drop
  anywhere; any change to the six existing types, to the action set, to the room protocol
  or to the player.

## Capabilities

### New Capabilities

None. Three exercises belong with the other six, and the scene catalogue is part of what a
lesson may declare — neither is a capability of its own.

### Modified Capabilities

- `exercise-blocks`: gains one requirement per new exercise — what it presents, what
  counts as right, what a wrong answer does, and when it is complete — and its existing
  "an exercise speaks unasked only while the lesson's sound is on" requirement grows to
  name the three new places the app volunteers a line: a turned-up card, a labelled spot,
  a finished sentence.
- `lesson-format`: gains the three block declarations and the rules that make them valid,
  and gains the scene catalogue — that a diagram is named by the lesson and drawn by the
  app, and what that costs. Its "the format covers the teacher's existing material"
  requirement loses its exception: the labelled body diagram is no longer carved out.
- `teacher-view`: its answer-key requirement gains the three new keys, so the panel still
  renders a key it has never seen before without a per-type branch.

## Impact

- **Changed:** `src/shared/types.ts` (three block shapes, three state shapes),
  `src/shared/validate.ts` (their schemas and cross-checks),
  `src/shared/blocks/index.ts` and `src/blocks/index.ts` (two registries),
  `src/shared/blocks/speakable.ts` (the lines the three can speak),
  `src/blocks/blocks.module.css`, `lessons/body-parts.json`, `lessons/animals.json`,
  `README.md`, `docs/PLAN.md`.
- **New:** `src/shared/blocks/hotspot.ts`, `memory.ts`, `scramble.ts` (logic and answer
  keys), `src/blocks/HotspotView.tsx`, `MemoryView.tsx`, `ScrambleView.tsx`,
  `src/shared/scenes.ts` (the scene names and their coordinate space — data, no React) and
  `src/scenes/` (the artwork, starting with the body).
- **Unchanged:** `src/shared/reducer.ts`, the action set, `LessonState`'s shape, the room
  protocol, `src/shared/room.ts`, the Worker, `src/ui/LessonPlayer.tsx`,
  `src/ui/TeacherPanel.tsx` and `src/speech/`. The three exercises are expressed in the
  actions and the block contract that already exist; nothing new crosses the socket and no
  dependency is added.
- **Tests:** each new logic module gets its own tests (init, every refusal, completion,
  the answer key), the existing block-contract and answer-key tests cover nine types
  instead of six, `speakable.test.ts` holds the three views to what they actually speak,
  `validate.test.ts` gains the new rejections, and each view gets a rendering test.
- **Docs:** `README.md`'s block table gains three rows and a note on scenes; `docs/PLAN.md`
  §5 moves them out of the backlog, §9 records what this delivers of v0.2, and §12 gains
  the product decisions above.
- **Ordering:** `add-star-trail` is proposed and unimplemented. The two changes are
  independent — this one touches neither the player nor the reducer — and the only file
  both open is `blocks.module.css`, append-only in each. The new types are scored, so they
  enter the star trail with no work when that change lands, in whichever order.
