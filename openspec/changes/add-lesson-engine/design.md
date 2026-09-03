## Context

Greenfield codebase; nothing exists yet beyond `docs/PLAN.md`. See proposal.md — Why for
the motivation, and the five delta specs for the behaviour being contracted.

Two constraints shape every decision below and neither is negotiable inside this change:

1. **The next change runs this code on a server.** `add-synced-rooms` puts the same state
   transitions inside a Cloudflare Durable Object as the authoritative copy. Anything the
   reducer touches must therefore exist in a Worker: no `window`, no DOM, no React, no
   `Math.random` at transition time, no `Date.now()`.
2. **Two devices must agree without talking.** Given the same state and the same action
   they must reach the same screen, including shuffled orders. This is what lets the
   client apply a tap optimistically instead of waiting for a round trip.

## Goals / Non-Goals

**Goals**

- A `src/shared/` module that is pure TypeScript, imports nothing from React or the DOM,
  and can be bundled into a Worker unchanged.
- Adding a block type touches exactly two files plus two registry lines; adding a lesson
  touches one JSON file and nothing else.
- Every spec scenario that concerns state has a unit test, because these are the invariants
  the next change is going to lean on.

**Non-Goals**

- No transport, no room, no roles, no persistence — the state lives in React memory and
  dies with the tab.
- No design system. Hand-written CSS modules and a small token file; the visual polish
  pass comes after the teacher has used it once.
- No lesson authoring tooling. Lessons are hand-written JSON validated in CI.

## Decisions

### D1 — Layout: `shared/` is pure, `blocks/` is React, and a test enforces it

```
src/
  shared/            # no React, no DOM — bundled into the Worker later
    types.ts         # Lesson, Item, Block, LessonState, Action
    validate.ts      # lesson validation
    rng.ts           # seeded PRNG
    reducer.ts       # applyAction + selectors
    blocks/          # one file per type: init, reduce, isComplete  (pure)
  blocks/            # one file per type: the React view            (impure)
  ui/                # shell, progress, lesson picker
  speech/            # speechSynthesis wrapper
lessons/             # animals.json, body-parts.json
```

A block type is registered twice: its logic in `shared/blocks/index.ts`, its view in
`blocks/index.ts`. The split is not bureaucracy — it is the line the Worker will be cut
along, and it is cheaper to hold it from the first commit than to untangle it later. A
Vitest test walks the import graph of `src/shared/` and fails on any import of `react`,
`react-dom`, or a DOM global. **Rejected:** a single co-located module per block with the
view and the reducer together (nicer to read, but the Worker would then pull React into
its bundle, and the invariant would rot the first time someone reached for `window`).

### D2 — State is one serialisable tree, versioned, with lazily derived block state

```ts
type LessonState = {
  v: number                              // increments on every applied action
  lessonId: string
  slide: number
  seed: number                           // decided once, when the state is created
  blocks: Record<string, BlockState>     // only blocks the learner has reached
  resets: Record<string, number>         // per-block reset generation, default 0
}
```

A block's state is created on first interaction, not up front, so a fresh lesson is a tiny
object and a late joiner in the next change receives almost nothing. Because creation is
deterministic (D3), lazy and eager creation are observationally identical — which is
exactly why lazy is safe.

### D3 — Shuffled order comes from a seeded PRNG, not from `Math.random`

The seed is drawn once when the lesson state is created — the only impure moment in the
whole model — and stored in the state. A block's presentation order is derived by
`mulberry32(hash(seed, blockId, resets[blockId]))` at block initialisation and stored in
its state. Resetting a block bumps `resets[blockId]`, so the learner gets a genuinely new
order while the transition itself stays pure.

**Rejected:** having the initiating client shuffle and ship the resulting order inside the
init action. It works, but it presumes a designated initiator, and in the next change the
room is symmetric — teacher and student both act — so there is no natural owner of "the
first shuffle". **Also rejected:** re-shuffling at render time (the two screens would
disagree the instant either re-rendered, which is the whole failure this design exists to
prevent).

### D4 — Actions are flat, block-scoped, and validated inside the reducer

```ts
type Action =
  | { t: 'nav';   slide: number }
  | { t: 'reset'; block: string }
  | { t: 'tap';   block: string; target: string }        // cards, listen, tpr
  | { t: 'pick';  block: string; side: 'a' | 'b'; target: string }  // match, sort
  | { t: 'level'; block: string; level: number }         // sentence
```

`applyAction(lesson, state, action): LessonState` takes the lesson because block state
depends on lesson data, and returns a new state or the identical reference when the action
is invalid. Returning the same reference is how "the version does not advance on a rejected
action" is implemented and how React skips the re-render. Every rejection path is silent by
contract — the reducer never throws, because in the next change it will be fed by a remote
peer whose view of the lesson may be stale.

**Rejected:** per-block action unions with block-specific type names (`match/pick`,
`sort/pick`, …). More precise types, but the transport in the next change would need a
registry of names to route on, and every new block type would touch the protocol.

### D5 — Sentence grammar is declared on the item, not inferred from the word

`It is an eye` and `They are eyes` cannot be derived reliably from spelling: "an hour" and
"a unicorn" defeat the vowel-letter rule, and English plurals are not a suffix test. The
`Item` therefore carries optional `plural?: boolean` and `article?: 'a' | 'an' | 'none'`;
the vowel-sound heuristic is only the default when `article` is absent. (`'none'` was added
while porting Body Parts: "hair" is uncountable, and *It is a hair.* is wrong in a way a
child would repeat aloud.) Getting this wrong is worse than in an ordinary app — the
artefact being produced here is a sentence a child will repeat aloud.

### D6 — Lessons are validated by zod, at load time and in CI

Zod earns its place by producing the path-accurate message the spec demands
(`blocks[3].buckets[1].key`) for roughly a tenth of the hand-written code, and it runs
unchanged in a Worker. It is the one runtime dependency beyond React. A Vitest test
validates every file in `lessons/` so a malformed lesson fails in CI, not in a call.
**Rejected:** a hand-rolled validator (zero dependencies, but the error paths are the
entire value here, and they are the part that is tedious to hand-roll correctly).

### D7 — Speech is a module with a priming gate and a readability fallback

A one-time `pointerdown` listener speaks an empty utterance to unlock speech on platforms
that require a gesture. Every `speak()` cancels the utterance in flight first. Voices load
asynchronously on some browsers, so the wrapper never blocks on a voice list: it uses an
`en-*` voice if one has arrived and the default otherwise. `isAvailable()` drives the
listening exercise's fallback of showing the target word in writing, which the spec
requires so that a silent device does not produce an unanswerable exercise.

### D8 — Progress is derived, never stored

`isComplete(block, state)` per block type; lesson progress is the count over the lesson's
blocks. Nothing about progress is written into the state, so it cannot drift out of
agreement with the state it summarises, and the two screens in the next change cannot show
different percentages for identical state.

## Risks / Trade-offs

- **Lazy block state plus reset generations is subtler than eager initialisation** → the
  determinism scenarios from `lesson-state` are written as tests first, including a reset
  producing a different order and a replay reproducing state exactly.
- **The purity of `shared/` is an invariant no compiler enforces** → the import-graph test
  in D1; it is cheap and it fails loudly the moment someone reaches for `window`.
- **Zod adds a runtime dependency to a module destined for a Worker** → small, tree-shakes,
  and Worker-compatible; if it ever becomes a problem the validator is called in exactly
  two places.
- **Browser speech quality varies and is outside our control** → accepted for v0.1; the
  fallback keeps every exercise answerable, and pre-recorded audio is already scheduled for
  v0.2 in docs/PLAN.md.
- **Six block types before a single lesson has been taught with the tool** → they are not
  speculative; five of the six are transcribed from exercises she already runs by hand, and
  the sixth (`listen`) is one interaction built from parts the others already need.

## Migration Plan

Not applicable — new codebase, no users, no data. The change is complete when
`npm run dev` plays both lessons end to end in one browser and CI is green on typecheck,
tests and build.
