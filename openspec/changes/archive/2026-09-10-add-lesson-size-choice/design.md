## Context

See proposal.md — Why.

What the code already does, and constrains this design:

- `ItemRef` is `{select:'all'} | {select:'ids', ids} | {select:'tag', tag}`, resolved by
  `resolveItems(lesson, ref)` in `src/shared/validate.ts`.
- `validateLesson` already cross-checks a lesson against its own selections: a sort bucket
  no selected item falls into, a `match.count` above the number of items selected, a
  `listen.choices` above it, a face an item cannot render, a template tag an item lacks.
  These are exactly the checks that a per-size lesson can fail while the file as a whole
  passes.
- `animals-2` already implements the cumulative model by hand: teaching blocks name the
  five new words by id, `sort` and `listen` select `all` over ten. This change derives that
  arrangement instead of authoring it.
- A room is opened by `POST /api/rooms` carrying `{lesson, state}`. **The Worker has no
  lesson catalogue** — the lesson travels as data. So anything resolved before a lesson is
  played is automatically invisible to the room, the Durable Object and the protocol.
- The router is about thirty lines over four routes and holds two path segments.
- `src/shared` may not import React or touch the DOM (`purity.test.ts`).

## Goals / Non-Goals

**Goals:**

- One place where a topic plus a choice becomes a lesson, pure and testable.
- Nothing downstream of that place learns a new concept.
- The migration is provably content-preserving: each derived lesson equals the file it
  replaces, word for word and block for block.
- Every size a topic offers is checked at load, so a bad size fails on the home screen and
  never in front of a child.

**Non-Goals:**

- Remembering which part was taught last, or which words a student has met. That needs
  storage, and the MVP has none (PLAN §2).
- Letting the teacher tick individual words. Rejected below.
- Choosing a size after a lesson has started, or from inside a room.
- Grouping the home screen's cards by topic. The card count does not grow — the topics that
  had two cards go back to one — so the pressure that would justify it falls rather than
  rises.

## Decisions

### D1 — Narrowing happens before anything is played, and produces an ordinary `Lesson`

`narrow(topic, choice): Lesson` is a pure function in `src/shared`. It filters items,
filters blocks, and rewrites every `{select:'new'}` into `{select:'ids', ids:[…]}`. What
comes out contains no parts and no new selector — it is the same `Lesson` the player,
reducer, room and wire already handle.

This is the decision the rest of the design hangs on. The room protocol, `applyAction`,
the Durable Object and `LessonState` are untouched, and no test of them changes. The size
is not a setting that travels; it is a lesson that was built.

*Rejected:* carrying the choice in `LessonState` and resolving selections at play time.
It would put a lesson-authoring concept into the state broadcast on every tap, force the
reducer to know about parts, and give the room a second thing to keep in step — for a
choice that never changes once a lesson has started.

*Rejected:* narrowing in the Worker when a room is created. The lesson already travels as
data, and the solo path needs narrowing anyway; doing it twice in two places would be the
only way to have it in the Worker at all.

### D2 — `parts` and `select:'new'` live on the same types, and a test enforces their absence

`Lesson` gains `parts?: Part[]`, `ItemRef` gains `{select:'new'}`, and `Block` gains
`only?: string[]`. A lesson that has been narrowed carries none of the three, and that is
held by a test over the output of `narrow` rather than by the type system.

*Rejected:* a separate `Topic` type with its own block union. It is the honest model — an
authored topic and a built lesson really are different things — but `Block` is a
ten-arm discriminated union, and a second copy of it to express one optional field on the
input side is a large, permanent cost. A five-line test buys the same guarantee.

### D3 — A part is cumulative in vocabulary, exclusive in exercises

Choosing part *k* gives items from parts 1..*k*, and `new` resolves to part *k* alone.
Choosing the whole topic gives every item, and `new` resolves to all of them.

Exercises do not follow that rule: a block declares `only: ['wild']` and appears when
`wild` is the chosen part, not when a later part carries `wild`'s words. The whole-topic
choice carries every block whatever it declares.

The asymmetry is not an accident of implementation — it is the difference between what a
sitting *has* and what a sitting *is*. Part two has ten words because "Where do they live?"
needs a second bucket (D-37, and the flaw in the teacher's own file). Part two is not
part one's sitting, so it does not carry part one's model phrases, which quote part one's
words.

*Rejected:* making blocks cumulative too. Shapes part two would then carry both parts'
`phrases` blocks, and a child would be walked through "It is a circle." on the day she is
learning stars.

*Rejected:* dropping a block automatically when its selection comes out empty or too
small. It is implicit where `only` is explicit, it cannot express the phrases case at all
(both parts' phrase blocks are non-empty), and a block silently vanishing is the kind of
thing a teacher discovers mid-lesson.

### D4 — `only` names part ids, not indices

A part is `{ id, title, items: string[] }`, and a block says `only: ['wild']`. Ids survive
re-ordering the parts and re-reading the file six months later; `only: [2]` does not.

### D5 — The address is `/l/<topic>/<choice>`, and `/l/<topic>` is the chooser

`/l/animals/known`, `/l/animals/wild`, `/l/animals/all`. A bare `/l/animals` opens the
topic with its sizes offered — which is the honest answer for a topic that is no longer one
lesson. A topic with no parts opens its lesson at `/l/<topic>` directly, exactly as today,
so the four un-parted files keep working with no address change.

The router grows a third segment for `l` only. `not_found_handling` already returns the app
for any unmatched path, and `/l/*` is not a Worker path, so `wrangler.jsonc` does not
change.

*Rejected:* `?size=` query strings. The router parses a pathname today and nothing else
reads the query; a segment costs one line where a query parameter costs a new dimension.

**BREAKING:** `/l/animals-1`, `/l/animals-2`, `/l/shapes-1`, `/l/shapes-2` stop resolving
and fall to the app's "there is no such lesson" screen. The addresses are not published
anywhere, are not in any student's hands (a student holds `/r/<code>`), and the app has one
user, so they are dropped rather than redirected.

### D6 — Validation runs over every size, and reports which size failed

`validateLesson` keeps its current cross-checks and gains a loop: for each choice the topic
offers, narrow, then cross-check the result. An error is prefixed with the size it belongs
to. The lesson list on the home screen already renders load failures, so a bad size is
visible where a lesson is chosen.

Structural checks on `parts` themselves — an unknown item id, an item claimed by two parts,
a part naming no items, a block's `only` naming an unknown part — run once, before the
per-size loop, because a malformed `parts` makes every derived size meaningless.

This is the check that would have caught the defect in the teacher's own file, where part
two's five animals all live in the jungle.

### D6a — A built lesson is named after its size: `animals/wild`

Added during implementation, after a room opened on a part came up blank in a real
browser. The room does **not** send the lesson over the socket: both participants resolve
the lesson the room is on from their own copy of `lessons/`, by the id in `LessonState`
(`useRoom.ts`), and `applyAction` refuses an action whose state names a different lesson
than the one being played. So a playable lesson has to be *findable by name*, and every
size is a playable lesson.

`narrow` therefore gives what it builds the id `<topic>/<choice>` — the address without
its `/l/` — and `lessons.ts` splits into `topicById` (the file, for the home screen) and
`lessonById` (a size, narrowed on the way out). `RoomLesson` offers the teacher the sizes
rather than the files when she changes the room's lesson, since a topic is not playable.

Two consequences, both recorded rather than hidden:

- **The size does reach `state.lessonId`, and therefore the wire.** No message *shape*
  changes and nothing learns what a part is — but the claim "nothing about the choice
  reaches the wire" was too strong, and the spec says so now. This is what `animals-2`
  already did when it was a file: the id names which lesson is being played, and a part
  is a lesson.
- **A lesson id may carry one slash.** `lessonSchema` allows `<topic>/<size>` because a
  built lesson is validated like any other when it arrives on `switch-lesson`; a lesson
  *file* still declares a plain topic id, which `lessons.test.ts` holds.

Pictures are filed by topic, so `animals/known` and `animals/wild` draw one set.

*Rejected:* sending the lesson on join. It is the cleaner architecture and it is a change
to the room protocol — the one thing this change set out not to touch — and the solo path
would still need `narrow` anyway.

### D7 — Switching size starts a fresh lesson, by keying on the address

`App` keys `SoloLesson` on `lesson.id` today. It will key on the full route — topic plus
choice — so choosing another size mounts a new player with a new seed and empty state. This
falls out of the routing decision; no explicit reset is needed.

### D8 — The choice expands on the topic's card, in place

Tapping a topic with parts expands its card to show its sizes; tapping a size starts the
lesson. No intermediate screen, and the card is where the teacher's attention already is.
Each size says what it teaches ("5 new words · You Know These", "all 10 words"), because a
bare `5 / 10` asks her to remember which half is which.

The whole-topic label counts the topic rather than saying "10": Shapes has eight.

*Rejected:* a persistent 5/10 bar over the whole home screen. It cannot express *which*
half, which is the half of the problem the teacher actually named.

*Rejected:* a separate setup screen per topic. It is a screen between her and a lesson she
has already chosen, every single time, including for topics with no parts at all.

### D9 — Migration is verified by equality, not by eye

The four files being replaced (`animals-1`, `animals-2`, `shapes-1`, `shapes-2`) are kept
as fixtures, and a test asserts that narrowing the merged topic to each choice yields them.
Two deliberate differences are recorded in the fixture rather than hidden:

- `animals-1`'s block order (`listen` sits fifth) versus `animals-2`'s (`listen` sits
  eighth). One file has one order; the merged topic uses `animals-2`'s, so part one's
  `listen` moves to the end. It is the same exercise over the same words.
- The derived lesson's `title` and `emoji` come from the part, so part one is still
  "Animals 1 · You Know These" with 🐶.

Once the tests pass, the four files are deleted in the same change.

## Risks / Trade-offs

- **The whole-topic choice re-enables exactly what D-36 warned against** — ten words in one
  sitting → It is offered because the teacher asked for it, and because the app's job here
  is to stop deciding for her. The default presented first is still a part.
- **`only` is a third way for a block to be conditional**, after `items` and the block's own
  type → It is one optional field with one rule ("belongs to every sitting unless it says
  otherwise"), and without it the migration cannot reproduce the shipped lessons.
- **Per-size validation multiplies the cross-check work by the number of parts** → A topic
  has two or three parts and ten items; this runs at module load over eight files and is
  invisible. `lessons.test.ts` already validates every file on every test run.
- **A topic file gets longer and holds two audiences' worth of blocks** → It is still one
  file a non-programmer can read, and it is shorter than the two files it replaces, which
  duplicated every item.
- **The four un-parted topics stay ten-word lessons until their parts are authored** → That
  is today's behaviour exactly, and this change carries their parts as its own tasks rather
  than leaving them.

## Migration Plan

1. Types, `narrow`, and validation land first, with the existing eight files untouched and
   passing — nothing in the format is compulsory, so every current file stays valid.
2. `animals.json` and `shapes.json` are authored and the equality tests pin them to the
   four files they replace.
3. The four replaced files are deleted, and the router and home screen ship the choice.
4. `colours`, `body-parts`, `food` and `numbers` gain their parts. Each is additive: if a
   part declaration is wrong, per-size validation refuses it at load and the file is fixed;
   nothing about the topic's un-parted behaviour is lost until its parts are right.

Rollback is one revert; the app has no stored state that would outlive it.

## Open Questions

- Whether the whole-topic choice should be offered at all for topics with parts, or only
  the parts. Answerable from one real lesson — it changes a list of choices, not the model.
- Whether a third part is ever wanted (Shapes could be 3+3+2). The design already allows
  any number; only the content decision is open.
