## Why

Everything built so far exists only on one laptop, behind two terminal processes. The
teacher cannot teach with it. The student link the app hands her says `localhost`, which
on a child's tablet in another house is not an address at all — it is that tablet, and
that tablet has no lesson on it. So the rooms, the teacher panel, the answer keys and the
lock are all finished and all unreachable by the person they were built for.

That is also the last thing standing between v0.1 and its own acceptance test, which is
not a passing suite but a sentence: run a real lesson with two people and collect
feedback (PLAN §9). Until the app has an address, there is nothing to collect feedback
about, and every product question in PLAN §11 stays unanswered because the lesson that
would answer them cannot happen.

## What Changes

- A new `published-app` capability: the app has one address on the internet, both halves
  of a lesson are served from it, and a link opened cold on a device that has never seen
  the app before loads the lesson it names.
- **The Worker starts serving the client.** It has served only `/api/rooms` and `/ws` and
  answered `404` to everything else, because `vite dev` served the client and proxied to
  it (D-17). It now also serves the built client, so one origin carries both — which is
  what D-2 bought and what keeps the student's link, the room's socket and the lesson on
  the same host with no CORS and no configuration.
- **A link opened cold works.** `/l/animals`, `/r/AB12` and `/t/AB12` are client routes
  with nothing behind them on disk; opened directly they must return the app, not a
  missing file. That is the whole point of a student's link: it is pasted into a
  messenger and opened by someone who has never been to the site.
- **The room routes keep precedence over that fallback.** A fallback that answers "the
  app" for anything it cannot find will answer it for `/api/rooms` and `/ws` too, and the
  room would stop existing while every page still loaded. The order is made explicit
  rather than left to a default.
- **Asking for a room is rate limited.** Room creation is unauthenticated by design — no
  account, no name, nothing to enter (`synced-rooms`) — and each request makes a Durable
  Object. On the free plan that is a quota anyone with a loop can spend. The limit is set
  where a teacher's real pace cannot reach it, and a refusal explains itself rather than
  breaking the lesson.
- **Publishing happens from CI**, on a push to `main`, and only after the existing
  typecheck, tests and build have passed. A red build cannot become the app a lesson is
  running on.
- **A new lesson now needs a deploy.** D-20 kept the Worker free of any lesson catalogue
  so that adding a lesson needed no server change, and that still holds — the Worker
  learns nothing about lessons here. But `lessons/` is bundled into the client at build
  time, and the client is now a deployed artefact, so a new lesson reaches the teacher
  when it is pushed, not when it is saved. This is a real narrowing of "a new lesson needs
  no deploy" and is recorded rather than glossed.

Deliberately out of scope: a custom domain (the address stays a `workers.dev` subdomain
until a real lesson has been taught on it), a staging environment, accounts, and any
service worker or offline cache — the lesson already survives the network going away, and
a cache would add a stale-content failure in front of a child in exchange for nothing.

The account itself is not ours to make. Logging in to Cloudflare, confirming Durable
Objects and the free-plan limits on that account, and creating the CI deploy credential
are the account owner's steps; this change prepares everything that surrounds them and
names them as manual.

## Capabilities

### New Capabilities

- `published-app`: how the app reaches the people using it — one address serving both the
  lesson and the room, links that open cold on a device that has never seen it, what a
  published build is allowed to cost the lesson, and what it takes for new content to
  reach the teacher.

### Modified Capabilities

- `synced-rooms`: "A room is opened deliberately, never imposed" gains a bound. Asking for
  a room far faster than a lesson could ever need one is refused with a plain explanation,
  while a teacher's own pace is never refused and an existing room is never disturbed.

## Impact

- `wrangler.jsonc` — the assets binding over `dist/`, the explicit precedence of the room
  routes over the fallback, the rate-limit binding, and the loss of its "Local development
  only" header.
- `worker/index.ts` — one check before a room is created. The router stays a router; the
  refusal is a status and a message, not a new subsystem.
- `.github/workflows/ci.yml` — a deploy job after the existing check job, on `main` only.
- `package.json` — a `deploy` script. No new runtime dependency, and nothing added to the
  browser bundle.
- Tests — the Worker's routes and the config that must let them through are checked
  against each other, so a new `/api` route cannot be added and silently swallowed by the
  fallback; the room limit is unit tested against a fake limiter the way speech is tested
  against a fake engine.
- `README.md` — "Running it" gains how it is published. `docs/PLAN.md` §8 (the Worker
  finally does serve the assets), §9 (v0.1's last item), §12 (D-18 closes; the domain, CI
  and rate-limit decisions are recorded).
- `src/net/rooms.ts` — one addition: a refusal to open a room becomes a refusal the
  teacher can read, rather than the status number the notice shows today. The lesson
  already stays on screen and playable when opening a room fails; only the wording is
  missing.
- **Unchanged:** how the client addresses the server. `fetch('/api/rooms')` is already
  relative, the socket is already built from `window.location`, and the student link
  already from `window.location.origin`. No environment variable, no build-time URL, no
  CORS — this is what D-2 bought.
- **Unchanged:** the lesson format, the reducer, the room protocol, the Durable Object,
  and `public/`, which is already copied into `dist/` and needs nothing further.
