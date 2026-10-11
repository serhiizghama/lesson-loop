## Context

See `proposal.md` — Why. What matters for the approach is the state of the app it has to
describe, and the standing rules it must not break.

The app is one Vite bundle served by one Worker, with about thirty lines of hand-written
router and no code splitting anywhere. There is no markdown pipeline, no docs site, no
component library and no CSS framework: `src/ui/app.module.css` and a handful of custom
properties are the whole design system. `public/` holds files the build copies verbatim,
and `tests/app-icon.test.ts` is the precedent for checking that a file the app names is
actually published.

The features to describe are finished, not moving: twelve playable exercise types plus the
closing screen, rooms with two links, the teacher's panel, the pencil, the star trail, and
the size choice that `add-lesson-size-choice` archived on 2026-09-10.

Two constraints shape everything below. The guide has one reader, who is not technical and
will read it on a laptop beside a video call or on a tablet. And documentation that nobody
is forced to update stops being true within two changes — so whatever cannot be checked by
a test will be wrong by v0.3.

## Goals / Non-Goals

**Goals:**

- One screen inside the app that a teacher can read in five minutes and consult in five
  seconds.
- The parts of it that can go stale — the list of exercises, the pictures — are held to the
  app by tests rather than by intention.
- No new dependency, no new build step, no new deployment target.
- It looks like the app, because it is the app.

**Non-Goals:**

- Not a second README. Nothing about the lesson format, the room protocol or how to add a
  lesson: that is `README.md`, and its reader is whoever builds this.
- Not localisation. English only; a Japanese page for parents is a separate question with a
  separate audience.
- Not in-lesson help — no tooltips, no coach marks, no first-run tour. Those interrupt a
  lesson; this is read outside one.
- Not printable, not offline-first beyond what the app already is, not versioned per
  release.

## Decisions

### D1 — The guide is a route in the app, not a file beside it

`/guide` becomes a fifth `Route` and renders a `Guide` component, the way `/l/…`, `/t/…`
and `/r/…` already do.

*Why.* It inherits the app's tokens, its type scale, its warm paper field and its
behaviour on a narrow window for free, and — the deciding reason — its content becomes
reachable from Vitest, which is what makes the coverage rule in D8 possible at all.

*Rejected: a static `public/guide.html`.* It would cost nothing in the bundle and could be
sent as a link without opening the app. It loses because it needs a second copy of the
stylesheet that will drift from the first, and because nothing in CI can see it: a page no
test can read is a page that quietly stops being true. The bundle saving is measured in D7
and is not worth that.

*Rejected: markdown compiled to HTML at build time.* A markdown parser in
`devDependencies` and a step in the build, bought for one page — and the two-column layout
would still be written by hand.

### D2 — Prose is prose; the exercise list is data

`src/ui/Guide.tsx` holds the sections as `{ id, title, body }`, where `body` is ordinary
JSX. The contents list is derived from that array, so a section cannot exist without an
entry in the navigation or the other way round.

The one part held as data rather than prose is the exercise reference:
`{ type: BlockType; name: string; child: string; teacher: string }`, one row per playable
type. That is the part with an external source of truth — the block registry — and the
part a test has to be able to compare against it.

*Why not all data.* A mini-markup for paragraphs, lists and figures is a format to invent,
document and maintain so that prose can be stored one level away from where it is read.
JSX is already that format.

*Why not all prose.* A sentence in a paragraph cannot be checked against a registry. The
row can.

### D3 — The pictures are real screenshots, captured by hand and named in a manifest

Eight files under `public/guide/`, listed in a `PICTURES` manifest the component renders
from, so a test can assert each file exists exactly as `tests/app-icon.test.ts` does for
the icons.

Budget: ≤ 120 KB each, ≤ 600 KB in total, every shot the same window scaled to 1000 px
wide, so the set looks like one set. As built: eight JPEGs at 1000×564, 316 KB in total,
the largest 60 KB. JPEG rather than PNG because the capture itself is JPEG and re-encoding
a JPEG as PNG keeps its artefacts while trebling its weight — and the app's own vocabulary
pictures are JPEG for the same reason.

One detail the recipe carries: the student link visible in a shot is rewritten to the
published address before the shutter, because the teacher will never see a development
one, and a screenshot of the app is supposed to be a screenshot of *her* app.

Each is rendered with explicit `width`/`height` (no layout shift), `loading="lazy"`, and
an `alt` that says what the picture shows rather than naming the file.

*Rejected: a capture script driving a headless browser.* Playwright or Puppeteer in
`devDependencies`, plus browser binaries in CI, for eight images that change a few times a
year — and the two-device shots (the teacher's panel beside the student's view) need two
contexts and a live room, which is most of an integration harness. The manual recipe in
`tasks.md` is a checklist; that is proportionate.

*Rejected: live miniature demos rendering the real block views.* Never stale, and
genuinely attractive — but it makes the documentation page depend on the lesson player,
so a change to the player can break the guide, and it still cannot show the one thing
that most needs showing: two screens, two links, one lesson.

*Rejected: drawings only.* Cheap and stable, and they answer "how does it work" — but the
teacher's question is "which of these is the button", and a diagram does not answer it.
One drawn diagram survives, for the two links, where a screenshot of two windows is worse
than a picture of the idea.

### D4 — Re-capturing is a list, not a memory

The eight shots, the viewport, the lesson to open and the state to reach are written down
in `tasks.md` and summarised in `README.md`, so the next person re-takes the same eight
pictures rather than eight different ones.

The room code visible in a screenshot is a dead room by the time it is committed — rooms
are discarded after three hours — and there is no name, no account and no student data
anywhere in the app to leak into a picture.

### D5 — The way in is in the teacher's panel, and it opens a second tab

A quiet link — "📖 Teacher guide" — among the controls in `TeacherPanel`, under Change
lesson and above the answer key. It carries `target="_blank"`.

*Why there.* The panel is the only surface in the app that exists for the teacher alone:
it is rendered when the room says she is the teacher, and the student's view has no
equivalent. An entry there is unreachable by a child by construction rather than by
styling — which is a stronger guarantee than any placement on a shared screen can give.
It is also where the questions actually arise: what this control does is asked while
looking at the control.

*Why a second tab.* Everything else in this design is reversible; navigating a live lesson
away to read documentation is not the kind of thing to be casual about. The room survives
being left — its state is the room's, not the tab's — but the teacher would be looking at
prose while a child looks at an exercise. A tab keeps both.

*Rejected: the home screen's brand band.* Chosen first, and turned down by the client: the
guide is a teaching aid, and the home screen is a shelf of lessons. It also puts the entry
on the one screen where the teacher has no question yet. What it cost is the "read it
before your first lesson" path, which is now served by the address itself — the guide is
reachable at `/guide` whether or not a room is open, and that is what a bookmark is for.

*Rejected: a banner card above the lesson grid.* Loudest for the first visit and a tax on
every visit after it, on the screen whose whole job is "pick a lesson".

*Rejected: the header of a solo lesson too.* It would cover the teacher preparing before a
lesson, but it puts a documentation link one tap from a child's hand in the one mode where
the same screen is sometimes turned round to face them.

### D6 — Sections are addressed with the fragment, and nothing intercepts them

Section links are ordinary `<a href="#pacing">` anchors. `parseRoute` reads the fragment
only for `/t/…`, where it carries the teacher's key; on `/guide` the fragment means a
section and no JavaScript is involved in honouring it.

This gives the browser's own behaviour: the Back button walks the sections, and a link to
one section opens the guide at it, without a scroll-spy or a router that understands
anchors.

### D7 — The guide ships in the main bundle, and that is fine

Measured intent: prose and the exercise table together are on the order of 15 KB of source
and a few KB gzipped; the pictures are separate files, lazily loaded, and cost nothing
until the guide is opened.

*Rejected: `React.lazy` and a separate chunk.* The app has no code splitting at all today.
Introducing a chunk boundary and a `Suspense` fallback — and a second network round trip on
a connection we already assume is weak — to save a few KB is machinery bought for nothing.

The task list measures the built bundle before and after. If the guide ever costs more than
about 50 KB gzipped, this decision is worth revisiting; it will not, at eleven sections.

### D8 — What can rot is held down by three tests

- **Exercises.** Every playable type in the block registry has a row in the guide's
  exercise table, and every row names a type the registry has. A thirteenth block type
  fails CI until it is described. This is the rule that makes the guide survive its
  authors.
- **Pictures.** Every file named in `PICTURES` exists under `public/guide/`, and none of
  them points at another origin — the same two assertions `tests/app-icon.test.ts` makes.
- **Vocabulary.** The rendered text contains none of a short list of construction words
  (JSON, worker, reducer, repository, npm, localhost, commit, TypeScript). It is a crude
  check and it is the one that keeps a developer's sentence out of a teacher's page.

What no test can check is whether a screenshot still looks like the app. That residual is
accepted and named in the risks.

### D9 — The guarantees about sound, pencil and rooms come from where the guide sits, not from flags

The guide is not rendered by `LessonPlayer` and holds no `LessonState`. There is no sound
to suppress, no pencil to hide and no socket to avoid opening, because none of that
machinery is on the screen. The spec's requirements about them are satisfied structurally,
and the tests assert the absence rather than a setting.

### D10 — The guide carries the same build line the home screen does

`buildLine(__APP_VERSION__, __BUILT_AT__)` is already written and already used on the home
screen. Reusing it costs one line and turns "the guide is wrong" into "the guide for build
X is wrong", which is a report someone can act on.

## Risks / Trade-offs

- **Screenshots drift from the app and nothing notices** → the pictures are checked to
  exist, never to be right. Mitigated by keeping the set small (eight), by the re-capture
  list in D4, and by the build line in D10 making a mismatch reportable. Accepted: the
  alternative is a browser in CI.
- **The guide duplicates `README.md` and the two disagree** → they have different readers
  and the split is stated in the Non-Goals: the README explains how the app is built, the
  guide explains how it is taught with. Where both state a limit — four in a room, three
  hours — the guide states its effect on a lesson, which is a different sentence.
- **It grows into a manual nobody reads** → the budget is one screen per section and about
  1200 words in total. No test enforces brevity; review does, and the five-minute claim in
  the spec is the standard to review against.
- **The vocabulary test fires on an innocent sentence** → the word list is short, checked
  whole-word and case-insensitive, and lives in the test where it can be argued with.
- **A section link shared today points somewhere else after a rewrite** → section ids are
  chosen for the subject ("pacing", "two-links") rather than for the order, and are treated
  as part of the guide's contract.

## Migration Plan

Nothing to migrate: no data, no stored state, no address that meant something else.
`/guide` currently renders the "there is no such page" screen, so the only behaviour
changing is that it stops doing so.

Deployment is the ordinary one — CI builds and `wrangler deploy` publishes; the eight
pictures ride along in `dist/` like every other asset in `public/`. Rollback is a revert:
nothing in a lesson or a room reads the guide, so removing it cannot affect a sitting in
progress.

## Open Questions

- Whether the teacher wants a page aimed at *parents* rather than at herself — the same
  facts, a different reader, and possibly in Japanese. Deferred: it is a new capability
  with a new audience, not a section of this one.
- Whether v0.3's lesson editor gets a section here or a guide of its own. Answerable when
  the editor exists; it changes nothing in this design.
