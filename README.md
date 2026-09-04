# LessonLoop

Interactive English lessons for one-on-one online teaching. A lesson is a sequence of
tap-based exercises — flip cards, matching, sentence building, sorting, listening, and
physical-response games — built from a plain JSON vocabulary list.

A lesson opened from the home screen runs entirely in the browser: no sign-up, no
database, and no network call once the page has loaded. When the teacher wants the
student to join in, she opens a **room** — and only then does anything leave the device.

## Rooms: two links, two halves of the same lesson

Mid-lesson the teacher presses **Invite student** and the app opens a room carrying the
lesson exactly as it stands, progress included. That gives two links to one lesson:

| Link | Who it is for | What it shows |
|---|---|---|
| `/t/<code>#<key>` | the teacher | the exercise **plus** the answer key, the lesson controls that pace the session, the student's link, a lock on student input, and whether the student is connected |
| `/r/<code>` | the student | the exercise, its instruction, where in the lesson they are and how much is done — and nothing else |

Every tap inside the exercise moves both screens, whoever made it: flipping a card,
making a pair, placing an item, choosing a scaffold level. A tap is applied locally at
once and settled by the room, so it never waits for the network.

**The teacher paces the lesson.** Moving between exercises, resetting one and changing
lesson are hers alone — the student's screen has no controls for them, and the room
refuses them from a student even if something else sends one. The student sees where
they are (`3 / 9` and the progress bar) without steering. A lesson opened from the home
screen is solo and keeps every control, since there is no teacher to wait for.

The teacher's half is granted by the key in the link's `#fragment`, not by the route —
`/r/AB12` cannot be turned into `/t/AB12` by guessing. A student joining mid-lesson lands
on whatever is on screen, already in progress. The room outlives any one lesson: the
teacher can change lesson in place and the student follows on the same link.

**Losing the connection does not lose the lesson.** The app says it is working without
sync, keeps the exercise on screen fully playable, reconnects on its own, and brings the
screens back into agreement. Because the teacher paces the lesson, she carries on through
her own copy while the student holds the exercise they are on until the room is back. A
lesson opened from the home screen never opens a socket at all.

Rooms are anonymous and short-lived: a four-character code, at most four participants, no
account and no name to enter, and the room is discarded after three hours of inactivity.

## Running it

A lesson on its own needs one process:

```bash
npm install
npm run dev        # http://localhost:5173
```

A room needs two: the Worker that hosts it, and the client that talks to it. In one
terminal:

```bash
npm run dev:worker # wrangler dev, on http://localhost:8787
```

and in another:

```bash
npm run dev        # http://localhost:5173, proxying /api and /ws to the Worker
```

Then open a lesson, press **Invite student**, and paste the student link into a second
browser window. Publishing this to the internet is a later change; two windows against
`wrangler dev` is as far as it goes today.

```bash
npm run typecheck  # tsc --noEmit, over the client and the Worker
npm test           # vitest
npm run build      # production bundle in dist/
```

## Adding a lesson

Drop a JSON file into `lessons/`. Nothing else — no code, no registration, no imports.
It is picked up at build time, validated on load, and appears on the home screen.

A lesson has a vocabulary list and an ordered list of exercise blocks:

```jsonc
{
  "id": "colours",            // lowercase kebab-case, unique across lessons
  "title": "Colours",
  "emoji": "🎨",
  "audience": "kids",         // kids | teens | adults
  "l1": "ja",                 // language of the gloss, or null for none
  "items": [
    {
      "id": "red",
      "en": "red",
      "emoji": "🔴",
      "l1": { "word": "赤", "romaji": "aka" },
      "example": "It is red.",
      "tags": { "mood": "warm" } // free-form; exercises read these
    }
  ],
  "blocks": [ /* see below */ ]
}
```

### Grammar

The sentence exercise builds real sentences, so an item can declare what spelling cannot
tell it:

- `"plural": true` → *They are **eyes**.* instead of *It is a eyes.*
- `"article": "an"` → *It is **an** hour.* (the vowel-letter rule gets this wrong)
- `"article": "none"` → *It is hair.* for uncountable nouns

### Exercise blocks

Every block takes `id`, `title`, an optional `hint`, and an `items` selector — one of
`{"select":"all"}`, `{"select":"ids","ids":[…]}`, or `{"select":"tag","tag":"sound"}`.

| `type` | What the learner does | Extra fields |
|---|---|---|
| `cards` | Taps a card to reveal it and hear the word | `front`, `back` (faces), `speak` |
| `match` | Taps one side, then the other, to make a pair | `left`, `right` (faces), `count`, `speak` |
| `sentence` | Picks a word, then grows it into a sentence | `levels` (label + template) |
| `sort` | Taps an item, then the bucket it belongs in | `by` (tag), `buckets` |
| `listen` | Hears a word and taps the right picture | `choices` |
| `tpr` | Follows a spoken instruction with their body | `prompt` (template) |
| `finish` | The closing screen | `message` |

A **face** is one way of showing an item: `emoji`, `en`, `l1`, `example`, or `tag:<name>`.
A **template** fills `{en}`, `{article}`, `{it}`, `{be}`, `{this}`, `{l1}` and `{tag:<name>}`.
`speak` is a template too: the line a block says out loud about one item. Without it a
card speaks the English word and a pair says nothing beyond the tile that was tapped.

A themed exercise is never a new block type — it is an existing one reading a different
tag. "Which sound does it make" is `match` over `tag:sound`; "where does it live" is `sort`
by `habitat`; "move like this animal" is `tpr` with the prompt `{tag:move}`.

### If a lesson is wrong

Validation runs on load and in CI, and names the exact place:

```
blocks.6.buckets.2.key: no selected item has habitat = "ocean"
```

## How it is built

- `src/shared/` — the lesson format, its validation, the pure state reducer, and the room
  core. No React, no DOM: it runs unchanged in the browser and inside the Cloudflare
  Worker, and a test enforces that.
- `src/blocks/` — one React view per exercise type.
- `src/ui/` — the shell: routing, lesson picker, progress, navigation, teacher panel.
- `src/net/` — the socket to a room, its reconnection, and opening a room.
- `worker/` — the Worker and the `Room` Durable Object: thin adapters over `src/shared`.
- `lessons/` — the content.

Every tap is an action; `applyAction(lesson, state, action)` is pure and deterministic, and
shuffled orders come from a seed held in the state rather than from `Math.random` at render
time. That one function runs in two places — optimistically in each browser and
authoritatively inside the room — which is what lets two people on two devices see the
same screen. The room broadcasts its whole state after every action rather than a patch,
and a device adopts any snapshot at least as new as its own.

A new lesson still needs no code anywhere: the lesson travels to the room with the request
that opens it, so the Worker has no catalogue to keep in step with `lessons/`.
