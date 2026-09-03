# LessonLoop — MVP Plan

Status: **DRAFT v1** · 2026-09-03 · written before the first line of code

---

## 1. What this is

A web app for **one-on-one online English lessons** where the teacher and the student
look at **one synchronised page** of interactive exercises. The teacher opens a lesson,
gets a link, sends it to the student — from then on both tap the same screen and each
sees what the other does.

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
2. **No database.** Room state lives in memory and dies with the lesson.
3. **Lessons are data, not code.** A new lesson is a JSON file in the repo.
4. **Solo mode is mandatory.** If the socket never opens or drops, the app keeps working
   fully — just unsynced. The teacher must never hit a blank screen mid-lesson.
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

```ts
type Lesson = {
  id: string                 // 'animals'
  title: string              // 'Animals'
  emoji: string              // '🐾'
  audience: 'kids' | 'teens' | 'adults'
  l1: 'ja' | null            // language of the hint shown on cards
  items: Item[]              // the lesson's vocabulary
  blocks: Block[]            // the sequence of screens
}

type Item = {
  id: string                 // 'dog'
  en: string                 // 'dog'
  emoji: string              // '🐶'
  l1?: { word: string; romaji?: string }   // { word: '犬', romaji: 'inu' }
  example?: string           // 'It is a dog.'
  audio?: string             // v0.2: path to an mp3; null for now → TTS
  tags?: Record<string, string>
  // tags: { sound: 'Woof', habitat: 'farm', move: 'Run like a dog!' }
}
```

A block is a discriminated union. Each type has its own settings, but all of them refer to
the lesson's `items` either by id or through a tag filter.

```ts
type Block =
  | { type: 'cards';    id: string; title: string; hint?: string;
      items: ItemRef; front: Face; back: Face[] }
  | { type: 'match';    id: string; title: string;
      items: ItemRef; left: Face; right: Face; count?: number }
  | { type: 'sentence'; id: string; title: string;
      items: ItemRef; levels: string[] }   // ['{en}', 'It is {article} {en}.', 'This is my {en}.']
  | { type: 'sort';     id: string; title: string;
      items: ItemRef; by: string; buckets: { key: string; label: string; emoji: string }[] }
  | { type: 'listen';   id: string; title: string; items: ItemRef; choices?: number }
  | { type: 'tpr';      id: string; title: string; items: ItemRef; prompt: string }
  | { type: 'finish';   id: string; title: string; message: string }

type Face = 'emoji' | 'en' | 'l1' | 'example' | `tag:${string}`
type ItemRef = string[] | { all: true } | { withTag: string }
```

The format is validated against real material: **both of her lessons must be expressible
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
Teacher: /t/AB12?lesson=animals     Student: /r/AB12
                    \                  /
                     WebSocket → Durable Object "room:AB12"
                        (state in memory, no database)
```

### Room state

```ts
type RoomState = {
  v: number                          // version, monotonically increasing
  lessonId: string
  slide: number                      // index of the current block
  blocks: Record<string, BlockState> // per-block state, keyed by block id
  locked: boolean                    // teacher has locked student input
}
```

### Protocol

Client → server:
- `{ t:'hello', room, role, lessonId? }`
- `{ t:'action', block, action, payload }` — any tap
- `{ t:'nav', slide }` — teacher only
- `{ t:'lock', value }` — teacher only
- `{ t:'reset', block? }` — teacher only

Server → client:
- `{ t:'state', v, state, peers }` — full snapshot (on join and on divergence)
- `{ t:'patch', v, block, state }` — targeted update
- `{ t:'peers', peers }` — who is in the room
- `{ t:'error', code }`

### Decision: one reducer, two execution sites

`applyAction(state, action) → state` lives in shared code and runs **both on the client
(optimistically, so a tap responds instantly) and inside the Durable Object
(authoritatively)**. The client compares the incoming `v` with its own: if they agree it
does nothing, if they diverge it accepts the server snapshot. Conflicts are resolved by
arrival order at the server; for "two people tapped at once" that is enough, and no CRDT
is needed.

### Rooms

- Code: 4 characters from an alphabet without `0/O/1/I/5/S`; the DO is addressed via
  `idFromName(code)`.
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

- **Home** — a grid of lesson tiles (emoji); picking one creates a room and reveals a
  "Copy student link" button.
- **Lesson, student view** — the exercise only, large tap targets, nothing else.
- **Lesson, teacher view** — the same plus a bottom bar: ← / →, "Reset block", "Lock
  student input", a "student connected" indicator, the answer key and prompt phrases for
  the current block.

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
│  ├─ engine/        # block rendering
│  ├─ blocks/        # cards, match, sentence, sort, listen, tpr
│  ├─ shared/        # reducer, types, protocol — shared with the worker
│  ├─ net/           # ws client, reconnect, solo mode
│  └─ ui/            # shell, teacher panel, progress
├─ lessons/          # animals.json, body-parts.json, ...
├─ worker/           # index.ts + Room (Durable Object)
├─ docs/
└─ wrangler.toml
```

---

## 9. Roadmap

**v0.1 — what she will actually try in a lesson**
The engine, six block types, both of her lessons as JSON, rooms and links, the teacher
panel, deployed to `*.workers.dev`. Acceptance: run a real lesson with two people and
collect feedback.

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
