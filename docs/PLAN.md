# LessonLoop — MVP Plan

Status: **v2** · 2026-09-04 · revised after the lesson engine shipped and the room was
designed

The product context below still holds; the technical sketches written before any code
existed do not, and are superseded rather than kept in parallel. The authorities now are:
`README.md` for how a lesson is written, and `openspec/specs/` for the contracts the
shipped code satisfies — including `synced-rooms` and `teacher-view`, which the archived
`add-synced-rooms` change produced. The reasoning behind a decision lives in that change's
`design.md`, under `openspec/changes/archive/`.

---

## 1. What this is

A web app for **one-on-one online English lessons** where the teacher and the student
look at **one synchronised page** of interactive exercises. The teacher opens a lesson,
invites the student from inside it, and sends the link she is given — from then on both
tap the same screen and each sees what the other does. Opening a lesson does not create a
room; asking for one does (D-13).

**Client:** an English teacher based in the Philippines. Her students are, judging by the
source material, **Japanese children** (her cards carry `jp` + `romaji`), but the tool
must work for adults too.

**What it replaces:** a PDF worksheet plus a shared Zoom screen, where the student is a
passive viewer who cannot touch anything.

### The core bet

The teacher's link and the student's link are **different**, so the two screens are not
required to be identical. The teacher gets answer keys, target phrases, notes and lesson
controls on the same screen; the student sees only the exercise. Neither screen sharing
nor a PDF can do this — and it is the reason to build our own instead of using Wordwall
or Baamboozle.

---

## 2. MVP principles

1. **No sign-up.** No accounts, no email, no passwords. Open it and work.
2. **No database.** No schema, no accounts, nothing identifying a person at rest. Room
   state lives in the room's own Durable Object storage and is discarded by an alarm — see
   D-15, which revised this once it turned out that holding it purely in memory costs a
   whole lesson the moment the teacher reloads her tab.
3. **Lessons are data, not code.** A new lesson is a JSON file in the repo.
4. **Solo mode is mandatory.** If the socket never opens or drops, the app keeps working
   — just unsynced. The teacher must never hit a blank screen mid-lesson, and no exercise
   ever stops working for want of a connection. Qualified by D-21: because the teacher
   paces a shared lesson, an unsynced student holds the exercise they are on rather than
   walking through the rest alone. A lesson opened from the home screen is unqualified —
   it plays start to finish with no network at all.
5. **Tap, not drag.** Works with mouse, finger and stylus alike; syncs as "id X is
   selected" rather than as a stream of coordinates.
6. **Zero cost.** The Cloudflare free tier covers both the static site and the sockets.

Explicitly **out** of the MVP: accounts, a lesson editor, lesson history, payments, and
video calling (audio/video stay in Zoom or Skype — we are the second window next to it).

---

## 3. What we start from

`docs/reference/body_parts_lesson.html` and `docs/reference/animals_lesson.html` are the
teacher's originals (single-file, vanilla JS, no images — emoji only, speech through
`speechSynthesis`, no outbound requests). They are kept locally and are not committed.

The review showed: **this is one engine and two sets of data.**

| Section | body_parts | animals | Generalises to |
|---|---|---|---|
| Flip cards, EN + JP + TTS | ✅ | ✅ | `cards` |
| Picture ↔ word matching (tap-tap) | ✅ | ✅ | `match` |
| Sentence builder, 3 levels | ✅ | ✅ | `sentence` |
| Label the body diagram | ✅ | — | `hotspot` (v0.2) |
| Animal sounds (teach) | — | ✅ | `cards` over tag `sound` |
| Animal sounds (match) | — | ✅ | `match` over tag `sound` |
| Where do they live (3 buckets) | — | ✅ | `sort` over tag `habitat` |
| Simon says / Move like me | ✅ | ✅ | `tpr` |
| Progress bar + stars | ✅ | ✅ | app shell |

The key generalisation: the themed sections (`habitat`, `sound`, `move`) are not separate
exercise types — they are **the same exercise type applied to different vocabulary tags**.
That is exactly what turns two pages into an engine.

---

## 4. Lesson format

The format shipped in `add-lesson-engine`. It is documented where a lesson author will
look for it — `README.md` — and contracted in `openspec/specs/lesson-format`. The type
sketch that stood here was written before the first lesson existed and had drifted from
what was built; it is dropped rather than maintained as a second, wrong copy.

Two things the sketch did not anticipate and the shipped format has:

- **Grammar is declared, not guessed.** `plural` and `article` live on the item, because
  "an hour" and "a unicorn" defeat any rule read off the spelling.
- **A block declares what it says aloud**, as a template: `{article} {en} says {tag:sound}!`
  So a themed exercise is heard as its theme rather than as the plain English word, and
  still without a line of theme-specific code.

The format was validated against real material: **both of her lessons must be expressible
in this schema without a single line of lesson-specific code**, except `hotspot` (the body
diagram), which is deferred to v0.2. If they cannot be expressed, the schema gets fixed —
we do not write exceptions.

---

## 5. Block types

**v0.1 — six types, exactly enough to cover her two lessons plus one new idea:**

| Type | Mechanic | Synchronised state |
|---|---|---|
| `cards` | tap a card → flip + speak | `{ flipped: string[] }` |
| `match` | tap left → tap right → pair or reject | `{ selected, paired: string[], wrong }` |
| `sentence` | pick a word → pick a level → speak | `{ item, level }` |
| `sort` | tap an item → tap a bucket | `{ selected, placed: Record<id, bucket> }` |
| `listen` | a voice says a word → tap the right picture | `{ target, answered, wrong }` |
| `tpr` | "Touch your nose!" / "Hop like a rabbit!", taking turns | `{ index, started }` |

`listen` is new relative to her material and the cheapest gain in value: it trains
listening rather than recognition, and it keeps a child on their toes.

**Backlog (v0.2+):** `hotspot` (label a diagram), `scramble` (build a sentence from
shuffled words), `spell` (assemble a word from letters / missing letter), `memory`
(pairs, alternating turns, teacher-vs-student score — ideal for two players), `quiz`
(timed race), `reading` (a passage with line-by-line highlighting, "my turn / your turn",
plus comprehension questions), `gapfill` (grammar for adults), `wheel` (a wheel of
conversation topics), `bingo`.

---

## 6. Synchronisation

### Shape

```
Teacher: /t/AB12#<teacher key>      Student: /r/AB12
                    \                  /
                     WebSocket → Durable Object "room:AB12"
                     (state in the room's own storage, dropped by an alarm)
```

The teacher's view is granted by the key, not by the route (D-16): `/r/AB12` → `/t/AB12` is
a guess a curious ten-year-old makes, and a room is not bound to the lesson it started with
(D-11), so one link covers a whole session.

### Room state

The room holds the lesson it is currently on, the `LessonState` the engine already
defines — which carries its own version, seed, slide index and per-block state — the lock,
and the participant roster. It is written to the room's Durable Object storage on every
change, so a reloaded tab rejoins the lesson instead of restarting it (D-15).

### Protocol

Client → room:
- `{ t:'hello', room, key? }` — a key, where present, claims the teacher's role
- `{ t:'action', action }` — any tap, navigation and resetting an exercise included, since
  those are already actions in the shared reducer. Taps inside the exercise are accepted
  from either participant; `nav` and `reset` only from the teacher (D-21)
- `{ t:'switch-lesson', lesson }` — teacher only. The lesson travels whole rather than by
  id: the room has no lesson catalogue, so `lessons/` stays content the client bundles and
  a new lesson never needs the Worker redeployed (D-20)
- `{ t:'lock', value }` — teacher only

Room → client:
- `{ t:'state', state, locked, role }` — the whole state, on join and after every applied
  action
- `{ t:'refused', reason }` — the action did not apply: a locked student, a stale tap
- `{ t:'peers', peers }` — who is in the room
- `{ t:'error', code }` — no such room, room expired, room full

### Decision: one reducer, two execution sites

`applyAction(state, action) → state` lives in shared code and runs **both on the client
(optimistically, so a tap responds instantly) and inside the Durable Object
(authoritatively)**. The room broadcasts its whole state after every applied action and a
client adopts any snapshot at least as new as its own. There is no patch message (D-14): a
lesson's state is kilobytes at human tap frequency, and the divergence bugs a patch protocol
buys back are exactly the kind a child finds mid-lesson. Conflicts are resolved by
arrival order at the server; for "two people tapped at once" that is enough, and no CRDT
is needed.

### Rooms

- Created by `POST /api/rooms`, carrying the lesson and the `LessonState` the teacher
  already has open, so the invitation keeps whatever progress has been made (D-13).
- Code: 4 characters from an alphabet without `0/O/1/I/5/S`; the DO is addressed via
  `idFromName(code)`, and a code already in play is refused and retried. Creating a room also mints a random teacher key, carried in the link
  fragment so it stays out of request lines, server logs and `Referer` headers.
- Lifetime: a DO `alarm()` drops the state after 3 hours of inactivity.
- Cap of 4 participants (room to grow into small groups later).
- Privacy: anyone holding the link can join. Acceptable — codes are short-lived, no
  personal data is involved, and the teacher sees the participant count and can recreate
  the room.

### Resilience

Reconnect with exponential backoff; after three failures a banner reads "working without
sync" and the app carries on locally. A student who joins mid-lesson receives a snapshot
and immediately sees the correct screen.

---

## 7. Screens and UI

- **Home** — a grid of lesson tiles (emoji); picking one opens the lesson locally, with no
  network at all. A room is created only when the teacher asks to invite a student, from
  inside the lesson, carrying whatever progress has already been made (D-13).
- **Lesson, student view** — the exercise, large tap targets, and where in the lesson
  they are: `3 / 9` and the progress bar. No ← / →, no "Reset": the teacher paces the
  lesson (D-21).
- **Lesson, teacher view** — the same plus the panel: ← / →, "Reset this exercise",
  "Change lesson", "Lock student input", a "student connected" indicator and the answer
  key for the current block. Pacing is hers alone, and the room refuses it from a student
  rather than merely hiding the buttons.

Responsiveness: the student is most likely on a tablet or in a window next to a video
call, so the layout is designed from the narrow window up (roughly 380–900 px wide)
rather than from the desktop down.

Audio: `speechSynthesis`, `lang='en-US'`, `rate≈0.85` — same as in her originals.

---

## 8. Stack and deployment

- **Frontend:** Vite + React + TypeScript, hand-written CSS (the look needs to be playful;
  a UI kit gets in the way). React is chosen because "state → render" is literally what a
  synchronised room is.
- **Server:** a single Cloudflare Worker serving the static assets (assets binding) plus a
  Durable Object. One domain, no CORS, one `npx wrangler deploy`.
- **Cost:** the Workers free tier plus Durable Objects on the free plan.
  ⚠️ Verify the current limits at deploy time rather than trusting this document.

```
lesson-loop/
├─ src/
│  ├─ blocks/        # one React view per exercise type
│  ├─ shared/        # types, validation, reducer, block logic, room core, protocol
│  ├─ speech/        # speechSynthesis, with its priming gate
│  ├─ net/           # socket client, reconnect, solo fallback
│  └─ ui/            # shell, lesson player, teacher panel, routing
├─ lessons/          # animals.json, body-parts.json, ...
├─ worker/           # index.ts + Room (Durable Object) — thin adapters over src/shared
├─ openspec/         # the specs, and the changes that produced them
├─ docs/
└─ wrangler.jsonc
```

The separate `engine/` never happened: block rendering lives in `src/blocks/` and the logic
behind it in `src/shared/blocks/`. The Worker serving the static assets is the shape after
`add-cloudflare-deploy`; until then development runs two processes, with Vite proxying the
socket to `wrangler dev` (D-18).

---

## 9. Roadmap

**v0.1 — what she will actually try in a lesson**
The engine, six block types, both of her lessons as JSON, rooms and links, the teacher
panel, deployed to `*.workers.dev`. Acceptance: run a real lesson with two people and
collect feedback.

Where it stands on 2026-09-04: `add-lesson-engine` is implemented and archived — the engine,
the six block types and both of her lessons play end to end in one browser, offline.
`add-synced-rooms` is implemented: two browsers hold one lesson together against
`wrangler dev`, with the teacher panel, the answer keys and the lock. It stops short of
publishing (D-18). `add-cloudflare-deploy` has not been started.

**v0.2** — `hotspot`, `memory`, `scramble`; four to six new lessons; sounds and
correct-answer animations; tablet polish; pre-generated mp3 instead of TTS.

**v0.3** — a teacher account and a lesson editor. This is where a real backend, auth and
storage appear. Deliberately kept out of the MVP.

---

## 10. Risks

| Risk | Mitigation |
|---|---|
| `speechSynthesis`: voices differ across devices, iOS requires a user gesture and mutes speech when the tab loses focus | prime it on the first tap; move to pre-recorded mp3 in v0.2 |
| Emoji render differently on Windows and iOS, and some read poorly to children | replace the critical ones with an own SVG set in v0.2 |
| Weak connection on the student's side | optimistic rendering plus solo mode; there are no heavy assets at all |
| The free tier changes | the cost of moving is low — the DO relay is about 80 lines and ports anywhere |

---

## 11. Questions for the teacher (before v0.2)

1. Age and level of the students, and lesson length — how many blocks actually fit?
2. What device does the student join from: tablet, phone, laptop?
3. Does she need to teach from a phone, or is it always a desktop?
4. Does Japanese on the student's screen help or get in the way? Is a toggle needed?
5. The next ten topics, in priority order.
6. Adult students — what do they want: speaking practice, grammar, reading?

---

## 12. Decisions taken

`D-n` numbers the product decisions in this document. A change's `design.md` numbers its own
technical decisions `Dn`, without the hyphen; the two sequences are separate.

| # | Decision | Date |
|---|---|---|
| D-1 | Name **LessonLoop**; public repository (`serhiizghama/lesson-loop`) | 2026-09-03 |
| D-2 | Sync via Cloudflare Worker + Durable Object; WebRTC/PeerJS rejected over NAT traversal, Supabase rejected because free projects sleep after a week | 2026-09-03 |
| D-3 | Lessons are data, not code; themed sections generalise through `tags` on vocabulary items | 2026-09-03 |
| D-4 | Tap-tap instead of drag-and-drop | 2026-09-03 |
| D-5 | Solo mode on connection loss is mandatory | 2026-09-03 |
| D-6 | Accounts and the lesson editor land in v0.3, not in the MVP | 2026-09-03 |
| D-7 | OpenSpec adopted (`schema: spec-driven`). A change's `tasks.md` **is** the implementation plan; no separate hand-written one, to avoid a second source of truth. PLAN.md keeps the product context OpenSpec has no place for | 2026-09-03 |
| D-8 | v0.1 is sliced into three changes: `add-lesson-engine` → `add-synced-rooms` → `add-cloudflare-deploy` | 2026-09-03 |
| D-9 | Both participants tap and navigate freely; the teacher additionally has a "student view-only" lock toggle for when a child runs ahead | 2026-09-03 |
| D-10 | v0.1 targets children only. Adult material (`reading`, `gapfill`) becomes its own change in v0.2 | 2026-09-03 |
| D-11 | A room is not bound to one lesson: the teacher switches lessons in place, so one link covers the whole session | 2026-09-03 |
| D-12 | Vitest over the shared reducer (the one piece that runs in two places) plus a minimal GitHub Actions typecheck/build | 2026-09-03 |
| D-13 | A room is opted into, never imposed: opening a lesson from the home screen stays solo and offline, and the teacher invites from inside the lesson. Supersedes §7's original "picking a lesson creates a room" | 2026-09-04 |
| D-14 | The room broadcasts its whole state after every action; the `patch` message sketched in §6 is dropped as an optimisation with no measured problem behind it | 2026-09-04 |
| D-15 | Room state is persisted to the room's Durable Object storage rather than held only in memory, so that a reloaded tab does not cost the lesson. Qualifies principle 2 | 2026-09-04 |
| D-16 | The teacher's role is granted by a secret key in the link fragment, not by the route, so the student's link cannot be edited into the teacher's | 2026-09-04 |
| D-17 | The teacher's answer key is computed from lesson data and belongs to the block contract, so a new block type cannot ship without one. No teacher notes are added to the lesson format in v0.1 | 2026-09-04 |
| D-18 | `add-synced-rooms` ends at two browsers against `wrangler dev`; publishing, asset serving and CI deployment are `add-cloudflare-deploy` | 2026-09-04 |
| D-19 | Room behaviour lives in `src/shared/room.ts` as pure code with the Durable Object a thin adapter, so convergence is a unit test rather than a two-browser check | 2026-09-04 |
| D-20 | The room holds the lesson's data, not just its id: it is sent when the room is opened and when the lesson is switched. The Worker keeps no lesson catalogue, so principle 3 survives — a new lesson is still a file in `lessons/` and needs no deploy | 2026-09-04 |
| D-21 | The teacher paces a shared lesson: moving between exercises and resetting one are hers alone, absent from the student's screen and refused by the room. The lock stays a separate, stronger rule about touching the exercise itself. An unsynced student therefore holds their exercise rather than walking on — qualifies principle 4 | 2026-09-04 |
