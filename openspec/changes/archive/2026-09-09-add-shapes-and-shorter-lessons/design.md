## Context

See `proposal.md` — Why, for the two things the teacher's files say. This document covers
how three exercises, one new topic and one re-cut topic land without touching the reducer,
the action set or the room.

Three constraints shape everything below:

- **A lesson is data, never code.** A new lesson must require zero new code. Everything a
  new exercise needs must be declarable in the lesson file and computable from it.
- **The action set is closed here.** `nav`, `reset`, `tap`, `pick` and `level` are what the
  reducer, the Durable Object and the convergence tests already agree on. A new action is a
  protocol change, and none of these three exercises needs one.
- **The picture pipeline already draws exact SVG.** `scripts/pictures.ts` writes the colour
  swatches by hand rather than generating them, because "red" has to actually be red
  (design D96). Shapes are the same problem: a diffusion model draws an approximate oval,
  and approximate is the one thing a shapes lesson cannot be.

Decisions are numbered from D112, the first free number in the sequence `docs/PLAN.md` §12
and the archived changes have been using.

## Goals / Non-Goals

**Goals:**

- Three block types that are ordinary members of the existing registry — same contract,
  same purity, same answer-key shape — so the teacher's panel and the star trail pick them
  up with no work.
- Shapes and Animals both expressed as five-word lessons using only format features that
  exist or are added here, with no per-lesson code path.
- Shape artwork that is geometrically correct on every device.
- The animals pictures survive the rename without a regeneration.

**Non-Goals:**

- Any notion of "parts", "chapters" or a topic that owns several lessons, in the format, in
  the router or on the home screen. Two files, two cards, and that is all this change knows.
- Folding `listen` into `quiz`, or any other consolidation of the six existing types.
- Free-text authoring beyond the phrase list: no lesson gains a way to write a sentence
  about an item that the item cannot render.

## Decisions

### D112 — Two lesson files, not a `parts` field

A topic longer than five words becomes several lesson files. `animals.json` is deleted and
becomes `animals-1.json` and `animals-2.json`; Shapes arrives as `shapes-1.json` and
`shapes-2.json`.

*Why:* it is the only option that costs no code. A `parts` field in the format would reach
the validator, the player's slide model, the star trail's denominator, the router and the
home screen — five places, for a presentational grouping the app can live without. Files are
already the unit the app loads, routes to, opens a room on and computes progress over.

*Alternatives rejected:*
- **`parts` inside one lesson file.** Truer to what she drew — one page, two tabs — but it
  makes "which part am I in" a second axis of position beside the slide, and position is
  synchronised state. Every screen would have to agree on it, which puts a presentational
  concept into the room protocol.
- **One lesson whose blocks each select five ids.** Free, but delivers nothing: the child
  still walks one lesson of fourteen exercises, which is precisely the length being
  complained about.

*Cost, accepted:* the home screen gains cards with no relationship between them. Recorded in
the proposal as the deferred follow-on.

### D113 — A part-two file carries the whole vocabulary and teaches only its own half

`animals-2.json` holds all ten animals; its `cards`, `match` and `sentence` blocks select
its own five by id; its `sort` and `listen` blocks select all ten and revise.

*Why:* it solves a real content failure rather than a cosmetic one. All five wild animals
live in the jungle, so "Where do they live?" over part two alone is one bucket and no
question. Sorting is a revision exercise by nature — it needs a spread — and it belongs
where the spread is. The same is true of Shapes: eight shapes across four colours make a
description exercise worth doing; four shapes across four colours make the colour question
a restatement of the shape question.

This is what the new format requirement means by capping what a lesson *introduces* rather
than what it *contains*.

*Alternative rejected:* re-tag the wild animals so part two has three habitats. That is
changing a fact about the world to fit an exercise, and the fact is the thing being taught.

### D114 — Three logic modules and three views, and nothing else moves

`phrases`, `quiz` and `describe` are added to `src/shared/types.ts` (a block shape and a
state shape each), to `src/shared/validate.ts`, and to the two registries. Each gets a logic
module under `src/shared/blocks/` and a view under `src/blocks/`. `src/shared/reducer.ts` is
not opened: it dispatches on the registry, and the registry's mapped type turns a missing
module into a compile error rather than a runtime one.

All three are `scored: true`, so they enter the star trail with no work.

### D115 — All three ride the existing actions, and `describe` is capped at two questions for that reason

- `phrases`: `tap` with the phrase's index as target. State `{ played: string[] }`.
- `quiz`: `tap` with the chosen item's id as target. State is `listen`'s shape —
  `{ order, index, answered, wrong }` — because the progression is identical: one target at
  a time, wrong answers cost nothing, complete when the order is exhausted.
- `describe`: `pick` with `side: 'a'` for the first question and `side: 'b'` for the second.
  State `{ order, index, given: { a: boolean; b: boolean }, wrong: Side | null }`.

`pick` carries exactly two sides, because it was built for a left column and a right column.
That is why a description asks exactly two questions and the format says so. It is not a
placeholder for "two for now": a third question would be a protocol change, and the exercise
exists to put two facts in one sentence — "It's a red circle" — which is a fact about English,
not about the action type.

*Alternative rejected:* a new `answer` action carrying an axis index. It is a change to the
protocol, the Durable Object and the convergence tests, bought for one exercise that does not
need it.

### D116 — One `quiz` covers both of her guessing exercises

Her file has two separate activities: *Shape Hunt* ("What shape is a plate? 🍽️" → tap a
shape) and *Guess the Shape* (a shape is drawn → tap its name). They are one mechanic with
the faces swapped. The block declares `ask` (the face the prompt is drawn from) and `show`
(the face the choices are shown by):

```json
{ "type": "quiz", "ask": "tag:thing", "show": "emoji" }
{ "type": "quiz", "ask": "emoji",     "show": "en"    }
```

*Why:* it is the same move the format already made for themed exercises — one block type
applied to different tags rather than a block type per theme. It also generalises for free:
Food gains "which one do you drink?" and Animals gains "which one lives in the water?" with
no code.

The validator rejects `ask` equal to `show`, which would print the answer in the question.

*Alternative rejected:* fold `listen` into `quiz` as "ask with the spoken word". `listen`
carries a whole contract about sound availability — the repeat control's three states, the
explicit offer to enable sound, the written word as a last resort — that has nothing to do
with a visual prompt. Merging them would drag that contract onto every quiz.

### D117 — A quiz's distractors come from the lesson, seeded, and never include the answer twice

Choices are drawn from the block's selected items, shuffled from the block's seed like every
other shuffle, and always contain the target exactly once. `count` defaults to four, as
`listen`'s does, and is clamped to the number of selected items — a four-item lesson offers
four choices, not four with a repeat.

### D118 — A description's choices are the lesson's own distinct values

For a question on face `f`, the choices are the distinct values the selected items carry for
`f`, in seeded order. Eight shapes over four colours therefore give a four-way colour
question and an eight-way shape question, which is what her file does by hand.

The validator rejects a face that resolves to one value across the selection: a question
with one possible answer is not a question, and it would silently score itself.

### D119 — Phrases are literal text, and that exception is drawn narrowly

A phrase list block declares `lines: string[]` — literal sentences, not templates:

```json
{ "type": "phrases", "lines": ["What shape is it?", "It's a circle."] }
```

*Why:* "Is it a square? — Yes, it is. / No, it isn't." is a fact about English, not a fact
about a square. There is no item it can be rendered from.

*Why the exception stays narrow:* `lines` is inert text that is displayed and spoken. It is
never parsed, never matched against an answer, and never carries a placeholder. The format's
rule that content comes from items and tags still holds everywhere an exercise has something
to be *right* about — which a phrase list, deliberately, does not.

*Alternative rejected:* allow `{en}` placeholders in a line, rendering it per item. That
turns the phrase list into a worse `sentence` block and misses what it is for: the frame
sentences a child says *around* the vocabulary.

### D120 — Shapes are written as SVG by the picture generator, beside the colour swatches

`scripts/pictures.ts` gains a `SHAPES` table next to `COLOURS`, writing eight files to
`public/pics/shapes/`. Each is a single filled path in the shape's own colour on the same
512-viewBox the swatches use, so the existing `Picture` component and its preloading need no
change at all.

*Why:* the emoji are wrong, not merely ugly. `🟢` is a circle and her file labels it *oval*;
`▭` is a geometric character that some platforms draw as an outline, some as a filled box and
some not at all. A shapes lesson that shows a circle for "oval" teaches the opposite of what
it says. This is PLAN §10's "replace the critical emoji with an own SVG set", arriving where
it is critical.

*Why not the drawing generator:* the same reason as the colours (D96) — a diffusion model
gets a rectangle approximately right, and "approximately a rectangle" is a wrong answer.

Each shape item still declares a required `emoji`, as every item must; it is the fallback the
picture layer already has (D94), and it is never the primary face here.

*Note:* both lessons keep the same picture directory, `public/pics/shapes/`, only if their
lesson ids share it — they do not. The manifest is keyed `<lesson>/<item>`, so the eight
files are written once per lesson id that selects them: `shapes-1/` gets four, `shapes-2/`
gets all eight. Writing an SVG twice costs 400 bytes, which is cheaper than teaching the
manifest about shared vocabulary.

### D121 — The animals pictures are moved, not regenerated

`public/pics/animals/*.jpg` splits into `public/pics/animals-1/` and `public/pics/animals-2/`,
and the originals in `.pics-src/animals-*.jpg` are renamed to `animals-1-*.jpg` /
`animals-2-*.jpg` to match.

*Why:* the generator's "never redraw an existing file" rule is keyed by output path. Renaming
the lesson and re-running it would find nothing at `animals-1/dog.jpg`, make ten paid network
calls of about a minute each, and produce ten pictures that do not match the set — the style
is held by drawing each new picture against the previous ones (D95), and that chain would
restart.

`npm run pictures` is still run afterwards, to regenerate the manifest and prove the move
was complete: it must report zero pictures drawn. A picture that was missed shows up as an
emoji rather than as an error (D94), so the zero is the check.

Audio needs nothing: clips are keyed by the hash of the spoken line, not by the lesson.

### D122 — The five-word cap is a test, not a convention

`tests/` gains an assertion over every lesson file: the items its teaching blocks select,
minus the items any earlier lesson of the same topic taught, is at most five.

*Why:* it is the whole finding of this change, and a convention written only in a document is
a convention that lasts until the next lesson is written in a hurry. It is also the only rule
here that a lesson author can break by accident.

### D123 — A declared article agrees with the noun, so no template puts one before an adjective

`article` is a property of the item's own word — "an oval" — and `renderTemplate` fills
`{article}` from it. A template of the form `{article} {tag:colour} {en}` therefore reads
the article for *oval* and puts it in front of *green*: "It is an green oval." Caught by the
clip generator, which prints every line it records.

The describe sentence is `"The {en} {be} {tag:colour}."` — "The oval is green." — which needs
no article at all and is one of the teacher's own model phrases. The general rule: a
template may put `{article}` before `{en}` and nowhere else. Setting `article` per item to
suit a particular sentence was rejected: it would then be wrong in the quiz line, which says
"It is an oval." correctly, and one field cannot agree with two different following words.

## Risks / Trade-offs

- **Eight home-screen cards with no grouping, and sixteen coming** → accepted for now; the
  grouping is a home-screen change with its own proposal, and it is cheaper to design once
  the real number of lessons is known.
- **`/lesson/animals` stops resolving** → the app has one user, rooms are ephemeral and
  nothing is persisted, so a stale link costs a re-open of the home screen. The unknown-route
  screen already exists and offers exactly that.
- **The shapes lesson's Japanese glosses are our assumption, not her copy** → they are in
  the lesson files, which is one edit each to remove; flagged for her in Open Questions.
- **Three new views mean three new layouts to check inside the fixed stage that
  `add-drawing-overlay` introduces** → whichever change lands second carries that check; the
  proposal records it.
- **`describe` at exactly two questions may prove too rigid for a later topic** → then it
  gains a third the honest way, through a new action, and the format rule changes with it.
  Nothing here pretends the cap is arbitrary and reversible for free.

## Migration Plan

1. Move the pictures and rename the originals; run `npm run pictures` and confirm it reports
   zero drawn.
2. Add the three block types with their tests before any lesson uses them.
3. Write the four lesson files; the loader validates every file at build time, so a mistake
   surfaces as a named failure on the home screen rather than as a broken exercise.
4. Delete `lessons/animals.json` last, so the working tree always has a playable Animals.

Rollback is `git revert` plus restoring `public/pics/animals/`: no state is stored anywhere,
no room outlives a deploy, and no lesson data is written by the app.

## Open Questions

- Do the shapes want Japanese glosses? Written in on the assumption that they do; removing
  them is one edit per file and changes no requirement.
- Which of the remaining four lessons — Body Parts, Colours, Food, Numbers — should be re-cut
  to five words first? Deferred deliberately: it is content work that reuses this change's
  rule and blocks nothing here.
- Her *Repeat After Me* needs the teacher to award a star for a spoken attempt. That is the
  first thing in the product that scores a person rather than a tap, and it is worth asking
  her whether the star should be hers to give or the app's to infer before designing it.
