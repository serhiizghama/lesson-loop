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
in this schema without a single line of lesson-specific code**. The labelled body diagram
was the last exception and is one no longer: `hotspot` expresses it, with the one narrow
cost recorded as D-40 — the drawing itself is the app's, and a lesson that needs a new one
needs a deploy. If a lesson cannot be expressed, the schema gets fixed — we do not write
exceptions.

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

**v0.2 — three more, added for her Shapes material:**

| Type | Mechanic | Synchronised state |
|---|---|---|
| `phrases` | tap 🔊 on a model sentence → hear it, say it | `{ played: string[] }` |
| `quiz` | something is shown → tap the item it names | `{ index, answered, wrong }` |
| `describe` | one item, two questions → both answered, one sentence | `{ index, given: {a,b}, wrong }` |

`quiz` takes the backlog's name and drops the timer that entry imagined: a race punishes
the child who is thinking, which the engine has promised not to do. `ask` and `show` are
what let one type be both of her guessing exercises — a riddle asked by a tag with pictures
to choose from, and the same thing reversed, a picture to name.

**v0.2 — three more, for the body diagram and for what nothing else asked:**

| Type | Mechanic | Synchronised state |
|---|---|---|
| `hotspot` | tap a word → tap the place on a drawing it names | `{ order, selected, placed, wrong }` |
| `memory` | cards face down → turn two up → pair or turn back | `{ order, up, matched, tries }` |
| `scramble` | a sentence's words, shuffled → tap them in order | `{ order, index, placed, wrong }` |

`hotspot` finally expresses her labelled body diagram, and is the one block type that needs
the app to carry something — the drawing (D-40). `memory` is the first exercise whose answer
is not on the screen when it is asked for, and `scramble` the first that asks a child to
build English rather than choose it.

**`memory` arrives without the turns the backlog imagined.** That entry read "pairs,
alternating turns, teacher-vs-student score"; the exercise ships cooperative, counting tries
and scoring nobody, because an action does not carry who sent it and a turn the app draws
but cannot enforce is undone by a reload (D-41).

**Backlog (v0.2+):** `spell` (assemble a word from letters / missing letter), `reading` (a
passage with line-by-line highlighting, "my turn / your turn", plus comprehension
questions), `gapfill` (grammar for adults), `wheel` (a wheel of conversation topics),
`bingo`.

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

It also holds the **board**: the marks drawn on the lesson, keyed by block id, beside the
state rather than inside it. Ink never passes through the reducer, never advances the
state's version, and never enlarges the snapshot broadcast on every tap (D-32).

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
- `{ t:'mute', value }` — teacher only. Whether the app may speak unasked, on both
  screens at once: the teacher is the voice of a live lesson and a synthesised one
  repeating her on two devices talks over her (D-27)
- `{ t:'pen', value }` — teacher only. Whether the student may draw. The third switch of
  the same family and independent of the other two: an exercise can be held while the child
  is still invited to circle her answer (D-33)
- `{ t:'ink', op }` — a mark or its removal: adding a stroke (or appending to one still
  being drawn), erasing by id, undoing one's own last, clearing. A stroke's points travel
  delta-encoded as integers on a 4096-unit grid, being fractions of the exercise stage
  (D-32)

Room → client:
- `{ t:'state', state, locked, muted, pen, role }` — the whole state, on join and after
  every applied action
- `{ t:'refused', reason }` — the action did not apply: a locked student, a stale tap, or a
  mark from a student whose pen the teacher is holding
- `{ t:'peers', peers }` — who is in the room
- `{ t:'error', code }` — no such room, room expired, room full
- `{ t:'ink', op, by }` — an applied mark, relayed to the **other** participants only: the
  one who sent it applied it already, and ink is never a state broadcast (D-32)
- `{ t:'board', board }` — the whole board, on join and to settle a refused mark

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
  Durable Object. One domain, no CORS, one `npx wrangler deploy` — and in practice not even
  that, since pushing to `main` publishes once the checks pass (D-24).
- **Cost:** the Workers free tier plus Durable Objects on the free plan.
  ⚠️ Verify the current limits at deploy time rather than trusting this document.

```
lesson-loop/
├─ src/
│  ├─ blocks/        # one React view per exercise type
│  ├─ scenes/        # the drawings a `hotspot` lesson labels, as inline SVG
│  ├─ shared/        # types, validation, reducer, block logic, room core, protocol
│  ├─ speech/        # recorded clips, falling back to speechSynthesis
│  ├─ sound/         # the chime and the closing notes, synthesised with Web Audio
│  ├─ net/           # socket client, reconnect, solo fallback
│  └─ ui/            # shell, lesson player, teacher panel, routing
├─ public/           # the app's mark and its web manifest, copied verbatim into dist/
├─ lessons/          # animals-1.json, animals-2.json, body-parts.json, ...
├─ worker/           # index.ts + Room (Durable Object) — thin adapters over src/shared
├─ openspec/         # the specs, and the changes that produced them
├─ docs/
└─ wrangler.jsonc
```

The separate `engine/` never happened: block rendering lives in `src/blocks/` and the logic
behind it in `src/shared/blocks/`. The Worker does now serve the static assets, so the
deployed app is one Worker and one origin; development still runs two processes, with Vite
proxying the socket to `wrangler dev`, because Vite is what gives the client hot reload.

Two settings in `wrangler.jsonc` carry the deployed routing: unknown paths fall back to the
app, so a student's link works when it is opened cold, and `run_worker_first` lists the
paths the room must answer before that fallback sees them. A route in one list and not the
other is a deployment where every page loads and no room can be opened, which is why a test
holds the two together.

One consequence worth stating plainly: the Worker still keeps no catalogue of lessons
(D-20), but `lessons/` is bundled into the client and the client is deployed — so a new
lesson reaches the teacher on the next deploy, not the moment the file is saved. Adding a
lesson still needs no code and no server change.

---

## 9. Roadmap

**v0.1 — what she will actually try in a lesson**
The engine, its first six block types, both of her lessons as JSON, rooms and links, the teacher
panel, deployed to `*.workers.dev`. Acceptance: run a real lesson with two people and
collect feedback.

Where it stands on 2026-09-04: `add-lesson-engine` is implemented and archived — the engine,
those six block types and both of her lessons play end to end in one browser, offline.
`add-synced-rooms` is implemented and archived: two browsers hold one lesson together, with
the teacher panel, the answer keys and the lock. `add-app-icon` is implemented and archived.
`add-cloudflare-deploy` publishes the app: one Worker serves the client and the room on a
`workers.dev` subdomain (D-23), pushed from CI (D-24), with room creation bounded (D-25).

That leaves v0.1's acceptance, which is not a passing suite: run a real lesson with two
people and collect feedback. The questions in §11 wait on it.

**v0.2** — `hotspot`, `memory`, `scramble`; four to six new lessons; sounds and
correct-answer animations; tablet polish; pre-generated mp3 instead of TTS.

Of that list, `fix-silent-speech` delivered the pre-generated recordings, and
`add-star-trail` delivers **sounds and correct-answer animations**: the header's percentage
becomes one star per exercise; completing the one on screen earns its star with a flying
star, a synthesised chime and a confetti burst, on both screens at once and without a word
said; the control that moves the lesson on draws attention while the exercise is finished;
and the closing screen shows the stars actually earned, arriving one per note, instead of a
painted five. Everything it makes audible obeys the teacher's sound switch (D-27).

`add-shapes-and-shorter-lessons` delivers **the new lessons** and three of the block types.
The teacher sent back two of her own HTML lessons, and read together they said two
different things. The first was our Animals lesson cut in half — the same ten animals and
the same seven exercises, five words to a lesson — which is a finding about teaching and
not about software: **a lesson is five words** (D-36). Animals is now `animals-1` and
`animals-2`. The second was a new topic, Shapes, most of whose exercises the engine could
not play: `phrases`, `quiz` and `describe` are what it needed, and the eight shapes are
drawn as exact SVG rather than borrowed from an emoji font that has no oval (D-38). Two of
her exercises are deliberately absent (D-39).

`add-hotspot-memory-scramble` delivers **the last three block types**: Body Parts gains
*Label the Body* and *Build It*, Animals part two gains *Memory*, and `lesson-format` loses
the body-diagram exception it had carried since v0.1. The drawing is the app's, as two
panels rather than her single figure, because nine parts on one figure cannot be spaced far
enough apart for a child's finger once the stage is scaled down (D-40).

What remains of v0.2 is re-cutting the remaining four lessons to five words each, and tablet
polish.

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
| **Room creation is unbounded in production.** `POST /api/rooms` needs no account and makes a Durable Object per request; the platform rate limiter is bound and consulted but never refuses on this account — verified even at two requests per ten seconds (2026-09-04) | the Worker's own check is correct and unit-tested, and fails open by design (D-25). Open until either the limiter is made to work or the fallback is taken: a counter in a Durable Object. The address is not published anywhere and has one user |

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
| D-18 | `add-synced-rooms` ends at two browsers against `wrangler dev`; publishing, asset serving and CI deployment are `add-cloudflare-deploy`. **Closed** by that change — see D-23, D-24, D-25 | 2026-09-04 |
| D-19 | Room behaviour lives in `src/shared/room.ts` as pure code with the Durable Object a thin adapter, so convergence is a unit test rather than a two-browser check | 2026-09-04 |
| D-20 | The room holds the lesson's data, not just its id: it is sent when the room is opened and when the lesson is switched. The Worker keeps no lesson catalogue, so principle 3 survives — a new lesson is still a file in `lessons/` and needs no deploy | 2026-09-04 |
| D-21 | The teacher paces a shared lesson: moving between exercises and resetting one are hers alone, absent from the student's screen and refused by the room. The lock stays a separate, stronger rule about touching the exercise itself. An unsynced student therefore holds their exercise rather than walking on — qualifies principle 4 | 2026-09-04 |
| D-22 | The app carries its own mark and a web manifest, so it can be kept on a home screen as a standalone window. It deliberately stops short of a service worker: the lesson already runs with the network gone, and a cache layer would only add a stale-content failure mode in front of a child | 2026-09-04 |
| D-23 | The published address is a `workers.dev` subdomain, not a domain of our own. Nothing about a domain can be judged before a real lesson has been taught, and adding one later changes no code — every URL the client builds comes from `window.location` | 2026-09-04 |
| D-24 | Publishing happens from CI on a push to `main`, only after the type check, tests and build have passed, so what is served is always a revision that exists in `main`. A hand-run deploy stays the break-glass route. The API token and the account id are repository secrets: the repository is public (D-1) | 2026-09-04 |
| D-25 | Opening a room is rate limited per calling address, since it needs no account and each request makes a Durable Object. The bound sits far above any teaching pace and the check fails open: a mechanism guarding a quota may never be the reason a lesson cannot start (qualifies principle 4) | 2026-09-04 |
| D-26 | The build says which build it is, on the home screen only. The number is derived when the app is built — `package.json`'s major and minor plus the commit count — rather than bumped by a script and tagged: a pipeline that commits a version writes a commit for every commit, and publishes a revision its author never wrote. A build with no history says `-unknown` rather than naming one it is not | 2026-09-04 |
| D-27 | One sound setting per room, the teacher's, covering both screens and on by default. It suppresses what the app volunteers — every line an exercise says of its own accord — and never what the learner presses to hear, so a quieted listening exercise becomes press-to-hear rather than an unanswerable one. The teacher is the voice of a live lesson; the app is the second one only when she says so. Answers the open question `add-star-trail` left; its chime, its notes and its spoken praise obey this switch (D-28) | 2026-09-04 |
| D-28 | A star is earned by **completing** an exercise, never by accuracy: a wrong answer stays a shake and another try, and nothing counts mistakes. A star mirrors the lesson state exactly and remembers nothing, so a reset returns it to open and completing again earns it again — the simplest rule, chosen over "once earned, always earned", which would have needed new state on the wire. The closing screen shows the stars actually earned rather than a fixed five, because a child notices that stars nobody can fail to get are not worth having. The celebration is a sound and a picture and never a word: no phrase is spoken for a completed exercise or for a finished lesson. Recorded praise in the lesson's own voice was built first and then removed — the teacher is the voice of a live lesson, and an app congratulating the child a beat after she was about to is talking across her. The closing screen also stands the header's marks down and shows its message as its own heading, so the stars and the sentence each appear once | 2026-09-04 |
| D-29 | Vocabulary is shown as a **picture**, with the emoji kept as the fallback rather than replaced. `emoji` stays a required field of an item and the pictures are a generated asset beside it, listed in a manifest the client bundles — so an item nobody has drawn yet still plays, a lesson is illustrated after it is written rather than before, and nothing new travels over the wire when a room sends its lesson (D-20) | 2026-09-04 |
| D-30 | A lesson is illustrated for every item or for none, and two of them are deliberately "none". Colours are written as exact SVG swatches, not drawn: a generator gets the hue approximately right, which is the one thing that lesson teaches. Numbers keep their keycaps, because a drawn numeral is the failure a child cannot catch — a four that reads as a nine is a wrong answer, not a style problem — and the counting pictures the lesson does need already exist as its `dots` tag. A half-drawn lesson is treated as a defect and has a test | 2026-09-04 |
| D-31 | Pictures are generated by a committed script from a prompt table (`scripts/pictures.ts`), the way clips are, and only the 512 px copies are committed — never the 2 MB originals. The set holds together because every drawing after the first is made against the first as a reference, so re-drawing one item is a one-line change and re-drawing all of them is deleting the anchor | 2026-09-04 |
| D-32 | The teacher can **draw on the exercise itself**, and so can the student — her first piece of feedback from a real lesson, and her own answer when asked whether she meant a separate board or the lesson: the lesson. Ink is a second kind of traffic, relayed and retained by the room but never reduced: it does not enter `LessonState`, does not advance its version, and does not enlarge the snapshot broadcast on every tap, which would otherwise make the whole lesson more expensive for the rest of its life. A stroke is the unit of everything — added, erased, undone and cleared whole — so the eraser removes whole marks rather than pixels, which is what keeps undo, per-author clear and a cheap relay all expressible at once. A stroke travels once, when the pen comes up, and only a very long one is sent in parts; the threshold is one constant, and lowering it is all it would take to stream a line live | 2026-09-09 |
| D-33 | Whether the student may draw is a **third teacher-owned switch**, beside the lock and the sound setting and independent of both: an exercise can be held while the child is still invited to circle her answer, and the pen can be taken away while the exercise stays hers to play. Enforced by the room rather than by hiding the toolbar, for the reason the other two are — the child the rule is aimed at is the likeliest person to reload the page. Taking the pen stops new marks and leaves every mark she has already made on both screens | 2026-09-09 |
| D-34 | Drawing belongs to a **room** and is offered nowhere else: a lesson opened from the home screen has no pencil, because a mark made there has nobody to reach. A room that has lost its socket still draws — that is a room with a bad connection, not a lesson played alone | 2026-09-09 |
| D-35 | The exercise is laid out at one **fixed reference width and scaled** to fit rather than reflowed, and given a fixed height as well. Reflowing put five cards in a row on a laptop and two on a phone, so the same fraction of the stage named different content on the two screens and a circle around the apple would have arrived around the milk. The height is fixed for a different reason: a mark is made around and beside the content as often as on it, and a board cropped to the last row of cards has nowhere to put an arrow. Above the reference width nothing changes at all, so the teacher's laptop renders exactly as before; below it the arrangement stays the laptop's and shrinks | 2026-09-09 |
| D-36 | **A lesson is five words, not ten.** The teacher's own re-cut of Animals — the same content behind two tabs, "learn 5 new animal words" over each — is the finding: a child who has met ten animals in forty minutes has been shown ten, not taught ten. A topic longer than five words becomes several lesson files rather than one long lesson or one lesson with parts. Files are already what the app loads, routes to, opens a room on and scores; a `parts` field would put a presentational grouping into the format, the player, the star trail and the room protocol. The cost is a home screen of ungrouped cards, and grouping them is deferred until the real number of lessons is known | 2026-09-09 |
| D-37 | **A later part carries the whole vocabulary and teaches only its own half.** What is capped is what a lesson introduces, not what it contains. This is not bookkeeping: all five wild animals live in the jungle, so "Where do they live?" over part two alone is one bucket and no question at all. Sorting, listening and matching are revision by nature — they need a spread — so they belong to the part that has one. Re-tagging the animals to fit the exercise was rejected: the fact is the thing being taught | 2026-09-09 |
| D-38 | **Shapes are written as exact SVG, not taken from the emoji font**, extending D-30 from hues to geometry. The font has no oval — the teacher's own page labels a green circle "oval" — and the geometric character for a rectangle renders as an outline, a filled box or nothing at all depending on the device. A shapes lesson that shows a circle for "oval" teaches the opposite of what it says. Colours come from the palette the colour lesson already uses, so a child meets the same red twice | 2026-09-09 |
| D-39 | **Two of her exercises are deferred, by name.** *Repeat After Me* has the teacher award a star for a spoken attempt: nothing in the product scores a person rather than a tap, and adding that changes what a room is. *Draw the shape* is a prompted, self-marked drawing, which is a block built on the ink (D-32) rather than a use of it. Naming them in the spec is deliberate — they are absent rather than approximated, and nothing in the format half-implements either | 2026-09-09 |
| D-40 | **A diagram is drawn by the app and placed by the lesson.** `hotspot` is the one block type that needs something a lesson file cannot carry, so the app holds a small catalogue of named scenes and the lesson says which word sits in which rectangle of one. A lesson labelling a drawing that already exists is data alone; a lesson needing a new drawing needs a deploy — the one deliberate exception to D-3, and drawn as narrowly as it can be: a scene is artwork and a coordinate space, and never decides what is asked or what is right, so two lessons can label one figure with different words. The drawing itself went into the app rather than into the lesson because a lesson file half of which is `<path d="…">` is no longer something a non-programmer reads. The body scene is **two panels** — a large head beside a small whole figure — rather than the teacher's single figure: the stage is laid out at a fixed width and scaled down (D-35), so two places a child must tell apart need about 110 px between their centres in that layout, and six of them stacked down one figure would want 660 px of the 510 the stage has. Her page is the specification for what the exercise asks, not for how it is drawn | 2026-09-10 |
| D-41 | **Memory is cooperative: no turns, no score per side** — a deliberate departure from the backlog entry that named the type ("pairs, alternating turns, teacher-vs-student score"). An action does not carry who sent it, so a turn would be a rule the app draws and cannot enforce, in an app whose three other rules about who may act — the lock, the pacing and the pen — are all enforced by the room precisely because a browser rule aimed at a child is undone by a reload (D-9, D-21, D-33). Enforcing it would mean putting identity into the reducer for one exercise. The two play the board together; the exercise counts tries and ranks nobody. A miss stays face up until the next tap rather than being cleared by a timer, because the model has no clock and two clients have two of them. Turn-taking may return as its own change once a real lesson shows the pair actually take turns — but it should arrive with a way to mean it | 2026-09-10 |
| D-42 | **A new block type ships used by a real lesson in the same change.** A type nobody teaches with is untested where it counts: the fixture proves it reduces, and only a lesson proves it is worth playing. So `hotspot` and `scramble` landed in Body Parts and `memory` in Animals part two, in this change, rather than as an engine feature waiting for content. The corollary is that a block's `speak` templates are chosen from lines the lesson already says wherever possible, so a new exercise does not silently drop the whole lesson back to the device voice (D52) | 2026-09-10 |
