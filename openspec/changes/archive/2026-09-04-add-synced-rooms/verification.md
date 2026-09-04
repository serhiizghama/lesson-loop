# How this change was verified

Design D19 sets out three tiers and requires that the manual one is never reported as
test coverage. This is that report.

## Tier 1 — automated: `RoomCore`'s own rules

`src/shared/room.test.ts` (20 tests). Role assignment from the key, the participant cap
and its refusal, rejoining under the same id, the peer roster, actions from either role,
the lock refusing a student and not the teacher, lesson switching starting fresh both
ways, and the reconciliation rule.

## Tier 2 — automated: convergence, with no transport

`src/shared/convergence.test.ts` (10 tests). Two simulated clients and one `RoomCore`
exchanging real protocol messages: every action type, one shuffle on both screens,
interleaved actions, a client acting on a stale snapshot, a snapshot overtaking an action
in flight, a client rejoining mid-sequence, a client that played on unsynced and got ahead
in version, a lesson switch, and a locked student tapping repeatedly. Each asserts both
clients equal the room field by field.

The clients in that test drive `src/shared/room.ts`'s own `ClientView` — the same code
`useRoom` wraps — so this is a test of the shipped reconciliation, not of a copy of it.

Also automated: `src/net/socket.test.ts` (the backoff schedule, the warning threshold,
that retrying never stops), `src/shared/blocks/answer-key.test.ts` (a key per block type
against hand-written expectations, and `null` for the two that score nothing),
`src/ui/router.test.ts`, `src/ui/student-view.test.tsx` (the student's rendered markup
carries no teacher surface), `tests/snapshot-size.test.ts` (a fully played `animals` is
1.6 KB, well under D10's 32 KB), and `src/shared/purity.test.ts`, extended to prove it
actually covers `room.ts` and `protocol.ts`.

`npm run typecheck`, `npm test` (209 tests) and `npm run build` all pass.

## Tier 3 — checked by hand, not covered by tests

These were performed against `wrangler dev` plus `vite dev` in two browser windows on
2026-09-04. They are manual observations. Nothing below is regression-protected.

- A whole `body-parts` lesson played end to end in two windows, alternating who tapped at
  every exercise. Both screens matched at every handover — slide, progress, exercise and
  the full shuffled order of the tiles — reached 100% on both, and both showed the closing
  screen.
- The student's answer key was checked against the exercise itself for the sorting block:
  every placement the key named was accepted, none refused.
- Lesson switched mid-session from the teacher's window; the student followed to the new
  lesson at its first exercise on the same link.
- The Worker was stopped mid-exercise. Both windows kept working, said "working without
  sync" after the third failed attempt, and the student finished the exercise and moved on
  while unsynced. On restarting the Worker both converged on the room's state with no
  reload.
- Room persistence: a room with progress survived a full `wrangler dev` restart, and the
  teacher key still granted the teacher's role.
- The alarm was shortened to four seconds; the room expired and a later socket received
  `{"t":"error","code":"no-such-room"}` rather than hanging.
- Code claiming: with the alphabet temporarily reduced to one character so every code
  collided, the second room creation was refused after its retries rather than taking over
  the first room.
- The participant cap: four sockets joined, the fifth was refused `room-full`, and the
  existing participants were undisturbed.
- `/r/ZZZZ` explained that the room is not available and offered a way back.
- The teacher's panel at a 377-pixel viewport: no horizontal scroll, the panel below the
  exercise rather than over it, and dismissing it left exactly the student's view.
- Opening a lesson from the home screen: no `fetch`, no `WebSocket` and no resource
  request after load, through a completed exercise.
- The browser's back and forward buttons moved between the home screen and a lesson.
- Asking for a room called `POST /api/rooms` exactly once and left the teacher's link
  unchanged.

## Not verified

- `.github/workflows/ci.yml` was not run on GitHub — nothing has been pushed. Its three
  steps (`npm run typecheck`, `npm test`, `npm run build`) were each run locally and pass.
- Nothing is deployed. Acceptance stops at two browsers against `wrangler dev`, per D18;
  publishing is `add-cloudflare-deploy`.
