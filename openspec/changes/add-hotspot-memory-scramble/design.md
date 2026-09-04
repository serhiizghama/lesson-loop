## Context

See `proposal.md` — Why. What matters here is what the engine already provides, because
this change is meant to add three exercises without adding machinery.

- A block type is a member of the `Block` union, a `BlockLogic` in the shared registry
  (`scored`, `init`, `reduce`, `isComplete`, `answerKey`), a view in the client registry,
  a Zod branch plus cross-checks in `validate.ts`, and a branch in `speakableLines`. The
  two registries are exhaustive mapped types: a member without an entry is a compile error.
- The action set is generic and already covers two-step tapping: `pick` carries a side
  (`match`: which column; `sort`: item or bucket) and `tap` carries a target (`cards`:
  which card; `listen`: which answer; `tpr`: which instruction is being left behind).
- The model is pure and has no clock, no identity and no randomness: `applyAction` runs
  optimistically in the browser and authoritatively in the Durable Object, and every
  shuffle comes from the lesson's seed mixed with the block id and its reset generation.
- Speech reaches a view as a prop already wrapped by the lesson's sound setting
  (`quietable`), so a line spoken with the default intent is suppressed while the lesson is
  quiet without the view knowing the rule exists.
- `src/shared` may not import React or touch the DOM; `src/shared/purity.test.ts` enforces
  it.

Decisions are numbered `Dn` continuing the project's sequence; the last taken is D83
(`add-star-trail`). Product decisions in `docs/PLAN.md` §12 use `D-n`; the last taken
there is D-27.

## Goals / Non-Goals

**Goals:**

- Three exercises expressed entirely in the existing contract: no new action, no new field
  on `LessonState`, no new message on the wire, nothing new persisted by the room.
- One drawing in the app, and everything else about a labelled diagram in the lesson.
- Both screens agree on every layout — a card board, a shuffled bank of words, a scrambled
  sentence — from the seed alone, as the six existing types already do.
- Each of the three taught by a real lesson at the end of this change.

**Non-Goals:**

- A general scene system: one scene, one shape of place (a rectangle), no editor and no
  authoring tool for either.
- Any change to the player, the teacher's panel, the room, the protocol or speech itself.
- Undo of a placed word, drag anywhere, per-person scoring, or a timer of any kind.

## Decisions

### D84 — Three logic modules and three views, and no new machinery anywhere else

Each type is one file under `src/shared/blocks/` (logic, answer key) and one under
`src/blocks/` (view), registered in the two existing registries. `reducer.ts`,
`room.ts`, `protocol.ts`, `LessonPlayer.tsx` and `TeacherPanel.tsx` are not touched.

*Why:* this is exactly the extension point the engine was built around — the v0.1 design
made block types a registry precisely so that the seventh, eighth and ninth cost no
surgery. If any of the three had needed a new action or a new field on the shared state,
that would have been a signal the mechanic did not belong in this engine yet.

*Rejected:* giving `memory` an identity-carrying action so it could tell whose turn it is.
That would put the sender's role into `applyAction`, which is pure and identity-free by
design (D9), for one exercise. It is the reason the exercise is cooperative — see D89.

### D85 — Scene names live in shared code, the artwork lives in the client

`src/shared/scenes.ts` exports the scene ids and each scene's aspect ratio — data only, no
React — so `validate.ts` can reject an unknown scene inside the Durable Object as readily
as in the browser. `src/scenes/` holds the drawings themselves as React components with
inline SVG, registered in a mapped type keyed by the same ids.

*Why:* validation is shared and must stay importable by the Worker; artwork is a component
and cannot be. Splitting them at the name is the only line that keeps both true.

*Rejected:* putting the SVG source in shared as a string and dangerously setting it as
HTML — a string of markup interpolated into the page for no gain over a component.
*Rejected:* an asset file fetched at runtime — the app deliberately has no service worker
(D22) and the lesson must play with the network gone.

### D86 — A place is a normalised rectangle in the lesson, keyed by item id

`"spots": { "nose": [0.45, 0.13, 0.10, 0.05] }` — x, y, width, height as fractions of the
drawing. Validation rejects a scene the app does not carry, a selected item with no spot, a
rectangle outside the unit square, and a zero width or height.

*Why:* fractions survive every viewport, and keying by item id means the lesson's own
vocabulary decides what is asked. Two lessons can label the same body with different words
without touching the drawing.

*Rejected:* the geometry inside the scene — then the drawing would decide which words a
lesson teaches, and a second lesson on the same figure could not choose its own subset.
*Rejected:* polygons or SVG path targets — a rectangle is enough for every part of a body,
and a polygon editor is a tool this project does not have.
*Rejected:* the whole drawing inline in the lesson JSON (the alternative offered to the
client, and declined): a lesson file half of which is `<path d="…">` is no longer something
a non-programmer reads, which is the entire point of the format.

### D87 — `hotspot` is `sort` with a picture instead of buckets

State is `{ order, selected, placed, wrong }`: the bank order from the seed, the word being
held, the items already placed, and the last refusal. Side `a` of `pick` is a word, side
`b` is a place. A place tapped with nothing selected returns the state by reference, so it
is a no-op and not a mistake.

*Why:* it is the same interaction the learner already knows from sorting — pick a thing,
pick where it goes — and reusing the shape means reusing its tested reducer semantics
(identity on refusal, `wrong` cleared by the next action).

### D88 — A small place keeps a big tap target

The rendered place is a button positioned by the declared rectangle and inflated to at
least 44 px in each dimension around the same centre; the visible outline stays the
declared rectangle. Where two inflated targets overlap — eyes and nose on a small screen —
the one whose declared rectangle contains the point wins, and otherwise the nearest centre
wins.

*Why:* the spec asks for tap targets a child can hit with a finger, and a nose on a 380 px
screen is about 20 px wide. Growing the visible outline instead would make the drawing
wrong.

*Rejected:* refusing small rectangles in validation — the lesson author would have to
compensate for a phone by drawing an anatomically wrong nose.

### D89 — `memory` is cooperative, and a miss is cleared by the next tap

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

*Why cooperative:* an action does not carry who sent it (D84), so a turn would be a rule
the app draws and cannot enforce, in an app whose other two rules about who may act — the
lock and the pacing — are enforced by the room precisely because a browser rule aimed at a
child is undone by a reload (D14, D23). `tries` is a count, not a score: nobody is ranked
and nothing is timed.

*Rejected:* turn-taking as an honour system with a "whose turn" banner. It is the client's
stated preference to have it, and it may return as its own change once a real lesson shows
the pair actually take turns — but it should arrive with a way to mean it.

### D90 — `memory` speaks like `match`, because it is a pairing exercise

Turning a card up speaks that card's face (a picture is named by its English word, a
first-language gloss stays unspoken — `faceSpeech`). Closing a pair speaks the block's
declared line if it has one, and the closing tap then stays silent rather than being cut
off a syllable in — the same rule `MatchView` already follows.

### D91 — `scramble` is `listen`'s progression with `sentence`'s rendering

State is `{ order, index, placed, wrong }`: the items in shuffled order, which one is being
built, the chip indices already placed in the order they were placed, and the last refused
chip. The chips for the current item are derived — the block's template rendered for that
item, split on whitespace, shuffled with a seed mixed with `index` — never stored, exactly
as `listenChoices` derives its pictures. `pick` (side `a`, target = the chip index as a
string) places a word; `tap` with the current item's id advances past it, following `tpr`'s
convention that the action names the thing being left behind, so a duplicate or stale tap
is a no-op rather than a skipped sentence.

A chip is accepted when its **text** equals the next expected word, not when its index is
the expected one: a sentence containing "my" twice must accept either chip, or the child is
being asked to read the shuffler's mind.

*Rejected:* storing the chips in the state — it would be the first block state that is not
derivable from the seed, and it would grow `LessonState` for every sentence.
*Rejected:* free assembly with a check at the end — a seven-year-old assembling four words
wrong and being told so at the end learns less than one who is stopped at the wrong word,
and the app's other exercises all refuse the wrong move at the moment it is made.

### D92 — `scramble` speaks the finished sentence and nothing else

A placed word is not spoken; the whole sentence is, once, when the last word lands.

*Why:* the sentence is the unit being taught. It is the same reason `match` speaks the
completed pair rather than the tile — and a voice reading "This… is… my… nose." word by
word teaches an accent nobody wants. It also keeps `speakableLines` to one line per item
rather than one per word, which keeps the prepared recordings (D52) honest.

### D93 — The answer keys say positions in words, never in numbers a teacher cannot say

- `hotspot`: each word with where it is, derived from its rectangle's centre as a vertical
  third and a horizontal third — "top · centre", "middle · left". Marked done as it is
  placed, current while it is the word being held.
- `memory`: each pair with the 1-based positions of its two cards on the board — "3 & 8" —
  marked done once found.
- `scramble`: every item's full sentence, the one being built marked current.

*Why:* the key is read aloud by a person over a video call (D15). "Nose — top · centre" is
sayable; `[0.45, 0.13]` is not.

*Rejected:* hiding the card positions from the teacher because it "spoils" the memory game.
The teacher's screen exists to let her guide, and a key that omits the only thing worth
knowing would send her back to guessing along with the child.

### D94 — The three land in her two lessons, and the body scene is traced from her own page

`lessons/body-parts.json` gains **Label the Body** (`hotspot`, scene `body`, after the
sentence exercise, where her original page had it) and **Build It** (`scramble`,
`{this} {be} my {en}.`). `lessons/animals.json` gains **Memory** (`memory`, picture against
word, six pairs). The `body` scene reproduces the figure in
`docs/reference/body_parts_lesson.html`, and its spots are that page's hotspot rectangles
converted to fractions of the 220 × 420 drawing.

*Why:* the original page is the specification for what she expects to see, and converting
its numbers is both faster and more faithful than inventing a layout.

## Risks / Trade-offs

| Risk | Mitigation |
|---|---|
| **The narrow exception in D85/D86 becomes the rule** — a lesson author eventually wants a face, a room, a kitchen, and each needs a developer | The exception is written into the spec as narrow and the scene is artwork only; if a third scene is ever asked for, that is the signal to build authoring, not to add a fourth by hand |
| Eyes, nose and mouth sit within a few pixels of each other on a phone | D88's inflated targets with the containing-rectangle-wins rule; the acceptance run includes the body diagram at 380 px |
| A twelve-card memory board plus the header does not fit a narrow window | The block declares `count`, both lessons use six pairs, and the grid reflows by column count rather than by a fixed layout; checked at 380 px |
| Both people tap a memory board at once and one sees a card turn up and immediately down | The room applies one action at a time and broadcasts the whole state (D10); the second tap is either a legal transition from what the first produced or a no-op. Nothing here is worse than the same race in `match`, which has been played |
| A `scramble` template whose `{article}` renders empty leaves an empty chip | `renderTemplate` already collapses whitespace before returning; splitting the rendered line therefore cannot produce an empty word, and a test pins that for a plural item |
| Punctuation rides on the last chip — "nose." | Kept deliberately: the child is assembling a sentence, and a full stop is part of one |
| Nine block types make `speakableLines` and the two registries longer | They are exhaustive mapped types and a `switch` the compiler checks; a missing entry cannot ship |

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
- Whether `hotspot` wants a second scene (a face, on its own) before the four to six new
  lessons of v0.2 are written. Content, not behaviour: it changes what can be taught, not
  how any of this works.
