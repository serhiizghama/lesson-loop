## Context

See proposal.md — Why for the motivation, and `specs/published-app/spec.md` plus
`specs/synced-rooms/spec.md` for the behaviour being contracted.

What exists: `worker/index.ts` is a router over two paths — `POST /api/rooms` and `/ws` —
and answers `404` to everything else, because `vite dev` serves the client and proxies
those two to `wrangler dev` (D17). `wrangler.jsonc` already declares the `ROOMS` Durable
Object namespace and a `new_sqlite_classes` migration, under a header saying it is for
local development only. `.github/workflows/ci.yml` runs `npm ci`, `npm run typecheck`,
`npm test` and `npm run build` on pushes to `main` and on pull requests. `dist/` already
contains the client, the lessons bundled into it, and `public/` copied verbatim.

Four constraints shape the work:

1. **The client is already written for one origin.** `createRoom` fetches the relative
   `/api/rooms`; the socket URL is built from `window.location.protocol` and `.host`; the
   student link from `window.location.origin`. Nothing tells the client where the server
   is, so nothing has to be configured at build time — provided the server really is the
   same origin. This is D-2 being cashed in, and it removes what is usually the largest
   part of a deploy change.
2. **The lesson must not learn about the network.** Principle 4: with the socket down the
   app stays fully usable. Publishing may not put anything on the lesson's critical path,
   and a mechanism meant to protect the service may not be able to stop a lesson.
3. **Zero cost.** Principle 6 and D-2: the free plan. That makes request count a design
   input, not an afterthought — a decision that runs the Worker on every request to a PNG
   spends the budget the rooms need.
4. **The account is not ours.** Logging in, confirming the plan's limits and creating a
   deploy credential happen in someone else's Cloudflare account and someone else's GitHub
   settings. The design has to end at a seam a person can pick up, and say plainly which
   side of it each step is on.

Decisions continue the shared `Dn` sequence, last used at D45 by `fix-silent-speech`,
because code comments cite decisions by bare number.

## Goals / Non-Goals

**Goals**

- One origin that serves the client and hosts the room, with the client unchanged in how
  it addresses it.
- Every link the app hands out opening cold, including the student's.
- The rule that makes that possible unable to swallow the room, and unable to swallow a
  room route added later by someone who has forgotten this document.
- An unauthenticated room endpoint that cannot be turned into a bill.
- Publishing that happens from reviewed source, automatically, and never from a red build.

**Non-Goals**

- No custom domain, no second (staging) environment, no preview deployments per pull
  request. Each is a real thing to want and none is needed to teach a lesson.
- No service worker, no offline cache, no install prompt (that argument is settled in
  D29).
- No secret, credential or account identifier enters the repository. The repository is
  public (D-1).
- No change to the room protocol, the reducer, the Durable Object or the lesson format.

## Decisions

### D46 — One Worker serves the client and the room, through an assets binding

`wrangler.jsonc` gains an `assets` binding over `./dist`. The same Worker keeps `main`
pointing at `worker/index.ts`. One deploy publishes both halves, and they are the same
origin by construction rather than by configuration.

*Why:* the client already assumes one origin (constraint 1). One origin also means the
student's link, the page it loads and the socket it opens are indistinguishable to the
browser — no CORS, no preflight on `POST /api/rooms`, no `wss://` host to configure, and
no way for the two halves to drift to different versions, because there is only one
artefact.

*Rejected:* **Cloudflare Pages for the client plus a Worker for the room.** Two origins,
therefore CORS on the room endpoint and an explicit socket host in the client — the
configuration D-2 was chosen to avoid — and two deploys that can disagree about which
version is live. *Rejected:* **embedding the client in the Worker bundle** and serving it
from code: it puts every byte of the app through the bundle size limit and makes the
Worker run to serve a PNG, which is constraint 3 exactly.

### D47 — Unknown paths fall back to the app; the room's paths are declared to run first

Two settings, and they must be read together:

| Setting | Effect |
|---|---|
| `not_found_handling: "single-page-application"` | a request matching no file in `dist/` returns `index.html`, so `/l/animals`, `/r/AB12` and `/t/AB12` load the app |
| `run_worker_first: ["/api/*", "/ws"]` | those paths reach `worker/index.ts` before the assets layer sees them |

The second is not a refinement of the first — without it the change is broken in the way
that is hardest to see. `POST /api/rooms` matches no file, so the fallback would answer it
with `index.html` and a `200`. `createRoom` would then parse HTML as JSON and report the
room service as answering with something unexpected, on a deployment where every page
loads perfectly. The socket upgrade on `/ws` would be answered with a page.

*Why this pairing:* the fallback is what makes a pasted student link work, which is the
point of the change; the precedence list is what stops it eating the room.

*Rejected:* **`run_worker_first: true`** — every request, including each icon and the
JavaScript bundle, becomes a Worker invocation. It is correct and it spends the free
plan's request budget on static files (constraint 3). *Rejected:* **`not_found_handling:
"404-page"` with the Worker serving `index.html` itself** for unknown paths — the Worker
then runs on every navigation and re-implements, in our code, what the platform already
does. *Rejected:* **hash routing** (`/#/r/AB12`) to avoid needing a fallback at all — it
would change every link the app has already specified, and the teacher's key lives in the
fragment (D12), which a hash route would collide with.

### D48 — The Worker's paths are a list in code, and a test holds the config to it

`worker/index.ts` exports the paths it answers on, and routes from that list. The test
reads the same list and asserts every entry is covered by `run_worker_first` in
`wrangler.jsonc`.

*Why:* D47's failure mode is silent. Someone adds `/api/lessons` next month, the fallback
returns the app's page with a `200`, nothing throws, no test fails, no build breaks — and
it is found by a teacher whose Invite button stopped working. Making the route list a
value rather than a shape spread across `if` statements is what lets a test see it at all;
this is the same move `tests/app-icon.test.ts` makes — read what the app declares about
itself, then check the world matches (D31).

*Rejected:* **parsing `worker/index.ts` with a regular expression** to discover its routes
— it would go stale against the first refactor and fail for the wrong reason. *Rejected:*
**a post-deploy smoke check instead of a test** — it would catch this, but only after the
broken version is the one being served, and it needs the deployment to exist. Worth having
as well (see the Migration Plan), not instead.

### D49 — The room limit is the platform's rate limiter, keyed by client address, and fails open

`wrangler.jsonc` declares a rate-limiting binding; `POST /api/rooms` consults it before
claiming a code, keyed by the client's address, and answers `429` with a plain message
when refused. Nothing else is protected: `/ws` is reached only with a code that a room
already exists for.

The bound is set by what teaching looks like. A lesson opens one room; a retry or a change
of mind makes it two or three. A ceiling of ten in a minute is beyond anything the
`Invite student` button can produce — it is held while a request is in flight — and far
below what a loop would want.

**It fails open.** If the limiter itself errors, the room is created. A mechanism that
exists to protect a quota must never become the reason a lesson cannot start (constraint
2); the exposure is a rare error path, and the loss is bounded by the quota it was
guarding.

*Why the platform's limiter:* it holds the counter, so we add no storage, no binding to
KV, and no state of our own.

*Rejected:* **a Durable Object as a counter** — it spends the exact resource being
protected, one object per key, and adds a second stateful thing to reason about.
*Rejected:* **KV** — eventually consistent, so a burst passes before the count catches up,
which is the one case that matters. *Rejected:* **a WAF rate-limiting rule** — configured
in a dashboard, invisible to review, absent from the repository, and not something the
project can test or a future maintainer can discover. *Rejected:* **an API key on room
creation** — it is an account by another name, and D-6 puts accounts in v0.3.

### D50 — Publishing is a CI job on `main`, with the credential and the account id as secrets

A `deploy` job in the existing workflow: `needs: check`, and conditional on a push to
`main`, so a pull request runs the checks and publishes nothing. It installs, builds and
deploys. The API token and the account id both come from GitHub secrets.

*Why the account id is a secret too:* the repository is public (D-1). The account
identifier is not a credential, but it identifies a person's Cloudflare account to anyone
reading the repository, and there is no cost to keeping it out — `wrangler` takes it from
the environment.

*Why from CI rather than a laptop:* what is published is then always a revision that
exists in `main` and passed its checks. A hand-run deploy can publish uncommitted work,
and nobody can tell afterwards which version a lesson was taught on.

*Rejected:* **deploying on every branch or per pull request** — preview deployments are
useful and each one is a live app with a room endpoint on a free plan. *Rejected:*
**`wrangler deploy` from a maintainer's machine as the normal path** — kept as the
break-glass route and documented, not as the habit.

### D51 — The address is a `workers.dev` subdomain for now

No custom domain, no DNS. The student link is longer than one would like and is copied out
of the app rather than typed.

*Why:* nothing about the domain can be judged before a real lesson has been taught, and
the acceptance for v0.1 is that lesson. A domain is cheap to add afterwards and changes no
code — the client derives every URL from `window.location`.

*Rejected:* **buying a domain first** — it front-loads a decision (which name?) that the
first lesson will inform, and DNS is a second thing to be wrong while debugging the first
deployment.

## Risks / Trade-offs

- **The rate-limiting binding may not be available, or may behave differently, on the
  account.** → It is confirmed in the account before the limit is relied upon; the design
  fails open (D49), so an absent limiter degrades to today's behaviour rather than to a
  broken room. If it proves unavailable, the fallback is a counter in a Durable Object,
  which D49 rejected on cost rather than on correctness — the specs would not change.
- **`run_worker_first` and `not_found_handling` are platform settings whose exact form
  depends on the Wrangler version.** → The version is pinned in `devDependencies` already;
  the settings are verified against a local `wrangler dev` before the first deploy, and
  D48's test keeps the route list honest afterwards.
- **A published lesson is now a version that can go stale on a device.** A teacher with the
  tab open all day is running the build she loaded. → Accepted, and made explicit in the
  specs: a republish must not interrupt a room in progress. Reloading is the fix, and no
  service worker is added that would make reloading not enough (D29).
- **A new lesson now waits for a deploy.** → Named in the proposal and recorded as a
  narrowing of D-20 rather than left to be discovered. The pipeline is a push, so the
  delay is minutes.
- **The account owner's steps are outside CI and outside this repository.** → They are
  broken out as their own tasks, each named as manual, with what to check written down —
  not folded into "deploy it".
- **An open room endpoint remains open.** The limit bounds the rate, not the intent. →
  Accepted for v0.1: rooms are anonymous by design, hold four participants, and expire in
  three hours. The address is not published anywhere.

## Migration Plan

Nothing to migrate — there is no existing deployment, no user, no stored data and no
address that anyone depends on.

Order matters only in that the account steps gate the rest: the account owner logs in and
confirms Durable Objects and the free-plan limits; the config and Worker changes land; a
first deploy is run by hand to prove the account and the settings agree; the CI credential
is created and the job enabled; a smoke check exercises the deployed address — the home
page, a lesson link opened cold, a student link opened cold, an icon, and one room opened
and joined from a second browser.

Rollback is `wrangler rollback`, or reverting the commit and letting CI publish the
previous revision. Deleting the Worker removes the deployment entirely and leaves the
repository exactly as it is today.

## Open Questions

- Whether a `robots.txt` should be served to keep the address out of search results. It
  concerns a file that does not exist yet and changes neither these specs nor this task
  breakdown, so it can be answered after the first lesson.
