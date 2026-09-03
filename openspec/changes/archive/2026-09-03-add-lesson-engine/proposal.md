## Why

The teacher currently runs her lessons from hand-written single-file HTML pages — one
page per topic, with the vocabulary, the exercises and the page chrome all welded
together. Producing a lesson on a new topic means copying a 600-line file and editing it
by hand, which is why she has two topics and not twenty. Meanwhile the child on the other
end of the call cannot touch any of it: the page lives on the teacher's screen and reaches
the student as a video stream of somebody else's cursor.

This change builds the engine that removes the first half of that problem: **a lesson
becomes data, and the exercises become a fixed set of reusable interactions**. A new topic
should cost her a vocabulary list, not a new program. The second half — putting the same
page under the child's finger — is the next change (`add-synced-rooms`), and the state
model introduced here is shaped to carry it without rework.

## What Changes

- **Lesson data format.** A `Lesson` is JSON: metadata, a vocabulary list of `Item`s
  (English word, emoji, optional L1 gloss with romaji, example sentence, free-form
  `tags`), and an ordered list of `Block`s. Validated at load time with a clear error
  naming the offending path, so a malformed lesson fails loudly instead of rendering a
  blank screen mid-call.
- **Themed exercises generalise through tags.** "Where does it live", "what sound does it
  make" and "move like this animal" are not three exercise types — they are `sort`,
  `match` and `tpr` reading different tags off the same vocabulary. This is what makes a
  new lesson free.
- **Six block types**, covering both of her existing lessons plus one new interaction:
  `cards`, `match`, `sentence`, `sort`, `listen`, `tpr`. `listen` is new — the voice says
  a word and the learner taps the picture, training listening rather than recognition.
- **A pure reducer for all block state.** Every tap is an action; `applyAction(state,
  action)` is pure, deterministic and serialisable, and lives in shared code. The next
  change runs this exact function inside a Durable Object as the authoritative copy.
- **Speech.** A wrapper over `speechSynthesis`, primed on the first user gesture (iOS
  refuses to speak otherwise) and degrading silently where the API is missing.
- **Both existing lessons ported to JSON** — `animals` and `body-parts` — with zero
  lesson-specific code. This is the acceptance test for the format: if either lesson needs
  a special case, the format is wrong and gets fixed.
- **Project scaffold**: Vite + React + TypeScript, hand-written CSS, Vitest, and a
  GitHub Actions job running typecheck, tests and build.

Not in this change: WebSocket, rooms, shareable links, teacher and student roles, the
teacher panel, Cloudflare deployment, the `hotspot` block (the labelled body diagram), and
adult material. The engine runs standalone in one browser.

## Capabilities

### New Capabilities
- `lesson-format`: the JSON contract for a lesson — items, tags, blocks, item references —
  and the validation that rejects a malformed lesson at load time.
- `lesson-state`: the action and state model — a pure, deterministic, serialisable
  `applyAction` reducer over per-block state, with the guarantees the future
  server-authoritative copy depends on.
- `exercise-blocks`: the behaviour of the six v0.1 block types — what a learner taps, what
  counts as correct, what feedback is given, what state each keeps.
- `lesson-player`: the shell that runs a lesson — block sequence, navigation, progress,
  completion, and full operation from a single browser with no network.
- `speech`: spoken English through the browser, its priming requirement and its
  degradation when unavailable.

### Modified Capabilities
None — this is the project's first change.

## Impact

- New codebase: `src/` (engine, blocks, shared reducer, UI shell), `lessons/*.json`,
  `package.json`, `vite.config.ts`, `tsconfig.json`, `.github/workflows/ci.yml`.
- One runtime dependency beyond React (zod, for lesson validation); no backend, no
  storage, no network calls.
- Constrains the next change: `add-synced-rooms` may add wrapping and transport around
  `applyAction`, but must not need to change its signature or its purity.
- The teacher's original HTML files stay as local reference material and are not shipped.
