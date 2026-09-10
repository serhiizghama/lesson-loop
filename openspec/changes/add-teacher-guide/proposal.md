## Why

Nobody has ever explained this app to the person who teaches with it. She has twelve
exercise types, a room with two links, a panel that paces the lesson, a lock, a sound
switch, a pencil, a star trail and — since `add-lesson-size-choice` — a choice of how long
a sitting is. Every one of those arrived in a message from us, and none of it is written
down anywhere she can reach. The only document that describes the app is `README.md`, and
that is addressed to whoever builds it: JSON schemas, a reducer, a Durable Object.

The teaching cost is not hypothetical. A teacher who has not been told that the student's
link is a *different* link is one screen-share away from showing a seven-year-old the
answer key. A teacher who does not know that "Invite student" carries the lesson **as it
stands** will restart the lesson to invite. A teacher who does not know the student's
screen has no controls will wait for a child to press Next. Each of those is a minute lost
out of twenty-five, in front of a paying parent — and each is a sentence's worth of
explanation that currently lives in a chat thread.

The moment to write it is now, before v0.3 adds accounts and an editor, because the
feature set has just stopped moving: the twelve block types are all built, rooms are
deployed, and the size choice was the last outstanding piece of v0.2. What we write today
describes a finished thing rather than a moving one.

## What Changes

- **A new screen at `/guide`: the teacher's guide, in English.** A contents list down the
  left, the text on the right, one scrolling page with an anchor per section. It is
  written for two readings: five minutes before her first lesson, and five seconds in the
  middle of one.

- **The teacher's panel inside a room links to it**, among her controls and quieter than
  any of them. That panel is the one surface in the app built for her alone, so an entry
  there can never be found by a student. It opens in a second tab: a lesson in progress is
  never navigated away from to read documentation. Nowhere else offers it — not the home
  screen, not a lesson played alone — and its own address is what she keeps for reading it
  before a lesson.

- **The guide is documentation, not a lesson.** It carries no pencil, says nothing out
  loud, opens no socket and holds no lesson's progress. Leaving it returns to the
  lessons.

- **It covers the whole app, in eleven sections**: what this is · a five-minute start ·
  choosing a topic and its size · teaching alone · inviting the student and the two links
  · the teacher's panel (pacing, the answer key, the lock, sound, the pencil) · drawing on
  an exercise · the twelve exercise types, one line each · stars and the closing screen ·
  what happens when the connection drops · how to run a twenty-five minute lesson, and
  what to do when something looks wrong.

- **It shows the app rather than describing it.** Eight screenshots captured from the
  running app, committed under `public/guide/`, each one a screen she will actually meet.

- **Going stale is made into a test failure, not a good intention.** The exercise-type
  section is checked against the block registry: a thirteenth block type cannot reach
  `main` without a line in the guide describing it. Every screenshot the guide names is
  checked to exist, the way the app's icons already are.

- **The teacher, not the developer, is the reader.** The guide never mentions JSON, the
  reducer, the Worker or a lesson file. Where a limit exists (four in a room, three hours
  of inactivity, no accounts) it is stated as a fact about her lesson, not as an
  architecture note.

## Capabilities

### New Capabilities

- `teacher-guide`: the written guide to the app for the person teaching with it — where it
  lives, how it is reached, what it must cover, who may see it, and the rule that keeps it
  in step with the features it describes.

### Modified Capabilities

None. The guide's entry in the teacher's panel is part of the new capability rather than
an amendment to an existing one: it adds a way out to a page, and changes no requirement
about how a lesson plays, how a room behaves, or what the teacher's view does for
teaching.

## Impact

- **New**: `src/ui/Guide.tsx`, `src/ui/guide.module.css`, `public/guide/` (eight
  screenshots, budgeted at 600 KB in total), `src/ui/guide.test.tsx`.
- **Touched**: `src/ui/router.ts` (a fifth route), `src/ui/App.tsx` (the route branch),
  `src/ui/TeacherPanel.tsx` (the way in) and `src/ui/app.module.css` (how it is drawn).
- **Unchanged**: the worker, the lesson format, the reducer, the room protocol, every
  block view. No new dependency, and no build step — `wrangler`'s single-page fallback
  already answers `/guide` with the app.
- **Cost accepted**: the guide's prose ships inside the main JS bundle. It is measured in
  the tasks and rejected as a problem in `design.md`, where lazy-loading it is considered
  and turned down.
- **Ordering**: the guide describes the size choice, so it belongs after
  `add-lesson-size-choice` — which is implemented but not yet archived. Nothing here
  blocks on it beyond the words being true.
- **Roadmap**: this is new work, not a v0.2 item. `docs/PLAN.md` §9 gains it and §12
  records the product decision as **D-49**.
