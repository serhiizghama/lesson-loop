## Context

Two new block types join the twelve that exist, and one rule changes in validation. What
they must do is in `proposal.md` and the four delta specs. This document covers how each
fits the engine's contract without touching the reducer, the action set or the room.

Constraints that shape every decision below:

- **The block contract** (`src/shared/blocks/contract.ts`):
  - `init(lesson, block, seed)` gets a seed; `reduce` does **not**. Anything random must
    be decided in `init` and kept in the block's state.
  - `reduce` must return the same state object, by reference, when it refuses an action.
  - `answerKey` is required, and has one uniform shape: a title and rows.
- **Actions are fixed:** `tap { target }`, `pick { side, target }`, `level`. A new block
  type is expected to express itself in these. Scramble's "Next word →" is the precedent
  for a learner moving on inside an exercise: a `tap` naming the item being left behind.
- **Speech is enumerated ahead of time.** `speakableLines` must return every line a view
  can speak, or the line has no recording and drops to the device voice. A spec test holds
  the views to this.
- **Registries are checked:**
  - `blockViews` must cover every type (the type checker enforces it);
  - the guide must have a row per playable type (`src/ui/guide.test.tsx`);
  - `tests/support/play.ts` plays types by name and *silently skips* unknown ones;
  - the shared fixture lesson must contain a block of every type, and some UI tests count
    its stars.

## Goals / Non-Goals

**Goals:**

- `yesno` and `secret` built as ordinary block types: logic in `src/shared`, a view in
  `src/blocks`, nothing in the reducer, the room or the protocol.
- `only: ["all"]` as a validation change alone.
- The four Phase 1 lessons use both new types, which replace the phrases stand-ins.

**Non-Goals:**

- Lesson 21's follow-up ("No, I don't" → "Where do you want to go?" → pick another place).
- Extra stars for finding a secret on the first try, as her page gives. A star in this app
  is the exercise's, earned by finishing it (D-28), never a score.
- A timer, a tries counter shown to the child, or any "found in N tries" line.

## Decisions

### D145: `yesno` decides in `init` which item each question names

The block's state is:

| Field | Meaning |
|---|---|
| `order` | the selected items, shuffled from the seed |
| `asked` | `asked[i]` is the item the question at position `i` names |
| `index` | the position on screen |
| `answer` | `'yes'`, `'no'` or `null` for the current position |
| `wrong` | `'yes'`, `'no'` or `null` |

How `asked` is filled:

- **In an opinion,** `asked[i]` is simply `order[i]`.
- **In a check,** for each position a sub-seed (`seedFor(seed, 'asked', i)`) decides
  between the item shown and another selected item, which a second sub-seed picks.

All of this happens in `init`, because `reduce` has no seed. Both screens therefore ask
the same question, and a reset (which bumps the block's generation, and with it the seed)
asks a fresh set.

**Rejected: deriving `asked` in the view from the seed.** The view does get the seed, but
then the answer key and the reducer, which decides whether *Yes* is right, would each have
to re-derive it. One decision, made once, stored once.

### D146: `yesno` answers and moves on with `tap`, the way scramble does

- `tap { target: 'yes' | 'no' }` answers the current item:
  - **In an opinion,** either answer sets `answer`.
  - **In a check,** the true answer sets `answer`; the other sets `wrong` (and repeating
    the same wrong answer returns the state by reference).
  - Once `answer` is set, further yes/no taps are refused.
- `tap { target: <id of the item shown> }` moves on (`index + 1`, `answer: null`). It is
  accepted only once the item has an answer. Naming the item being left behind means a
  double tap cannot skip the next one (scramble's D131 reasoning).
- **Complete** when the last item has an answer, with no tap needed after the final reply
  (spec: *without depending on a tap after the last reply*).

`yes` and `no` cannot collide with item ids, because validation rejects a selection that
contains an item with either id.

**Rejected: `pick { side: 'a' | 'b' }` for the two answers.** It reads as "left and right
of a pair", which is the wrong picture for a reader of the reducer. `tap` with a named
target says what happened.

### D147: `secret` keeps its whole sequence of secrets in state, and shows tiles in file order

The block's state is:

| Field | Meaning |
|---|---|
| `order` | the selected items, shuffled from the seed; round `r` hides `order[r]` |
| `round` | the round being played |
| `tried` | the items already guessed wrong this round |
| `found` | whether this round's secret has been revealed |

- `tap { target: id }` when not `found`:
  - the secret's id → `found: true`;
  - a not-yet-tried id → added to `tried`;
  - a tried id → refused, same state by reference.
- `tap { target: <the secret's id> }` when `found` → next round: `round + 1`, `tried: []`,
  `found: false`.
- **Complete** when `round === rounds - 1` and `found`.

**Tiles are laid out in the lesson's item order, never in `order`.** Laying them out in
`order` would put the secret first in round one, and that would be the answer on the
student's screen. The hidden picture is the same 🎁 for every round.

**Accepted, not mitigated:** the secret is in the state broadcast to the student's device,
so a student with developer tools could read it. The spec promises the *screen* never
shows it, and the users are children on a lesson call. Hiding state per participant would
mean a second state shape on the wire for one game.

**Rejected: re-drawing the secret from the seed in `reduce`.** There is no seed there
(see Context).

### D148: `only: ["all"]` is a validation change, and `narrow` already does the rest

`narrow(topic, part)` keeps a block when `only` includes the part's id. `all` is never a
part's id, so a block with `only: ["all"]` is dropped from every part. `narrow(topic,
'all')` keeps every block. That is the specified behaviour with no change to `narrow`.

Validation changes in three ways:

1. A block's `only` may name `all` alongside, or instead of, part ids.
2. A part whose id is `all` is rejected, because it would be unreachable as an address and
   ambiguous in `only`.
3. A topic without parts naming `all` keeps getting today's "belongs to a part the topic
   does not declare" error. A topic with no parts has nothing to be "only" about.

The word is `WHOLE` from `narrow.ts`, the constant the address already uses, not a second
spelling.

### D149: What each lesson gains

| Lesson | Replaces | With |
|---|---|---|
| Drink Talk | `ask` phrases | `yesno` opinion over all: *Do you like {en}?* → *Yes, I do. I like {en}.* / *No, I don't. I don't like {en}.* |
| | (new) | `secret` *🎁 Guess My Secret Drink*, 2 rounds: guess *Do you like {en}? No, I don't.*, found *Yes, I do! I like {en}.* |
| Let's Go! | `want` phrases | `yesno` opinion: *Do you want to go {tag:go}?* → *Yes, I do. Let's go {tag:go}.* / *No, I don't.* |
| | (new) | `secret` *🎁 Guess My Secret Place*, 2 rounds: guess *Is it {tag:np}? No, it isn't.*, found *Yes, it is! Let's go {tag:go}.* New tag `np`: the park / school / home / the zoo |
| My Family | `yours`, `yours-more` phrases | one checked `yesno` over `new` (4 words in `home`, 2 in `grand`, 6 whole): *Is this your {en}?* → *Yes, it is. This is my {en}.* / *No, it isn't. This is my {en}.* |
| | (new) | `secret` *🎁 Guess My Secret Person* over all, 2 rounds: guess *Is it your {en}? No, it isn't.*, found *Yes, it is! This is my {en}.* |
| Fruit Talk | `ask` phrases (`only: b`) | `yesno` opinion over all, `only: ["all"]`: *Do you like {en}?* → *Yes, I do. I like {en}.* / *No, I don't. I don't like {en}.* |
| | `prefer`, `talk` (`only: b`) | the same blocks, `only: ["all"]` |

**Why two rounds:** one round is over in a guess or two, and four rounds over four items
make the last round a certainty. Her page plays one round per "New secret" press; two is
that, played twice.

**Why My Family's check is one block over `new`, not one per part:** the replies quote
whatever the sitting teaches, so the per-part split the phrases needed (D141) no longer
applies. Both parts select at least two words, so a check can always be false.

### D150: The views

- **`YesNoView`:**
  - the picture of the item shown (`Picture`, as everywhere);
  - the question, written large, with a 🔊 control that speaks it. The control speaks with
    the sound off too, because it exists to be pressed;
  - *Yes ✅* and *No ❌* buttons; a wrong answer shakes the button, as other blocks shake
    a wrong choice;
  - the reply once answered, spoken when the sound is on;
  - *Next →* while an answered item is not the last.
- **`SecretView`:**
  - the 🎁 card, which becomes the secret's picture when found;
  - one tile per selected item, in file order; a tried tile is dimmed and crossed out;
  - the `guess` line spoken on a wrong tile and the `found` line on the secret;
  - *Next secret →* while a found round is not the last.

Both views go inside the stage's fixed shape, and their styles are appended to
`blocks.module.css` only.

## Risks / Trade-offs

- **[A checked question is false about half the time, so a child can guess *No* and be
  right half the time.]** → That is the nature of a yes/no question. The reply that follows
  ("No, it isn't. This is my mom.") is the teaching, whichever way the answer went.
- **[Fixture and UI tests count blocks.]** → Adding two blocks to the shared fixture will
  move hard-coded star counts in `student-view.test.tsx` (seen when `quiz` landed). Update
  them as part of the fixture task, not as an afterthought.
- **[`tests/support/play.ts` skips unknown types silently.]** → The task that registers the
  types also teaches `play.ts` to play them, and `tests/playthrough.test.ts` must fail
  first if it does not.
- **[The secret is in the broadcast state (D147).]** → Accepted, see D147.

## Migration Plan

- No lesson needs migrating to keep working: the two types are additive, and `only:
  ["all"]` is new syntax.
- The four lessons change content, and a lesson in progress in a room keeps its own copy
  until it is reopened (D-48 behaviour, unchanged).
- Rollback is reverting the change. No stored data depends on it.
