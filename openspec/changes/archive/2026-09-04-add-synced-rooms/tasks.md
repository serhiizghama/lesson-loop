## 1. The protocol and the room core

- [x] 1.1 Add `src/shared/protocol.ts`: the client→room messages (`hello`, `action`,
  `switch-lesson`, `lock`) and room→client messages (`state`, `refused`, `peers`, `error`),
  as a discriminated union of plain serialisable data, with the room code, the role and the
  `LessonState` snapshot typed from existing `src/shared/types.ts`. **Check:** `npx tsc
  --noEmit` passes and no message type references React, the DOM or a Cloudflare type.
- [x] 1.2 Add `src/shared/room.ts` with `RoomCore`: it holds `{ lessonId, state, locked,
  participants }`, admits or refuses a joiner, applies an action through the existing
  `applyAction`, refuses a locked student's action, switches lesson, and produces a snapshot
  (design D9). No Cloudflare import, no socket, no clock. **Check:** `src/shared/purity.test.ts`
  passes with `room.ts` inside its scope — confirm the test's file glob actually covers the
  new file rather than assuming it.
- [x] 1.3 Unit-test `RoomCore` against the `synced-rooms` spec's own terms: an action from
  either role reaches the snapshot; a locked student's action changes nothing while the
  teacher's still applies; a joiner beyond the participant cap is refused without disturbing
  the others; switching lesson starts the new lesson fresh (design D14, spec "A room outlives
  any one lesson"). **Check:** each scenario in the delta spec that concerns room rules has a
  named test, and `npm test` passes.
- [x] 1.4 Write the transport-free convergence test (design D19): two simulated clients and
  one `RoomCore` exchanging real protocol messages, with interleaved actions, a client acting
  on a stale snapshot, and a client rejoining mid-sequence. **Check:** after every scenario
  both clients' states compare equal to the room's, field by field.
- [x] 1.5 Assert the snapshot stays small enough for D10's full-state broadcast to be the
  right call: serialise a fully played state of the largest lesson in `lessons/`.
  **Check:** the test asserts it is under 32 KB and names the actual size when it fails.

## 2. The teacher's answer key, on the block contract

- [x] 2.1 Extend `src/shared/blocks/contract.ts` with `answerKey(lesson, block, state)`
  returning plain data or `null` (design D15). **Check:** the compiler rejects a block module
  that omits it — verify by temporarily deleting one implementation and seeing `tsc` fail.
- [x] 2.2 Implement `answerKey` for `cards`, `match`, `sentence`, `sort` and `listen`: the
  pairs, the correct bucket per item, the sentence the current level renders for the selected
  item, and the target currently being asked. **Check:** a unit test per type asserts the key
  against a hand-written expectation from the fixture lesson.
- [x] 2.3 Return `null` from `tpr` and `finish`, which score nothing. **Check:** the test
  asserts `null`, and the `teacher-view` scenario "An exercise with no answer" has a test to
  point at.

## 3. The Worker and the Durable Object

- [x] 3.1 Add `wrangler` and `@cloudflare/workers-types` as dev dependencies and
  `wrangler.jsonc` declaring the `Room` Durable Object binding and its migration. **Check:**
  `npx wrangler dev` starts and serves the Worker without error.
- [x] 3.2 Write `worker/index.ts`: `POST /api/rooms` creates a room (4-character code from an
  alphabet without `0 O 1 I 5 S`, claimed through `idFromName`, retried on refusal) and
  returns the code plus a random `teacherKey`; `GET /ws` upgrades to a WebSocket and forwards
  to the room's Durable Object (design D12). **Check:** `curl -X POST .../api/rooms` returns a
  distinct code and key on each call, and a second claim of the same code is refused.
- [x] 3.3 Write `worker/room.ts`: a thin Durable Object over `RoomCore` that assigns the role
  from the presented key, broadcasts a full snapshot after every applied action (design D10),
  and reports the participant roster on join and on leave. **Check:** two `websocat` (or
  equivalent) clients against `wrangler dev` — an action sent by one produces a snapshot on
  both, and a socket presenting no key is admitted as a student.
- [x] 3.4 Persist `RoomState` to `ctx.storage` on every mutation and restore it in the
  constructor under `blockConcurrencyWhile` (design D11). **Check:** with one client
  connected, close and reopen it; the lesson resumes at its current exercise with progress
  intact rather than restarting.
- [x] 3.5 Set an `alarm()` that discards the room after three hours of inactivity, rescheduled
  on each action, and answer a socket for an unknown or expired code with an error the client
  can act on. **Check:** a temporarily shortened alarm interval expires a room, and a client
  connecting afterwards receives the "room not available" error rather than a silent hang.
- [x] 3.6 Include `worker/` in the TypeScript project. **Check:** `npx tsc --noEmit` covers
  `worker/` and CI fails on a type error introduced there.

## 4. The network client and solo fallback

- [x] 4.1 Add `src/net/socket.ts`: opens the connection, sends typed protocol messages, and
  reconnects with jittered exponential backoff from ~0.5 s to a ~10 s ceiling, indefinitely
  (design D18). **Check:** a unit test over an injected fake socket asserts the delay sequence
  and that retrying never stops.
- [x] 4.2 Add `src/ui/useRoom.ts` returning the same `{ state, dispatch, progress }` shape as
  `useLesson` (design D13): `dispatch` applies locally at once and sends; an arriving snapshot
  whose version is at least the local one replaces the local state. **Check:** the type of
  `useRoom` is assignable to `LessonStore`, enforced by a compile-time assertion in the file.
- [x] 4.3 Surface connection status through that hook and show "working without sync" after
  the third consecutive failure, clearing on the first snapshot (design D18). **Check:** with
  `wrangler dev` stopped mid-lesson, the banner appears, every remaining exercise still
  completes, and restarting the Worker clears the banner and re-syncs both screens.
- [x] 4.4 Confirm the solo path is untouched: opening a lesson from the home screen still
  constructs no socket. **Check:** play a lesson from `/` with the network panel open and see
  no request after load — the `lesson-player` scenario "Playing offline" verbatim.

## 5. Routing and the invitation

- [x] 5.1 Replace the `useState` lesson picker in `src/ui/App.tsx` with a hand-rolled router
  over `history.pushState` and `popstate` serving `/`, `/t/<code>` and `/r/<code>` (design
  D16). **Check:** the browser back button moves between home and a lesson, and a direct page
  load of each of the three routes lands on the right screen.
- [x] 5.2 Add the "Invite student" action to a lesson in progress: it creates the room from
  the current state, moves the teacher to `/t/<code>#<key>` and offers the student's link for
  copying (spec "Asking for a room mid-lesson"). **Check:** progress made before inviting is
  present on the student's screen when they join.
- [x] 5.3 Make the invitation idempotent — asking again offers the same link rather than
  creating a second room. **Check:** the teacher's link is unchanged after asking twice, and
  `POST /api/rooms` was called once.
- [x] 5.4 Handle an unknown, expired or full room on entry by explaining it and offering the
  lesson list (spec scenarios "An unknown or expired code" and "One more participant than the
  room holds"). **Check:** opening `/r/ZZZZ` shows the explanation and a way back, never a
  blank screen.

## 6. The teacher's view

- [x] 6.1 Build the teacher panel beside the exercise: previous/next, reset this exercise,
  change lesson, and the student's link on demand. **Check:** each control changes both
  screens in a two-browser session, and reset re-shuffles the exercise on both while leaving
  other exercises' progress intact.
- [x] 6.2 Render the answer key for the exercise on screen from `answerKey`, showing nothing
  where it is `null`. **Check:** every block type in both existing lessons displays a key that
  matches what the exercise actually accepts, checked by playing them.
- [x] 6.3 Add the lock toggle, enforced in `RoomCore` and reflected in the student's UI
  (design D14). **Check:** with the lock on, a student tap changes neither screen and the
  student is told whose turn it is; the teacher can still act; unlocking restores the
  student's next tap.
- [x] 6.4 Show whether a student is connected and whether the teacher's own connection is
  healthy. **Check:** closing the student's tab flips the indicator to absent within a few
  seconds rather than leaving it claiming they are present.
- [x] 6.5 Make the panel dismissible and keep the exercise fully visible at 380 px wide
  (spec "The teacher's extra surface does not crowd out the exercise"). **Check:** at a
  380-pixel viewport nothing overlaps the exercise, the page does not scroll sideways, and
  dismissing the panel shows exactly what the student sees.

## 7. The student's view

- [x] 7.1 Serve `/r/<code>` with the exercise, its instruction and progress, and nothing that
  belongs to the teacher. **Check:** grep the student view's rendered output for answer-key
  and control markup — neither is present in the DOM, not merely hidden with CSS.
- [x] 7.2 Land a joiner on the exercise currently in play with all progress so far (spec "The
  student arrives late"). **Check:** join after the teacher has completed two exercises and is
  partway through a third; the student sees the third mid-progress and the first two count as
  complete.

## 8. Specs, docs and quality gates

- [x] 8.1 Update `README.md` with what a room is, the two links, how to run the Worker and the
  client together, and the fact that a lesson opened from the home screen stays solo and
  offline. **Check:** a reader following it alone gets two browsers synced without opening a
  source file.
- [x] 8.2 Update `docs/PLAN.md`'s decision table with the decisions taken in this change that
  contradict what it says — the room is opted into rather than created on lesson pick, the
  protocol broadcasts snapshots rather than patches, and room state is persisted to Durable
  Object storage. **Check:** no statement left in PLAN.md contradicts the delta specs.
- [x] 8.3 Extend `.github/workflows/ci.yml` if the added dev dependencies or the `worker/`
  directory need it. **Check:** the workflow is green on the branch, running typecheck, test
  and build.
- [x] 8.4 Run the full gate. **Check:** `npx tsc --noEmit`, `npm test` and `npm run build` all
  pass, and the result is reported honestly, naming anything skipped.

## 9. Acceptance

- [x] 9.1 Play a whole lesson in two browser windows under `wrangler dev`, one on each link,
  alternating who taps. **Check:** every exercise completes, both screens agree at every step
  including shuffled orders, progress reaches 100% on both, and the closing screen appears on
  both.
- [x] 9.2 Switch lesson mid-session from the teacher's window (D-11). **Check:** the student
  follows to the new lesson at its first exercise on the same link they were given.
- [x] 9.3 Break the connection deliberately mid-exercise and restore it. **Check:** both
  screens stay playable and say they are unsynced, and on restoration they converge on the
  same state without a reload.
- [x] 9.4 Report which checks were automated and which were performed by hand (design D19).
  **Check:** the manual tier is named as manual, never presented as test coverage.
