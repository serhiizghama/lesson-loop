## 1. The stroke and the board, in shared code

- [x] 1.1 Add the ink types to `src/shared/types.ts`: a `Point` as a pair of 12-bit
  integers, a `Stroke` (`id`, `by: Role`, `tool`/`colour`/`size`, `points`, `done`), and
  `Board = Record<string, Stroke[]>` keyed by block id. **Check:** `npm run typecheck`
  passes and `src/shared/purity.test.ts` still passes — the new types pull in nothing
  browser-only or Worker-only.
- [x] 1.2 Add `src/shared/ink.ts` with `applyInk(board, op, by): Board` covering
  add-or-append, erase-by-ids, undo and clear, returning its input by reference when the
  operation changes nothing (the convention `applyAction` already uses). Enforce
  `MAX_STROKES_PER_BLOCK` by dropping the oldest (design D109), scope undo and student
  clear to `by`, and let a teacher clear remove every stroke (design D106, spec
  `teacher-view`). **Check:** unit tests in `src/shared/ink.test.ts` cover each operation,
  the by-reference refusal, the bound, and that undo skips the other participant's strokes.
- [x] 1.3 Add stroke simplification to `src/shared/ink.ts`: a minimum-distance filter for
  points as they arrive and a Ramer–Douglas–Peucker pass on completion (design D105).
  **Check:** a test shows a 90-point hand-drawn circle reduces by at least 70 % and that
  every retained point stays within the tolerance of the original path.
- [x] 1.4 Add delta encoding and decoding for a stroke's points (design D105).
  **Check:** a round-trip test over random strokes returns the exact input; decoding
  refuses an odd-length array, a non-integer and a coordinate the sums put off the grid;
  and the encoding is measured against points as objects. *Measured:* 90 raw points are
  1801 B as objects and 619 B delta-encoded, and the simplified 26-point stroke that is
  actually sent is 219 B. The "under 500 B for 90 points" figure this check first carried
  was an estimate made before the encoding existed; 619 B is what a flat delta array of
  that many points costs, and the number that matters — what goes on the wire — is 219 B.

## 2. The wire and the room

- [x] 2.1 Add the ink client messages to `src/shared/protocol.ts` and to
  `clientMessageSchema` — an ink op carrying `block`, and `{ t: 'pen'; value }` — plus the
  matching server messages and `pen: boolean` on the `state` variant. Extend
  `parseServerMessage`'s accepted `t` list. **Check:** `npm run typecheck` passes and tests
  show each new message parses, a malformed one returns null, and an out-of-range
  coordinate is rejected.
- [x] 2.2 Add `board: Board` and `pen: boolean` to `RoomState` in `src/shared/room.ts`,
  opened with an empty board and the pen granted, exposed beside `get locked()`, and `pen`
  included in `stateMessage(role)`. **Check:** `npm run typecheck` and
  `src/shared/purity.test.ts` pass.
- [x] 2.3 Handle `pen` in `RoomCore.handle`: refused `not-teacher` for a student, refused
  `no-effect` when unchanged, applied for the teacher (design D107). Keep it independent of
  `locked` and `muted`. **Check:** `src/shared/room.test.ts` covers all three outcomes and
  a test asserts that locking does not change `pen` and withdrawing the pen does not change
  `locked`.
- [x] 2.4 Handle the ink ops in `RoomCore.handle`: refuse a student's op with a new
  `RefusedReason` while the pen is withdrawn, otherwise apply through `applyInk` and report
  an outcome that tells the adapter to relay. Persist only completed strokes; drop an
  author's in-flight strokes in `leave` (design D106). **Check:** `src/shared/room.test.ts`
  shows the refusal, the applied path, that a completed stroke survives `leave` and an
  in-flight one does not.
- [x] 2.5 Add a board server message and send it on join, so a joiner and a reloading
  participant receive the board with the state (spec `synced-rooms`). **Check:**
  `src/shared/room.test.ts` shows a socket joining after strokes exist receives them.
- [x] 2.6 Relay ink in `worker/room.ts`: forward an applied ink op to the other sockets
  without recomputing or broadcasting `stateMessage`, and persist on completion only.
  **Check:** `tests/worker-routes.test.ts` or a room test shows a stroke reaches the second
  socket and that no `state` message was sent for it.
- [x] 2.7 Fill `board` and `pen` in the Durable Object constructor for a room stored before
  this change, beside the existing `muted` fallback (design D110). **Check:** a test loads a
  stored `RoomState` without either field and finds an empty board and the pen granted.
- [x] 2.8 Confirm ink changed none of the lesson's own traffic. **Check:**
  `tests/snapshot-size.test.ts` passes **unchanged**, and a test asserts that `v` does not
  advance for an ink op and that `stateMessage` is byte-identical before and after strokes
  are added.

## 3. The fixed-width stage

- [x] 3.1 Lay the stage out at a fixed reference width in `src/ui/app.module.css` and
  `src/ui/LessonPlayer.tsx`, scaled by `min(1, available / reference)` (design D103).
  **Check:** `src/ui/stage.test.ts` covers the scale arithmetic (1 at and above the
  reference, proportional below, 1 for an unmeasured width) and `src/ui/stage-fit.test.tsx`
  covers the wiring — the reference width and the computed scale reach the page, and a
  browser without `ResizeObserver` is left on the old fluid layout. Above the reference
  width the scale is exactly 1 and the stylesheet is unchanged there, which is what makes
  the laptop pixel-identical.
- [x] 3.2 Add the scenario the spec adds to `lesson-player`'s narrow-window requirement.
  **Check:** the scenario is in the delta spec. *Not automated:* asserting that the same
  item sits in the same position at two widths needs a real layout engine, and jsdom has
  none — it applies no stylesheet to a CSS-module class and measures nothing. Covered by
  the runtime check in 7.5. See the note under 3.3.
- [x] 3.3 Re-verify the existing narrow-window requirement against the scaled stage.
  **Check:** `src/ui/stage.test.ts` asserts the tap-target arithmetic — the smallest card is
  8.5 rem, so at 380 px it scales to about 70 px, comfortably past the 44 px a child's
  finger needs. *Not automated:* the three existing narrow-window scenarios were never
  automated before this change either (nothing in `src/` or `tests/` references 380 px),
  because they are claims about rendered CSS. This change neither closes nor widens that
  gap; closing it would mean adding a browser-based runner, which is a decision about the
  project's tooling rather than part of this change.

## 4. Drawing on screen

- [x] 4.1 Add the ink layer over the stage in `src/ui`, rendering a board as SVG paths, with
  `pointer-events` following the drawing mode (design D108). **Check:** a test shows that
  with the mode off a tap reaches the exercise underneath, and with it on the same tap
  reaches the layer and the exercise's state is unchanged.
- [x] 4.2 Capture strokes from pointer events, normalise to the stage box, buffer, and flush
  on pointer-up or at `STROKE_FLUSH_POINTS` (design D106). **Check:** a test drives a
  synthetic 200-point stroke and asserts it is emitted in ordered parts, and that a
  40-point stroke is emitted exactly once.
- [x] 4.3 Add the toolbar: pencil mode, pen and eraser, sizes, the colour set, undo and
  clear, with teacher and student defaulting to different colours (spec `shared-drawing`).
  **Check:** `src/ui/ink-tools.test.ts` asserts the two participants start on different
  colours; `src/ui/lesson-ink.test.tsx` asserts the pencil is present in a room and absent
  elsewhere. *Amended:* the pencil moved from a bar under the exercise into the header, with
  the tools in a bar beneath it (design D114) — the first placement stood in the part of the
  stage that is now the board. Fit at 380 px is a rendered-CSS claim and is runtime-verified,
  per the note under 3.3.
- [x] 4.4 Implement erasing as a hit test that removes whole strokes within the eraser's
  radius (design D104). **Check:** a test erases the middle of a long stroke and asserts the
  whole stroke is gone with no fragment remaining.
- [x] 4.5 Suppress the pencil on the home screen and the closing screen (spec
  `lesson-player`). **Check:** a test asserts no drawing mode is offered on either.

## 5. Wiring the two stores

- [x] 5.1 Expose the board and the ink operations from `src/ui/useLesson.ts`, applying
  `applyInk` locally and sending nothing (design D111). **Check:** `npm run typecheck`
  passes, which is what enforces D13 — the store still satisfies `LessonStore`.
  *Amended:* the original check drew on a lesson played alone. Drawing is now offered only
  in a room (design D113), so there is nothing to draw there; `src/ui/lesson-ink.test.tsx`
  asserts the absence instead. The board stays on the solo store so that `LessonPlayer` can
  still be written against one store type.
- [x] 5.2 Expose the same shape from `src/ui/useRoom.ts`, applying optimistically and
  sending the op. **Check:** `npm run typecheck` passes and a test asserts `LessonPlayer`
  compiles against either store without a type discriminating them (D13).
- [x] 5.3 Keep drawing working with the room gone: marks appear locally and the existing
  disconnection notice is shown (spec `shared-drawing`). **Check:** a test drops the socket,
  draws, and asserts the mark rendered and the notice is visible.

## 6. The teacher's controls

- [x] 6.1 Add the pen switch beside the lock and the sound setting in `src/ui/RoomLesson.tsx`
  (spec `teacher-view`). **Check:** a test asserts the switch is absent from the student's
  screen and present on the teacher's, and that the teacher's panel still fits at 380 px.
- [x] 6.2 Show the student plainly that the pen is not hers while it is withdrawn, in the
  terms the lock already uses. **Check:** a test withdraws the pen and asserts the student
  sees the message and that her stroke produces no mark on either screen.
- [x] 6.3 Make the teacher's clear empty the whole board and the student's clear remove only
  her own (spec `teacher-view`). **Check:** a test with marks from both asserts each clear's
  scope on both screens, and that the exercise's progress is unchanged by either.

## 7. Convergence, docs and the final check

- [x] 7.1 Extend `src/shared/convergence.test.ts` to cover the board: two simultaneous
  strokes end up as both marks on both screens, each participant's own marks keep their
  order, and erasing an already-erased stroke leaves both agreeing (spec `synced-rooms`).
  **Check:** the new cases pass. *Amended:* "in the same order" became "as a set, with each
  author's own marks in order" — the original wording was measurably unachievable and
  design D112 records why.
- [x] 7.2 Cover the marks belonging to their exercise: moving away and back restores them, a
  reset leaves them alone, and changing the room's lesson discards them (spec
  `shared-drawing`). **Check:** the three cases pass.
- [x] 7.3 Update `docs/PLAN.md` §6 with the ink messages and the pen switch, and §12 with
  the product decisions this change settles. **Check:** §6 lists `pen` and `ink` in both
  directions and `state` carries `pen`; §12 gains D-32 to D-35, dated, continuing from
  D-31 with no gap.
- [x] 7.4 Run the full check. **Check:** `npm run typecheck`, `npm test` (644 passing) and
  `npm run build` all pass, and `tests/snapshot-size.test.ts` is unmodified.
- [x] 7.5 Verify at runtime with both halves running (`npm run dev:worker` and
  `npm run dev`). **Observed:** a stroke drawn across the apple on the teacher's screen
  landed across the apple on the student's, whose window is a different width because it
  carries no panel — the alignment this whole change rests on. Withdrawing the pen removed
  the student's tools, showed her "the teacher has the pen just now", and left both existing
  marks on her screen. Reloading the student — a fresh socket, so the join path — brought the
  board back from the room. Both participants drawing showed the teacher's red and the
  student's blue on both screens. A first build's bottom toolbar and square board were both
  replaced after looking at them (designs D113, D114).
