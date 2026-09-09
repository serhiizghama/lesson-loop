## Why

The teacher sent back two HTML lessons of her own, and read together they say two
different things.

The first, `animals_lesson_two_parts.html`, is not a new lesson at all. It is the Animals
lesson we already ship, with the same ten animals, the same fields and the same seven
exercises — cut in half. Five words behind one tab, five behind another, each half with
its own goal line ("learn **5 new animal words**") and its own progress bar. Nothing was
added and nothing was taken away except the length. That is a finding about teaching, not
about software: **a lesson is five words, not ten.** A child who has met ten animals in
forty minutes has not learned ten animals; she has been shown ten. Our lessons are all
built at ten, and every one of them is therefore the wrong size.

The second, `shapes-lesson.html`, is a genuinely new topic and — more importantly — a
genuinely new *shape* of lesson. Eight shapes over two parts, each shape carrying a
colour, so that the child ends up saying "It's a red circle" rather than naming one
attribute at a time. Only two of its exercises are ones we can already play. The rest ask
for things the engine cannot do:

- a list of **model phrases** to hear and repeat — "What shape is it?", "Is it a square?
  — Yes, it is. / No, it isn't." — which is how a child gets a sentence she can *use*,
  not just a word she can recognise;
- a **riddle**: "What shape is a plate? 🍽️" — the first exercise that asks a child to
  apply a word to the world instead of matching it to its own picture;
- the same mechanic run the other way, showing the shape and asking its name;
- and **two questions about one thing** — which shape, and which colour — answered
  together, because "red" and "circle" are only useful once they are in the same breath.

There is also a plain content problem hiding in her shapes file: `🟢` is labelled *oval*
and is a circle, and `▭` for *rectangle* renders as a box or not at all depending on the
device. A shapes lesson that shows the wrong shape is worse than no shapes lesson, and
this is exactly the risk PLAN §10 has been carrying ("replace the critical emoji with an
own SVG set").

## What Changes

- **Animals becomes two five-word lessons.** `animals.json` is replaced by
  `animals-1.json` — Animals You Know (dog, cat, rabbit, duck, fish) — and
  `animals-2.json` — Wild Animals (bird, elephant, lion, monkey, bear). Same words, same
  tags, same exercises; half the length each. **BREAKING**: the route `/lesson/animals`
  no longer resolves, and the lesson's pictures move with it.

- **A part-two lesson carries the whole vocabulary and teaches only its own half.** Its
  teaching blocks select the five new words by id; its closing blocks select all ten and
  revise. This is what keeps the sorting exercise honest: the five wild animals are all
  jungle animals, so "Where do they live?" over part two alone would be one bucket and no
  question at all. Sorting belongs to the revision, over the full ten.

- **A new lesson, Shapes, in two parts.** `shapes-1.json` teaches circle, square,
  triangle and rectangle; `shapes-2.json` carries all eight, teaches star, heart, oval and
  diamond, and revises the lot. Every shape carries its colour as a tag, so the same
  vocabulary list feeds both the shape exercises and the colour ones.

- **Three new exercises**, chosen because they are what her material needs and nothing
  more:
  - **`phrases`** — the model sentences the lesson declares, each one spoken on a tap.
    The first block whose content is a line to say rather than a word to identify. It is
    complete when every line has been heard at least once.
  - **`quiz`** — something is shown, and the learner taps the item it names. What is shown
    is any face the format already has: a riddle carried on a tag ("a plate 🍽️" → circle),
    or the picture itself with the words as the choices ("which one is this?" → *oval*).
    One mechanic covers both of her exercises, and the same block serves any lesson with a
    tag worth asking about. It takes the name PLAN §5's backlog reserved for it and drops
    the timer that entry imagined: a race punishes the child who is thinking, which the
    engine has promised not to do.
  - **`describe`** — one item on screen and exactly two questions about it, each answered
    from a row of choices drawn from the lesson's own values. Neither answer counts until
    both are given. Exactly two, not any number, because two is what the action model
    already carries and what her exercise asks for.

- **Shapes are drawn, not borrowed from the emoji font.** Eight SVGs written by the
  picture generator with exact geometry, the way the colour swatches already are: an oval
  is an ellipse because it is declared to be one, not because a font happened to draw one.
  This uses the picture pipeline that already exists — no new kind of asset, no catalogue,
  no runtime machinery.

- **Japanese glosses are written for the shapes** (丸 / 四角 / 三角 …), which her file
  omits. Every other lesson carries them and the children are the same children; this is
  assumed rather than asked, and is the one content decision here she may want to reverse.

- Deliberately **not** in scope, and why:
  - **Repeat After Me** — her drill where the child says the word and the *teacher* awards
    a star. Nothing in the model lets the teacher score anything; adding that is a change
    to what a room is, not a new block, and it deserves its own proposal.
  - **Draw the shape** — her canvas with an "I drew it!" button. `add-drawing-overlay` is
    already proposed and unimplemented and owns the ink; a prompted, self-marked drawing
    exercise is a block built on top of it and waits for it.
  - **Her shape-matching pairs**, three of which pair a star with a star. The standard
    picture-to-word `match` teaches the same thing and is not broken.
  - Re-cutting Body Parts, Colours, Food and Numbers to five words. The same finding
    applies to all four; doing them here would bury the engine work under content. Animals
    is the one she actually re-cut, and it is the one that proves the shape.
  - Any grouping of parts on the home screen, any `parts` field in the lesson format, and
    any change to the action set, the reducer or the room protocol.

## Capabilities

### New Capabilities

None. Three exercises belong beside the six that exist, and a shorter lesson is a lesson
file — neither is a capability of its own.

### Modified Capabilities

- `exercise-blocks`: gains one requirement per new exercise — what it presents, what
  counts as right, what a wrong answer does and when it is complete — and its existing
  "an exercise speaks unasked only while the lesson's sound is on" requirement grows to
  name the two new places the app volunteers a line: a phrase tapped in a phrase list and
  a completed description. Its purpose statement stops saying "these six exercises".
- `lesson-format`: gains the three block declarations and the rules that make them valid
  (a phrase list needs lines; a quiz prompt must be a face every selected item carries; a
  description declares exactly two axes and each must resolve to at least two distinct
  values across the selected items). Its "the format covers the teacher's existing
  material" requirement grows to cover the Shapes material as well, and gains the rule
  that a lesson teaches one part's worth of vocabulary and may revise more.
- `teacher-view`: its answer-key requirement gains the three new keys, so the panel still
  renders a key it has never seen before without a per-type branch.

## Impact

- **New:** `src/shared/blocks/phrases.ts`, `quiz.ts`, `describe.ts` (logic and answer
  keys); `src/blocks/PhrasesView.tsx`, `QuizView.tsx`, `DescribeView.tsx`;
  `lessons/animals-1.json`, `lessons/animals-2.json`, `lessons/shapes-1.json`,
  `lessons/shapes-2.json`; eight shape SVGs under `public/pics/shapes/`.
- **Changed:** `src/shared/types.ts` (three block shapes, three state shapes),
  `src/shared/validate.ts`, `src/shared/blocks/index.ts` and `src/blocks/index.ts` (the two
  registries), `src/shared/blocks/speakable.ts`, `src/blocks/blocks.module.css`,
  `scripts/pictures.ts` (a shape table beside the colour table), `src/blocks/pictures.ts`
  (regenerated), `README.md`, `docs/PLAN.md`.
- **Removed:** `lessons/animals.json`.
- **Moved:** `public/pics/animals/*` splits into `public/pics/animals-1/` and
  `public/pics/animals-2/`, and the originals in `.pics-src/` are renamed to match. The
  files are moved rather than regenerated: the generator skips a picture that already
  exists, so leaving them behind would silently redraw ten animals through a paid network
  call and produce a different-looking set. Audio is unaffected — clips are keyed by the
  hash of the spoken line, not by the lesson.
- **Unchanged:** `src/shared/reducer.ts`, the action set, `LessonState`'s shape, the room
  protocol, `src/shared/room.ts`, the Worker, `src/ui/LessonPlayer.tsx`,
  `src/ui/TeacherPanel.tsx`, `src/ui/App.tsx` and `src/speech/`. The three exercises are
  expressed in the actions that already exist; nothing new crosses the socket.
- **Tests:** each new logic module gets its own (init, every refusal, completion, the
  answer key); the block-contract and answer-key tests cover nine types instead of six;
  `speakable.test.ts` holds the new views to what they actually speak; `validate.test.ts`
  gains the new rejections; each view gets a rendering test; and a test asserts that every
  lesson file teaches at most five new words, so the finding does not quietly rot.
- **Docs:** `README.md`'s block table gains three rows; `docs/PLAN.md` §5 moves `quiz` out
  of the backlog and records what it now means, §9 records what this delivers of v0.2, and
  §12 gains the product decisions above.
- **Ordering:** `add-hotspot-memory-scramble` and `add-drawing-overlay` are both proposed
  and unimplemented. This change contradicts neither. It shares `blocks.module.css`,
  `types.ts`, `validate.ts` and the two registries with the hotspot change — append-only in
  each, so whichever lands second merges rather than rewrites. `add-drawing-overlay` fixes
  the stage's shape; the three new views must sit inside that shape, which is a check for
  whichever lands second.
- **Known trade-off:** replacing one Animals lesson with two puts six cards on a home
  screen that has no grouping, and Shapes will add two more. Eight ungrouped cards is
  legible; sixteen would not be, and re-cutting the remaining four lessons will get there.
  Grouping parts under a topic is the follow-on this change deliberately defers, because it
  is a question about the home screen and not about what a lesson is.
