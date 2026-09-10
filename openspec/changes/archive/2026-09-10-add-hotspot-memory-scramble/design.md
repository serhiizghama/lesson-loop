## Context

See `proposal.md` — Why. What matters here is what the engine already provides, because
this change is meant to add three exercises without adding machinery.

- A block type is a member of the `Block` union, a `BlockLogic` in the shared registry
  (`scored`, `init`, `reduce`, `isComplete`, `answerKey`), a view in the client registry,
  a Zod branch plus cross-checks in `validate.ts`, and a branch in `speakableLines`. The
  two registries are exhaustive mapped types: a member without an entry is a compile error.
  Ten members are registered today — nine exercises and `finish`.
- The action set is generic and already covers two-step tapping: `pick` carries a side
  (`match`: which column; `sort`: item or bucket; `describe`: which of the two questions)
  and `tap` carries a target (`cards`: which card; `listen` and `quiz`: which answer;
  `phrases`: which line; `tpr`: which instruction is being left behind).
- The model is pure and has no clock, no identity and no randomness: `applyAction` runs
  optimistically in the browser and authoritatively in the Durable Object, and every
  shuffle comes from the lesson's seed mixed with the block id and its reset generation
  (`seedFor(seed, blockId, generation, salt)`), with anything derived per step salted
  further — `listenChoices` and `quizChoices` both do exactly that with the item index.
- **The exercise stage no longer reflows.** It is laid out at a fixed reference width of
  880 px and a fixed height of 620 px and then scaled by `available / 880` to whatever the
  window gives (D103, product D-35), so that a fraction of the stage names the same content
  on both screens and a mark drawn over the third card is a mark over the third card. Two
  consequences bind every view added here: it must lay out from the stage's 880 px and
  never from the viewport, and a size in the layout is worth `scale` times as much under a
  finger — about 0.4 at the narrowest supported width.
- The ink layer sits over the stage and holds strokes per block id; it neither reduces nor
  is reduced (D101). Three new block ids need nothing from it.
- Speech reaches a view as a prop already wrapped by the lesson's sound setting
  (`quietable`), so a line spoken with the default intent is suppressed while the lesson is
  quiet without the view knowing the rule exists. `speakableLines` must enumerate every
  line a view can speak, because the clips are generated from it ahead of time (D52), and
  a test sweeps `Object.keys(blockLogic)` to make sure no type is silently unenumerated.
- Vocabulary is shown by `Picture`, which draws the generated picture for an item and falls
  back to its emoji (D94); every new view showing an item shows it that way.
- `src/shared` may not import React or touch the DOM; `src/shared/purity.test.ts` enforces
  it.

Decisions are numbered `Dn` continuing the project's sequence; the highest taken is D123
(`add-shapes-and-shorter-lessons`), so this change starts at D124. Product decisions in
`docs/PLAN.md` §12 use `D-n`; the highest taken there is D-39.

## Goals / Non-Goals

**Goals:**

- Three exercises expressed entirely in the existing contract: no new action, no new field
  on `LessonState`, no new message on the wire, nothing new persisted by the room.
- One drawing in the app, and everything else about a labelled diagram in the lesson.
- Both screens agree on every layout — a card board, a shuffled bank of words, a scrambled
  sentence — from the seed alone, as the nine existing types already do.
- Each of the three taught by a real lesson at the end of this change.
- Every part the body scene must label hittable with a finger at the narrowest supported
  width, which is a constraint on the drawing as much as on the view.

**Non-Goals:**

- A general scene system: one scene, one shape of place (a rectangle), no editor and no
  authoring tool for either.
- Any change to the player, the teacher's panel, the room, the protocol, the ink or speech
  itself.
- Undo of a placed word, drag anywhere, per-person scoring, or a timer of any kind.
- Re-cutting Body Parts to five words (D-36). These blocks are written so that the cut,
  when it comes, splits them with the lesson.

## Decisions

### D124 — Three logic modules and three views, and no new machinery anywhere else

Each type is one file under `src/shared/blocks/` (logic, answer key) and one under
`src/blocks/` (view), registered in the two existing registries. `reducer.ts`,
`room.ts`, `protocol.ts`, `ink.ts`, `LessonPlayer.tsx` and `TeacherPanel.tsx` are not
touched.

*Why:* this is exactly the extension point the engine was built around — the v0.1 design
made block types a registry precisely so that the tenth, eleventh and twelfth cost no
surgery, and `add-shapes-and-shorter-lessons` has already proved it once by adding three.
If any of the three had needed a new action or a new field on the shared state, that would
have been a signal the mechanic did not belong in this engine yet.

*Rejected:* giving `memory` an identity-carrying action so it could tell whose turn it is.
That would put the sender's role into `applyAction`, which is pure, flat and free of any
notion of who acted (D1, D4), for one exercise. It is the reason the exercise is
cooperative — see D129.

### D125 — Scene names live in shared code, the artwork lives in the client

`src/shared/scenes.ts` exports the scene ids and each scene's drawing size — data only, no
React — so `validate.ts` can reject an unknown scene inside the Durable Object as readily
as in the browser. `src/scenes/` holds the drawings themselves as React components with
inline SVG, registered in a mapped type keyed by the same ids.

*Why:* validation is shared and must stay importable by the Worker; artwork is a component
and cannot be. Splitting them at the name is the only line that keeps both true. Inline SVG
authored by hand rather than generated is the same call D-38 made for the shapes: a diagram
whose parts must be labelled has to be exactly right about where each part is, which is the
one thing a generator will not be.

*Rejected:* putting the SVG source in shared as a string and dangerously setting it as
HTML — a string of markup interpolated into the page for no gain over a component.
*Rejected:* generating the body as a picture into `public/pics` the way the vocabulary is
drawn (D-29, D-31). A picture is looked at; a scene is measured, and a drawing that shifts
by ten pixels when it is regenerated silently moves every rectangle the lesson declared.
*Rejected:* an asset file fetched at runtime — the app deliberately has no service worker
(D-22) and the lesson must play with the network gone.

### D126 — A place is a normalised rectangle in the lesson, keyed by item id

`"spots": { "nose": [0.45, 0.14, 0.09, 0.05] }` — x, y, width, height as fractions of the
drawing. Validation rejects a scene the app does not carry, a selected item with no spot, a
rectangle outside the unit square, a zero width or height, and two selected items whose
rectangles have the same centre.

*Why:* fractions survive every viewport, and keying by item id means the lesson's own
vocabulary decides what is asked. Two lessons can label the same body with different words
without touching the drawing.

*Why the same-centre check:* the teacher's own page carries the case. Its `mouth` and
`teeth` hotspots are the identical rectangle and it resolves the clash by hiding `teeth` and
filtering it out of the exercise. A lesson that selects both would be unplayable — one of
the two words could never be placed — and nothing else in the format would catch it, so
validation does.

*Rejected:* the geometry inside the scene — then the drawing would decide which words a
lesson teaches, and a second lesson on the same figure could not choose its own subset.
*Rejected:* polygons or SVG path targets — a rectangle is enough for every part of a body,
and a polygon editor is a tool this project does not have.
*Rejected:* the whole drawing inline in the lesson JSON (the alternative offered to the
client, and declined): a lesson file half of which is `<path d="…">` is no longer something
a non-programmer reads, which is the entire point of the format.

### D127 — `hotspot` is `sort` with a picture instead of buckets

State is `{ order, selected, placed, wrong }`: the bank order from the seed, the word being
held, the items already placed, and the last refusal. Side `a` of `pick` is a word, side
`b` is a place. A place tapped with nothing selected returns the state by reference, so it
is a no-op and not a mistake.

*Why:* it is the same interaction the learner already knows from sorting — pick a thing,
pick where it goes — and reusing the shape means reusing its tested reducer semantics
(identity on refusal, `wrong` cleared by the next action).

### D128 — The tap target is sized in stage pixels, and the scene is drawn to make room

The rendered place is a button positioned by the declared rectangle and inflated around the
same centre to at least **110 px in the stage's own coordinates** — 44 px under a finger
once the stage is scaled by about 0.4 at the narrowest supported width — while the visible
outline stays the declared rectangle. Where two inflated targets overlap, the one whose
declared rectangle contains the point wins, and otherwise the nearest declared centre wins.
A tap that lands in no target at all is a no-op, not a wrong answer.

Inflation alone does not finish the job, and the arithmetic is what settles the drawing.
After the stage's padding, the block title and its hint, a view has about **856 × 510** px
of the stage to lay out in. A single figure has to carry six vertical gaps — hair, eyes,
nose, mouth down the head, then arm, hand, leg, foot down the body — and six gaps of 110 px
is 660 px against the 510 there are. Enlarging the head does not solve it; it takes the
height from the limbs. The best one figure can do is about 64 px between centres, which is
27 px under a finger at the narrowest width.

**So the `body` scene is not one figure.** It is drawn as two panels side by side in a
landscape space of 700 × 480: a large head on the left carrying `hair`, `eyes`, `ears`,
`nose` and `mouth`, and a small whole figure on the right carrying `arm`, `hand`, `leg` and
`foot` — the arm and leg marked on one side of the figure and the hand and foot on the
other, which is what buys the last of the separation. Every pair of declared centres is
then at least 110 px apart in the scene's own space, and the scene renders at about 1:1 in
the stage. A part that cannot make that separation is a defect in the drawing, which is
ours, and is fixed there.

*Why:* the spec asks for tap targets a child can hit with a finger, and D-35 means a size
in the layout is not a size on the glass. Growing the visible outline instead would make the
drawing wrong.

*Rejected:* refusing small rectangles in validation — the lesson author would have to
compensate for a phone by drawing an anatomically wrong nose, when the drawing is the app's
own and can simply be drawn better.
*Rejected:* keeping the teacher's single figure and lowering the bar to `--tap`, the
3.25 rem every other tile in the app uses. It is what the rest of the app does, and on a
tablet — where a lesson is actually taught — it would be fine; but a nose worth 27 px on a
phone is the one target in the app a child is asked to hit precisely, and the drawing is
ours to fix.
*Rejected:* resolving every tap on the drawing to the nearest spot, with no misses at all.
It reads well until a child taps the belly and is told they were wrong about the nose:
"never punitive" means a miss must be able to be a miss.

### D129 — `memory` is cooperative, and a miss is cleared by the next tap

State is `{ order, up, matched, tries }`. `order` is the shuffled board — each selected
item twice, as `<itemId>#a` and `<itemId>#b`, so a card has a stable id and its item is
recoverable by splitting. `up` holds at most two card ids. Tapping a face-down card with
two mismatched cards up turns those down and turns up the tapped one in a single
transition; tapping a card already up or already matched returns the state by reference.

*Why the miss waits for a tap:* the model has no clock, and the only alternative is a
client scheduling an action after a delay — with two clients in a room, whose timer sends
it? Both, and the room applies whichever arrives first while the second is refused as a
no-op. The rule "the next tap clears it" is deterministic, identical on both screens, and
costs the learner nothing: that tap is also the first card of the next try.

*Why cooperative:* an action does not carry who sent it (D1, D4), so a turn would be a rule
the app draws and cannot enforce, in an app whose other three rules about who may act — the
lock, the pacing and the pen — are enforced by the room precisely because a browser rule
aimed at a child is undone by a reload (D14, D23, D-33). `tries` is a count, not a score:
nobody is ranked and nothing is timed. This is a departure from the backlog line that named
the type ("pairs, alternating turns, teacher-vs-student score"), and PLAN §5 records it as
such rather than quietly dropping it.

*Rejected:* turn-taking as an honour system with a "whose turn" banner. It is the client's
stated preference to have it, and it may return as its own change once a real lesson shows
the pair actually take turns — but it should arrive with a way to mean it.

### D130 — `memory` speaks like `match`, because it is a pairing exercise

Turning a card up speaks that card's face (a picture is named by its English word, a
first-language gloss stays unspoken — `faceSpeech`). Closing a pair speaks the block's
declared line if it has one, and the closing tap then stays silent rather than being cut
off a syllable in — the same rule `MatchView` already follows.

### D131 — `scramble` is `listen`'s progression with `sentence`'s rendering

State is `{ order, index, placed, wrong }`: the items in shuffled order, which one is being
built, the chip indices already placed in the order they were placed, and the last refused
chip. The chips for the current item are derived — the block's template rendered for that
item, split on whitespace, shuffled with `seedFor(seed, 'chips', state.index)` — never
stored, exactly as `listenChoices` and `quizChoices` derive their choices. `pick` (side
`a`, target = the chip index as a string) places a word; `tap` with the current item's id
advances past it, following `tpr`'s convention that the action names the thing being left
behind, so a duplicate or stale tap is a no-op rather than a skipped sentence.

A chip is accepted when its **text** equals the next expected word, not when its index is
the expected one: a sentence containing "my" twice must accept either chip, or the child is
being asked to read the shuffler's mind.

*Rejected:* storing the chips in the state — it would be the first block state that is not
derivable from the seed, and it would grow `LessonState` for every sentence.
*Rejected:* free assembly with a check at the end — a seven-year-old assembling four words
wrong and being told so at the end learns less than one who is stopped at the wrong word,
and the app's other exercises all refuse the wrong move at the moment it is made.

### D132 — `scramble` speaks the finished sentence and nothing else

A placed word is not spoken; the whole sentence is, once, when the last word lands.

*Why:* the sentence is the unit being taught. It is the same reason `match` speaks the
completed pair rather than the tile — and a voice reading "This… is… my… nose." word by
word teaches an accent nobody wants. It also keeps `speakableLines` to one line per item
rather than one per word, which keeps the prepared recordings (D52) honest.

### D133 — The answer keys say positions in words, never in numbers a teacher cannot say

Each key keeps the shape the panel already renders — a title and rows of `id`, `label`,
`value` and a `mark` of open, current or done — so no branch is added to the teacher's
view.

- `hotspot`: each word with where it is, derived from its rectangle's centre as a vertical
  fifth (top, upper, middle, lower, bottom) and a horizontal third (left, centre, right) —
  "top · centre", "middle · left". Marked done as it is placed, current while it is the
  word being held. Fifths rather than thirds vertically because the scene is two panels
  (D128) and the head's five parts stack down one of them: thirds put `eyes` and `nose` in
  the same band and say the same thing twice, while fifths name all nine parts of the body
  scene distinctly.
- `memory`: each pair with the 1-based positions of its two cards on the board — "3 & 8" —
  marked done once found.
- `scramble`: every item's full sentence, the one being built marked current.

*Why:* the key is read aloud by a person over a video call (D15). "Nose — top · centre" is
sayable; `[0.45, 0.14]` is not.

*Rejected:* hiding the card positions from the teacher because it "spoils" the memory game.
The teacher's screen exists to let her guide, and a key that omits the only thing worth
knowing would send her back to guessing along with the child.

### D134 — The three land in her lessons, and the body scene is traced from her own page

`lessons/body-parts.json` gains **Label the Body** (`hotspot`, scene `body`, after the
sentence exercise, where her original page had it) and **Build It** (`scramble`,
`{this} {be} my {en}.` — already a level of that lesson's sentence block, so it is already
recorded). `lessons/animals-2.json` gains **Memory** (`memory`, picture against word) over
`select: all`, because a memory board wants a spread and revision blocks belong to the part
that has one (D-37); Animals part one has five words and would give a five-pair board, which
is a lesson for later rather than a second copy now.

The `body` scene teaches the same nine parts as the figure in
`docs/reference/body_parts_lesson.html`, in the same friendly style, but as the two-panel
diagram D128 requires rather than as a trace of her single figure: her geometry is the list
of parts and their relationships, not the coordinates. **`teeth` is not selected by the
labelling block**: the reference page gives `teeth` the identical rectangle to `mouth` and
hides it, and one of two words on one rectangle can never be placed. `teeth` stays in the
lesson's vocabulary and in every other exercise.

*Why:* the original page is the specification for what she expects the exercise to *ask* —
which parts, in which lesson, after which exercise. What it is not is a specification for
the drawing, whose only job is to be labelled and which her page's own layout cannot do at
the size a child plays it.

*Note on D-36:* Body Parts is a ten-word lesson still due to be cut in two. Both new blocks
select by explicit ids rather than `select: all`, so the cut moves each block's words with
it instead of leaving a ten-word exercise in a five-word lesson.

## Risks / Trade-offs

| Risk | Mitigation |
|---|---|
| **The narrow exception in D125/D126 becomes the rule** — a lesson author eventually wants a face, a room, a kitchen, and each needs a developer | The exception is written into the spec as narrow and the scene is artwork only; if a third scene is ever asked for, that is the signal to build authoring, not to add a fourth by hand |
| Eyes, nose and mouth sit within a few stage pixels of each other, and the stage is scaled down by about 0.4 before a finger arrives | D128: the scene is two panels, with the head drawn large enough that every centre is 110 px from its neighbours in the scene's own space; targets are inflated to that, and a tap in no target is a no-op. A test computes the pairwise distances, and the acceptance run includes the head at 380 px |
| A twelve-card memory board plus the header does not fit the stage's fixed 880 × 620 box | The board is laid out to that box, not to the window, and the block declares `count`; six pairs at 880 px give cards of about 135 px, which is about 58 px under a finger at the narrowest width. Checked against the reference box, then at 380 px |
| A new view reflows with the window and breaks the ink's promise that a point means the same thing on both screens | No viewport units and no media queries inside the three views; a test asserts the stage's laid-out width is the reference width with each of them on screen |
| Both people tap a memory board at once and one sees a card turn up and immediately down | The room applies one action at a time and broadcasts the whole state (D10); the second tap is either a legal transition from what the first produced or a no-op. Nothing here is worse than the same race in `match`, which has been played |
| A `scramble` template whose `{article}` renders empty leaves an empty chip | `renderTemplate` already collapses whitespace before returning; splitting the rendered line therefore cannot produce an empty word, and a test pins that for a plural item |
| A new line nobody recorded is spoken by TTS in a real lesson | The templates are chosen to be lines the lessons already speak, and `npm run audio` is run and its diff inspected rather than assumed empty |
| Punctuation rides on the last chip — "nose." | Kept deliberately: the child is assembling a sentence, and a full stop is part of one |
| Twelve registered block types make `speakableLines` and the two registries longer | They are exhaustive mapped types and a `switch` the compiler checks, and `speakable.test.ts` already sweeps every registered type; a missing entry cannot ship |

## Migration Plan

Nothing to migrate. Lessons are bundled with the client and travel to a room with
`switch-lesson`, so a room open on an older copy of Body Parts keeps playing it until the
teacher switches lesson; `LessonState` stores block state by block id, and a block id that
no longer exists is ignored. The change is additive: no existing block type, lesson field
or stored shape changes meaning.

## Open Questions

- Whether the memory board keeps its count of tries. It is built and shown, because the
  exercise counts it either way; whether a number belongs on a child's screen at all is a
  question for the first lesson taught with it, and removing the line changes nothing else.
- Whether Body Parts should be cut to five words (D-36) before these two blocks are added
  rather than after. Doing it first would mean writing the spots twice; doing it after means
  one lesson briefly carries seven scored exercises. The change assumes after, and selects
  by ids so that the cut is a lesson-data edit either way.
- Whether `hotspot` wants a second scene (a face, on its own) before the rest of v0.2 is
  written. Content, not behaviour: it changes what can be taught, not how any of this works.
