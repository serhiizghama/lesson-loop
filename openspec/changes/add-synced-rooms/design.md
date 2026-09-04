## Context

See proposal.md — Why for the motivation, and the three delta specs for the behaviour being
contracted.

What exists: a pure `src/shared/` (types, `applyAction`, seeded shuffling, per-block logic)
that `src/shared/purity.test.ts` already forbids from importing React or touching the DOM,
and a React shell whose whole notion of "which lesson is open" is a `useState` in
`src/ui/App.tsx`. The reducer was written for this change — `applyAction` refuses rather
than throws precisely because it will now receive actions from a peer whose view may be
stale.

Decisions continue the numbering of `add-lesson-engine`'s design (D1–D8), because code
comments cite decisions by bare number.

Three constraints shape everything below:

1. **A tap must not wait for the network.** A child on a tablet beside a video call will
   out-tap any round trip. The client applies its own action immediately and reconciles
   afterwards.
2. **The lesson must survive the room.** Any failure of the connection — never opened,
   dropped mid-exercise, server gone — degrades to the app as it is today, unsynced.
3. **The views must not know.** An exercise view is handed state and a dispatch; whether
   the authority behind them is local memory or a room is not its business.

## Goals / Non-Goals

**Goals**

- One authoritative copy of `LessonState` per room, produced by the same `applyAction` the
  browser runs, so agreement is a property of the model rather than of the transport.
- Room logic testable with no Cloudflare runtime: convergence of two clients is a unit
  test, not a thing we find out about during a lesson.
- The teacher's answer key derives from lesson data, so a block type cannot be added
  without one.

**Non-Goals**

- No deploy: no assets binding, no custom domain, no production wrangler config. Acceptance
  is two browsers against `wrangler dev`.
- No presence beyond "is someone there": no names, no cursors, no per-participant scoring.
- No conflict resolution beyond arrival order at the server. Two people tapping the same
  card in the same instant is a solved problem the moment one of them arrives first.
- No persistence of a room past its alarm, and no state that outlives a teaching session.

## Decisions

### D9 — `worker/` is a sibling of `src/`, and the room's brain is not in it

`worker/index.ts` (fetch handler and routing) and `worker/room.ts` (the Durable Object)
stay thin adapters. All room behaviour — apply an action, refuse a locked student, switch
lesson, admit or refuse a joiner, produce a snapshot — lives in `src/shared/room.ts` as a
plain class over plain data, with no Cloudflare import anywhere in it.

*Why:* it is the difference between a room we can test in Vitest in milliseconds and one we
can only test by running two browsers. It also keeps `purity.test.ts` meaningful: the room
core is subject to the same rule as the reducer.

*Rejected:* the DO class holding the logic directly — conventional in Cloudflare examples,
and it would put the one piece of concurrency-sensitive code in the project behind a runtime
we cannot cheaply invoke. Rejected: a separate package or workspace for the worker — a
build-tooling tax on a project with one `src/shared/` and two consumers.

### D10 — The room broadcasts the whole state, not a patch

After every applied action the room sends every participant a full `{ t:'state', … }`
snapshot. There is no patch message and no per-block delta.

*Why:* a lesson's state is a slide index, a seed, and a handful of small per-block records —
kilobytes at the very worst, at human tap frequency. Buying a few hundred bytes per message
with a whole class of divergence bugs is a bad trade in the one place where a bug is visible
to a child mid-lesson. It also makes the reconciliation rule trivial: adopt any snapshot
whose version is at least your own.

*Rejected:* `{t:'patch', block, state}` as sketched in `docs/PLAN.md` §6 — a real
optimisation with no measured problem behind it; revisit if a lesson's state ever exceeds
roughly 32 KB. *Rejected:* broadcasting the action for each client to re-apply — smaller
still, and it makes every client's correctness depend on its own history being intact,
which is exactly what we do not want to debug remotely. *Rejected:* CRDTs — arrival order
at a single authority is sufficient, per D-2 and PLAN §6.

### D11 — The room's state is written to Durable Object storage, not held only in memory

`RoomState` (`lessonId`, the `LessonState`, `locked`, the participant roster) is persisted
to `ctx.storage` on every mutation and loaded in the constructor under
`blockConcurrencyWhile`.

*Why:* a Durable Object with no open socket is evicted, and a teacher reloading her own tab
is the single most likely thing to happen in a first real lesson. Memory-only state would
lose the room to a page refresh. This does not breach the "no database" principle in any
sense that matters: nothing identifies a person, nothing outlives the alarm, and there is no
schema to migrate.

*Rejected:* memory-only state, per PLAN §2 principle 2 — the principle is about not building
a backend, and it costs a whole lesson to honour literally. *Rejected:* the WebSocket
Hibernation API — the right answer for idle rooms, but a teaching session is continuously
active for an hour, so it would save little while adding a second state-restoration path to
get wrong. Storage-backed state leaves the door open to adopt it later without redesign.

### D12 — A room is claimed by code, and the teacher's role is a secret, not a route

`POST /api/rooms` generates a 4-character code from an alphabet without `0 O 1 I 5 S`, asks
`idFromName(code)` to claim it, and retries on refusal. It returns the code and a random
`teacherKey`. The teacher's link carries that key in the URL **fragment**
(`/t/<code>#<key>`); the student's link is `/r/<code>` and carries nothing. A socket
presenting the key joins as teacher; every other socket joins as student.

*Why:* the specs require that the student's link cannot yield the teacher's view. If the
role were the route, `/r/AB12` → `/t/AB12` is a guess a curious ten-year-old makes. The
fragment keeps the key out of request lines, server logs and `Referer` headers while
remaining readable by the page.

*Rejected:* the client choosing its role at join time — anyone could claim the teacher's
view. *Rejected:* `newUniqueId()` — unguessable, but the resulting id is not a thing you
paste into a chat window. *Rejected:* a code generated client-side — nothing to detect a
collision against.

### D13 — One store shape, two implementations, and the views never learn which

`useLesson` (local, unchanged) and a new `useRoom` (synced) both return
`{ state, dispatch, progress }`. `LessonPlayer` and every block view take that shape and
nothing else. In a room, `dispatch` applies the action locally at once and sends it; an
arriving snapshot replaces the local state.

*Why:* the alternative — a `synced` flag threaded through the view tree — puts a network
concern into components whose job is a card and a tap, and guarantees that solo mode rots
the moment someone tests only the room path.

*Rejected:* making everything go through the socket and dropping the local path — it would
make the network a dependency of the exercise, which the `lesson-player` spec forbids.

### D14 — The lock is enforced by the room, and only reflected by the UI

A locked student's action is refused inside `RoomCore`. The student's client also disables
its own controls and says whose turn it is, but that is feedback, not enforcement.

*Why:* a lock that lives in the UI is undone by a page reload or a second tab — and the
child it is aimed at is precisely the person who will reload the page.

*Rejected:* dropping the lock's server half as "good enough for a child" — it is three lines
in the place that already validates every action.

### D15 — The answer key is part of the block contract

`src/shared/blocks/contract.ts` gains an `answerKey(lesson, block, state)` returning plain
data (pairs, bucket assignments, the current target, the rendered sentence) or `null` for a
block with nothing to be right about. Each block module implements it; the teacher panel
renders whatever it is handed.

*Why:* if the key lived in the panel as a switch over block types, adding a block type would
compile cleanly and silently ship an exercise the teacher cannot see the answer to. On the
contract, the type checker asks for it.

*Rejected:* teacher notes authored in the lesson JSON — decided against at proposal time; it
would pull `lesson-format`, its validation and both existing lessons into this change to
express what the data already knows. It stays available for prompt phrases a teacher wants
to write by hand, in a later change.

### D16 — A hand-rolled router, about thirty lines

`/`, `/t/<code>`, `/r/<code>` over `history.pushState` and `popstate`, replacing the
`useState` picker in `App.tsx`.

*Why:* three routes, no nesting, no loaders, no guards. A router library is a dependency and
a set of conventions bought for nothing.

*Rejected:* `react-router`. *Rejected:* hash-based routes — the fragment is already carrying
the teacher key, and a link with two `#` in it is not one you send to a client.

### D17 — Dev runs two processes, and Vite proxies the socket

`wrangler dev` serves the Worker; `vite dev` serves the client and proxies `/api` and `/ws`
to it with `ws: true`. The Worker does not serve the client bundle in this change.

*Why:* how the built client reaches the internet is the subject of `add-cloudflare-deploy`,
and deciding it here through a build plugin would prejudge that change.

*Rejected:* `@cloudflare/vite-plugin` — fewer processes and a nicer story, but it couples the
client build to the Worker before the asset-serving decision has been made.

### D18 — Reconnection is quiet, and the banner is not

Exponential backoff with jitter from ~0.5 s to a ~10 s ceiling, retrying indefinitely.
"Working without sync" appears after the third consecutive failure, not the first, and
clears on the first successful snapshot.

*Why:* a one-second network hiccup should not flash a warning at a child. A minute of
silence should not leave a teacher believing the student can see her.

*Rejected:* giving up after N attempts, per PLAN §6 — a lesson lasts an hour and connections
come back.

### D19 — Convergence is a unit test, the socket is a manual check

Three tiers: `RoomCore` unit tests over its own rules; a transport-free integration test
driving two simulated clients and the room through the real message flow, asserting they end
identical after interleaved and out-of-order actions; and a manual two-browser check under
`wrangler dev` for the parts only the runtime can prove.

*Why:* everything that can go subtly wrong lives in the message flow, and none of it needs a
socket to reproduce. What the socket adds — the DO adapter, upgrade handling, the alarm — is
about eighty lines and is checked by using it.

*Rejected:* `@cloudflare/vitest-pool-workers` — a whole test runtime for those eighty lines;
worth revisiting in `add-cloudflare-deploy` when there is a deploy to protect. The manual
tier is reported as manual, never as automated coverage.

## Risks / Trade-offs

- **A page reload loses a participant's optimistic-but-unsent action.** → The window is one
  round trip and the action is a tap the participant can repeat; the room's state is
  authoritative and correct either way.
- **Full snapshots grow with lesson size.** → Bounded by the number of blocks and items in a
  lesson, both small by design. D10 names 32 KB as the point at which patches earn their
  keep; a test asserts a serialised state for the largest existing lesson stays far under it.
- **Storage writes on every tap.** → A tap is a human action, so the write rate is on the
  order of one per second at peak, per room, for one teacher. If this ever matters, the write
  is trivially debounced behind the same interface.
- **The teacher key sits in a URL the teacher may paste to the wrong window.** → Its blast
  radius is one ephemeral room with no personal data in it; the teacher can abandon the room
  and make another in one tap.
- **`speechSynthesis` fires on both devices for the same action.** → Correct for a shared
  lesson and the same behaviour a shared screen has; if it proves to be noise beside a video
  call, muting is a per-device toggle in a later change.
- **A student who opens the link before the teacher has chosen a lesson.** → The room always
  carries the lesson it was created from, so this cannot arise; a room only exists once a
  lesson is open.

## Migration Plan

Nothing to migrate: no data, no users, no deployed instance. The solo path through
`useLesson` is untouched and remains the default entry from the home screen, so the change
is additive and a revert costs nothing beyond the new files.

## Open Questions

- Are 4 characters and 3 hours the right code length and room lifetime? Both are single
  constants, invisible to the specs, and better answered after one real lesson.
- Does the teacher want the answer key open by default or dismissed by default? Affects one
  initial value; ask her rather than guess.
