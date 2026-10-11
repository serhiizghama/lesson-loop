## Context

Five block types join the fourteen that exist. What they must do is in `proposal.md` and
the four delta specs. This document covers how each fits the engine. The constraints are
the ones Phase 2a met (design D145–D150), restated only where they bite:

- **The engine's rules for blocks:**
  - `init` gets a seed and `reduce` does not, so anything random is drawn in `init` and
    kept in state.
  - `reduce` returns the same object, by reference, when it refuses an action.
  - Every block must provide an `answerKey`.
- **Actions are `tap`, `pick` and `level`.** Moving on inside an exercise is a `tap`
  naming the item being left behind (scramble, yesno).
- **A line a view says must be in `speakableLines`**, or it has no recording and drops to
  the device voice. This change adds the first deliberate exception (D155).
- **Templates render through `renderTemplate(template, item)`** in `src/shared/text.ts`.
  It knows `{en} {article} {it} {be} {this} {l1} {tag:x}`, and `{it}`, `{this}` render
  capitalised.

## Goals / Non-Goals

**Goals:**

- `reveal`, `dialogue`, `talk`, `prefer`, `combine` as ordinary block types: logic in
  `src/shared`, a view in `src/blocks`, nothing in the reducer, the room or the protocol.
- Each one used by the four topics, replacing the phrases stand-ins it was waiting for.

**Non-Goals:**

- **Recording a combiner's sentences.** The teacher chose the device voice (D155).
- **Two voices for her lesson-21 dialogue.** Her page reads A and B at two pitches.
  Recordings and the device voice here have one voice each, so the combined dialogue is
  one sentence in one voice.
- **Japanese glosses on combiner chips.** Her family and places pages show them. A chip
  row with a gloss under every option doubles its height, and the topics' cards already
  carry the glosses.
- **A random reply in role-plays.** Lesson 21's role-play picks one of four replies at
  random. Here the reply is a fixed line, and the four replies live in Let's Go's
  combiner instead (D156).

## Decisions

### D151: `reveal` — three stages per item, and nothing wrong

**State:** `{ order, index, stage }`, where `stage` is 0 (blurred), 1 (peeked) or 2
(revealed).

**Actions (all `tap`):**

| Target | Effect |
|---|---|
| `peek` | `stage` 0 → 1 |
| `reveal` | `stage` 0 or 1 → 2 |
| the shown item's id | when `stage === 2` and not on the last item, moves on |

**Complete** when the last item is revealed.

**On screen:**

- The blur is a CSS filter on the picture: strong at stage 0, medium at 1, none at 2.
- While blurred, the picture is given an empty `alt` and an `aria-label` of "A hidden
  picture". Otherwise the picture's own alt text, which is the word, would answer the
  question to anything that reads it.
- The block's `speak` template is shown and volunteered at the reveal.

**Accepted:** as with the secret game (D-57), a student with developer tools could see
through the blur. The promise is about the screen.

### D152: `dialogue` — lines per item, and a swap that only relabels

**Block fields:**

- `roles: [string, string]`;
- `lines: { role: 0 | 1, text: string }[]`, each `text` a template;
- `items`.

**State:** `{ order, index, shown, swapped }`.

**Actions (all `tap`):**

| Target | Effect |
|---|---|
| `line` | shows the next line, up to `lines.length` |
| `swap` | flips `swapped`, at any time |
| the item's id | once every line is shown, moves on |

**Complete** when every line of the last item is shown.

**Who plays which role.** Unswapped, role 0 is the teacher and role 1 the student, so the
teacher asks first, as on her pages. The labels read "🛒 Shopkeeper — Teacher". A swap
moves the words "Teacher" and "Student" and nothing else (spec: nothing depends on who
taps; D-41's reasoning).

**Speech:** each new line is volunteered as it appears, and every line shown has a 🔊
that replays it on demand.

**The key** is the current item's whole dialogue: done, current (the next line) or open.

### D153: `talk` — fixed orders per level, and a cursor per level

**Block fields:** `levels: { label, lines: string[] }[]`, literal text.

**State:**

| Field | Meaning |
|---|---|
| `orders` | each level's question indices, shuffled from the seed in `init` |
| `cursors` | how far each level has been asked |
| `level` | the level of the question on screen |
| `current` | the question on screen, or none yet |
| `top` | whether a last-level question has ever been asked |

**Actions (all `tap`):**

| Target | Effect |
|---|---|
| `new` | `level` 0, asks the next question of that order |
| `harder` | `level` up by one, capped at the last; asks that level's next question |

A level's order wraps once it is used up, so no question repeats until all of its level
has been asked (spec).

**Complete** when `top` is true.

**Speech:** a question is volunteered when asked, and its 🔊 replays it on demand. The
questions are literal, so they are enumerable and recorded.

### D154: `prefer` — pairs drawn in `init`, and `{other}` in the renderer

**Block fields:** `sentence` (a template), `rounds`.

**State:** `{ pairs, index, chosen }`.

- `init` lists every unordered pair of the selection, shuffles them from the seed and
  keeps the first `rounds`.
- A pair's left/right order on screen is the stored order.

**Actions (all `tap`):**

| Target | When | Effect |
|---|---|---|
| an id in the current pair | nothing chosen yet | chooses it |
| the chosen id | already chosen, not the last round | moves on |

**Complete** when the last round has a choice.

**The renderer:** `renderTemplate(template, item, other?)` gains an optional second item.
`{other}` renders as its `en`. Validation rejects `{other}` in any template that is not a
`prefer` sentence, which is the only caller passing `other`.

**Speech:** every ordered pair's sentence is enumerated: n·(n−1) lines, 12 for four
items. All are recorded, so This or That speaks in the same voice as everything else.

**Why the sentence ends where it does:** her page says "I prefer grapes to pears
because…" and the voice stops on "because". Here the sentence ends at a full stop. The
"because…" the child is meant to finish lives in the block's hint and in the teacher's
mouth. A recording of a sentence trailing off sounds like a broken recording.

### D155: `combine` — rows, a chosen item, and a voice that is not recorded

**Block fields:**

- `rows`: each row is either an option row `{ id, label, options }` or the one item row
  `{ items: true, label }`. Row order is the order shown on screen.
- An option is `{ text, mood?: 'good' | 'bad', for?: string[] }`.
- `template`: a template whose `{row:<id>}` placeholders are replaced by the chosen
  options' text before the item placeholders are rendered.

**State:** `{ item, picks, heard }`.

| Field | Meaning |
|---|---|
| `item` | the chosen item, or none |
| `picks` | a map from row id to option index, or none |
| `heard` | the item ids a full sentence has been heard for |

**Actions (all `tap`):**

| Target | Effect |
|---|---|
| an item id | chooses the item, and clears every pick whose option's `for` excludes it |
| `row:<rowId>:<index>` | picks an option (refused if the option's `for` excludes the item) |
| `hear` | refused unless every row has a pick; otherwise adds the item to `heard` |

**Complete** when `heard` covers the selection.

**Surprise me** is computed in the view, which has the seed. The seed is mixed with how
many sentences have been heard and the current picks, so repeated presses differ. The
view then dispatches the ordinary taps: the item, then one pick per row, choosing only
options whose moods agree. No new action shape and no randomness in `reduce`.

**The mood check** is derived, not stored: the moods of the chosen options, ignoring the
ones without a mood. More than one distinct mood shows "🤔 Does that make sense?".

**Speech is the exception (spec, speech).**

- *Hear* speaks the built sentence with `'demand'`.
- No clip exists for it, so the speech module's existing fallback gives it the device
  voice.
- `speakableLines` returns nothing for `combine`, with a comment naming the exception.
- `speakable.test.ts`'s rule "every type that speaks yields lines" lists `combine` beside
  `finish` as deliberately recordless, so a new type cannot quietly join them.

**Validation** checks, at every size:

- the row ids against the template's `{row:…}` names, both ways;
- every option's `for` against the selection;
- that every selected item has at least one option in every row;
- that every selected item has an agreeing combination (what *Surprise me* needs);
- exactly one item row.

**Rejected: enumerating every combination and recording it.** It would be 240 sentences
for Fruit Talk alone. The teacher chose the device voice instead.

### D156: What each lesson gains

| Lesson | `reveal` *🙈 Guess & Say* (`speak`) | `dialogue` (replaces) | `prefer` | `talk` (replaces) | `combine` *🚀 Say More!* |
|---|---|---|---|---|---|
| Fruit Talk | over `new`, every size: "I like {en}." | *🛒 The Fruit Stand* over `new`, replacing `stand` + `stand-more` | replaces phrases, 3 rounds, `only: ["all"]` | 3 levels from her page, `only: ["all"]` | `only: ["all"]`: feel × fruit × why |
| Drink Talk | "I like {en}." | *🛒 The Drinks Café* | replaces phrases, 3 rounds | 3 levels | feel × drink × why |
| My Family | over `new`: "This is my {en}." | *📸 The Family Photo* over `new`, replacing `photo` + `photo-more` | — | 3 levels, `only: ["grand"]` | over `new`: who × adj × hobby |
| Let's Go! | "Let's go {tag:go}." | *🧭 Plan Our Day* | — | 3 levels | where × can (per place) × reply |

**The dialogues:**

- **Fruit / Drinks:** "What do you like?" / "I like {en}." / "Why do you like them?" (or
  "…it?") / "Because {they are|it is} {tag:why}." The "they are" / "it is" is written per
  lesson, not computed.
- **Family:** "Who is this?" / "This is my {en}." / "Tell me more!" / "{tag:he} is
  {tag:adj}."
- **Places:** "Where shall we go?" / "Let's go {tag:go}!" / "Great idea!"

**The combiners** use her own chip lists:

- **Fruit:** five openers with moods; twelve reasons as "they are sweet", "they are too
  sticky"…; template `{row:feel} {en} because {row:why}.`
- **Drinks:** the same openers; thirteen reasons as "it is tasty"…
- **Family:** ten adjectives and ten hobbies, no moods; template `This is my {en}.
  {tag:he} is {row:adj}. {tag:he} likes {row:hobby}.`
- **Places:** four activities per place, each `for` its place; four replies; template
  `Let's go {tag:go}! We can {row:can}. {row:reply}`

**Order in each lesson follows her pages:** the sentence, Say More, Ask & Answer, Guess &
Say, Listen, Build, the role-play, the pattern or clue games, This or That, Talk Time, the
secret game.

## Risks / Trade-offs

- **[Combined sentences are spoken in the device's voice, which differs by device and can
  be missing.]** → Chosen by the teacher. The sentence is always written out, so a silent
  device still shows what to say.
- **[`combine` validation is the most complex in the format.]** → Each rule has its own
  test with a named error. "Surprise me needs an agreeing combination" is checked by the
  same function the view uses, so the two cannot disagree.
- **[Five types at once move the fixture's star counts by five.]** → Updated in the
  fixture task, as in Phase 2a.
- **[A role-play's swap could be taken for a rule.]** → The guide's row says plainly that
  it changes the labels only.

## Migration Plan

- Additive. The four lessons change content; a lesson open in a room keeps its copy until
  reopened.
- Rollback is reverting the change. No stored data depends on it.
