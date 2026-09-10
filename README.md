# LessonLoop

Interactive English lessons for one-on-one online teaching. A lesson is a sequence of
tap-based exercises — flip cards, matching, sentence building, sorting, listening, and
physical-response games — built from a plain JSON vocabulary list.

A lesson opened from the home screen runs entirely in the browser: no sign-up, no
database, and nothing to talk to. Opening a lesson fetches its spoken words as static
audio files from the same origin; after that it makes no network call at all. When the
teacher wants the student to join in, she opens a **room** — and only then does anything
leave the device.

**Every word is spoken.** English lines are pre-recorded into small clips committed to
this repository, so pronunciation does not depend on which voices a device happens to
have. A line without a clip — a lesson added but not yet recorded — is spoken by the
browser instead, so a new lesson works the moment its JSON exists. After editing a
lesson, `npm run audio` records whatever is new.

**Every word is drawn.** Vocabulary is shown as a picture rather than an emoji: one flat
illustration per item, 512×512 and about 35 KB, committed under `public/pics`. An item
with no picture falls back to its emoji, so a lesson plays the moment its JSON exists and
is illustrated afterwards — `npm run pictures` draws whatever is missing. Two lessons opt
out on purpose: colours are exact SVG swatches rather than drawings, because "red" has to
be red, and numbers keep their keycap emoji, because a drawn four that reads as a nine is
a wrong answer rather than a style problem.

## Rooms: two links, two halves of the same lesson

Mid-lesson the teacher presses **Invite student** and the app opens a room carrying the
lesson exactly as it stands, progress included. That gives two links to one lesson:

| Link | Who it is for | What it shows |
|---|---|---|
| `/t/<code>#<key>` | the teacher | the exercise **plus** the answer key, the lesson controls that pace the session, the student's link, a lock on student input, and whether the student is connected |
| `/r/<code>` | the student | the exercise, its instruction, where in the lesson they are and the stars they have earned — and nothing else |

Every tap inside the exercise moves both screens, whoever made it: flipping a card,
making a pair, placing an item, choosing a scaffold level. A tap is applied locally at
once and settled by the room, so it never waits for the network.

**The teacher paces the lesson.** Moving between exercises, resetting one and changing
lesson are hers alone — the student's screen has no controls for them, and the room
refuses them from a student even if something else sends one. The student sees where
they are (`3 / 9` and the star trail) without steering. A lesson opened from the home
screen is solo and keeps every control, since there is no teacher to wait for.

**Finishing an exercise is worth something.** The header carries one mark per exercise,
and completing the one on screen earns its star there and then: a star flies from the
exercise to its mark, a chime sounds, and confetti bursts over it. It lasts about a second
and a half, the exercise stays playable, and the lesson does not move on by itself — the
teacher's next control simply starts asking to be pressed. Both screens play it, from the
state they share, without a message passing between them.

It says nothing. The celebration is a sound and a picture, never a word: the teacher is
the voice of a live lesson, and an app saying "well done" a beat after the child finishes
is talking across the person who was about to say it.

A star is earned by **completing** an exercise, never by getting it right first time: a
wrong answer is a shake and another try, and nothing counts mistakes. A star is the
exercise's state and nothing more, so a reset returns it to open. The closing screen shows
one star per exercise, gold only where it was earned — which is the point: stars nobody
can fail to get are not worth having. It is the one screen where the header's marks stand
down, since the same stars are already there, large enough to count.

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
browser window.

```bash
npm run typecheck  # tsc --noEmit, over the client and the Worker
npm test           # vitest
npm run build      # production bundle in dist/
npm run audio      # record the clips a new lesson needs (macOS)
npm run pictures   # draw the pictures a new lesson needs (macOS + gemini-img)
```

## Publishing it

One Cloudflare Worker serves both halves: the built client through its assets binding, and
the room through the same code that runs under `wrangler dev`. That is why the client
never has a server address configured anywhere — it is always the origin the page came
from, so there is no CORS, no socket host to set, and no way for the two halves to be on
different versions.

**Normally you do not publish by hand.** Pushing to `main` runs the checks and, if they
pass, publishes. A pull request runs the checks and publishes nothing: a red build cannot
become the app a lesson is running on. This needs two repository secrets, which are set
once in GitHub — `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.

The by-hand route, for the first deploy or when CI is not an option:

```bash
npx wrangler login   # once per machine
npm run deploy       # builds, then wrangler deploy
```

`npx wrangler deploy --dry-run` reports the bundle and the bindings without publishing —
worth running after touching `wrangler.jsonc`.

Two things about `wrangler.jsonc` are load-bearing and easy to undo by accident:

- `not_found_handling: "single-page-application"` is what makes a student's link work when
  it is opened cold from a message. `/r/AB12` is not a file; without this it is a 404.
- `run_worker_first` lists the paths the Worker must answer *before* that fallback sees
  them. Leave a path out and the fallback returns the app's own page, with a `200`, to
  something expecting JSON — every page still loads and no room can be opened.
  `tests/worker-routes.test.ts` fails if the list and the Worker disagree, so add a route
  to both.

**A new lesson now needs a deploy.** The Worker still keeps no catalogue of lessons — a
lesson travels to the room with the request that opens it — but `lessons/` is bundled into
the client, and the client is what gets published. So a lesson reaches the teacher when it
is pushed, not when the file is saved.

### Which build am I looking at?

The home screen carries one quiet line at the bottom: `lesson-loop@0.1.16 · 2026-09-04 18:29`.
It is there so that "it stopped working" can be answered — a tab left open since the
morning shows an older version than a freshly opened one, and that is usually the whole
story.

**Nothing bumps the version.** `package.json` keeps the major and minor (`0.1.0`), and the
build appends how many commits the history carries, so `0.1.16` is the sixteenth commit.
No script edits a file, no job commits back to the repository, and no tag is created — the
number is derived when `npm run build` runs and baked into the bundle. To raise the minor,
edit `package.json`; the rest counts itself.

If you ever see `0.1.0-unknown`, the build could not read the git history — a tarball of
the source, a machine without git, or a shallow clone. The app works normally; it is just
telling you it cannot name itself rather than showing a number that would be a lie. In CI
that would mean the checkout lost its history, since the deploy job asks for all of it.

## Adding a lesson

Drop a JSON file into `lessons/`. Nothing else — no code, no registration, no imports.
It is picked up at build time, validated on load, and appears on the home screen. Being
picked up at build time is also why it reaches a published app on the next deploy rather
than the moment it is saved — see **Publishing it** above.

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
| `phrases` | Taps 🔊 on a model sentence, then says it | `lines` (literal sentences) |
| `quiz` | Sees something and taps the item it names | `ask`, `show` (faces), `count`, `speak` |
| `describe` | Answers two questions about one item | `questions` (two: label + face), `sentence` |
| `hotspot` | Taps a word, then the place on a drawing it names | `scene`, `spots`, `speak` |
| `memory` | Turns cards face up two at a time to find pairs | `left`, `right` (faces), `count`, `speak` |
| `scramble` | Builds a sentence from its words, shuffled | `template` |
| `finish` | The closing screen | `message` |

A **face** is one way of showing an item: `emoji`, `en`, `l1`, `example`, or `tag:<name>`.
A **template** fills `{en}`, `{article}`, `{it}`, `{be}`, `{this}`, `{l1}` and `{tag:<name>}`.
`speak` is a template too: the line a block says out loud about one item. Without it a
card speaks the English word and a pair says nothing beyond the tile that was tapped.

A themed exercise is never a new block type — it is an existing one reading a different
tag. "Which sound does it make" is `match` over `tag:sound`; "where does it live" is `sort`
by `habitat`; "move like this animal" is `tpr` with the prompt `{tag:move}`. `quiz` is the
same idea for guessing: `ask: "tag:thing"` with `show: "emoji"` is a riddle — *"a plate 🍽️"*
→ tap the circle — and `ask: "emoji"` with `show: "en"` is the same exercise the other way
round, naming the shape you can see.

`hotspot` is the one block that needs something the lesson cannot supply: the **drawing**.
A lesson names a `scene` the app carries — `body` is the only one so far — and gives each of
its words a place on it, as `[x, y, width, height]` in fractions of the drawing:

```json
{ "type": "hotspot", "scene": "body", "spots": { "nose": [0.31, 0.55, 0.10, 0.14] } }
```

So a lesson labelling a drawing that already exists is data alone, like every other lesson;
a lesson that needs a drawing nobody has made yet needs that drawing added to `src/scenes/`
and a deploy. That is the one deliberate exception to "a new lesson requires no new code",
and it is drawn narrowly: the scene is artwork and a coordinate space, and never decides
which words are asked for or what counts as right. Two lessons can label the same figure
with different words.

`phrases` is the one block whose content is literal text rather than vocabulary. The model
sentences a child says *around* the words — "Is it a square?", "Yes, it is." — are facts
about English, not about any one item, so there is nothing to render them from.

**A lesson introduces at most five new words.** A topic longer than that becomes several
lesson files — `animals-1.json`, `animals-2.json` — rather than one long lesson; a later
part carries the whole vocabulary so it can revise, and only the words no earlier part
carried count as new. `tests/lesson-length.test.ts` enforces it.

### If a lesson is wrong

Validation runs on load and in CI, and names the exact place:

```
blocks.6.buckets.2.key: no selected item has habitat = "ocean"
```

## The icon

The mark — a gold loop with an arrow head, on the app's ink field — is what the tab, the
bookmark and a home-screen shortcut show. It lives in `public/`, which Vite serves as-is in
development and copies into `dist/` at build:

| File | Where it is used |
|---|---|
| `icon.svg` | the tab, and any browser that takes a vector icon |
| `icon-180.png` | `apple-touch-icon` — an iOS or iPadOS home screen |
| `icon-192.png`, `icon-512.png` | the manifest — an Android tile and its splash |
| `manifest.webmanifest` | the shortcut's name, icons and colours |

**`icon.svg` is the source; the three PNGs are committed rasters of it.** To change the
mark, edit `icon.svg` — it carries the geometry in a comment — then export it at 180, 192
and 512 pixels square with whatever rasteriser you have to hand (Figma, Inkscape,
`rsvg-convert`) and overwrite the PNGs. Nothing in the build does this for you: a
rasteriser is a native dependency bought for four files that change about once a year.

`npm test` checks the wiring — that every icon `index.html` and the manifest declare
exists, that each PNG really is the size it is declared at, and that none of them points at
another origin. It cannot see whether the PNGs still *look* like the SVG, so redraw all
three together.

## How it is built

- `src/shared/` — the lesson format, its validation, the pure state reducer, and the room
  core. No React, no DOM: it runs unchanged in the browser and inside the Cloudflare
  Worker, and a test enforces that.
- `src/blocks/` — one React view per exercise type.
- `src/scenes/` — the drawings a `hotspot` lesson can label, as inline SVG. Their names and
  coordinate spaces live in `src/shared/scenes.ts`, so the Worker can validate a lesson
  against them without importing a component.
- `src/ui/` — the shell: routing, lesson picker, the star trail, navigation, teacher panel.
- `src/sound/` — the chime and the closing screen's notes, synthesised on the device with
  the Web Audio API: no audio file, no network, and silent when the lesson is quiet.
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
