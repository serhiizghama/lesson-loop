# Verification — add-cloudflare-deploy

Two tiers. The automated tier is `npm test` and can be re-run by anyone. The manual tier
is what a person had to drive, and it is named as manual throughout. One requirement is
**not met** and is recorded as such rather than dressed up.

Date: 2026-09-04. Published address: `https://web.lesson-loop.workers.dev`.
Client: Chrome on macOS 15.6, driven through browser automation.

## Automated — part of `npm test`

| Test file | What it proves | Spec requirement |
|---|---|---|
| `tests/worker-routes.test.ts` (6) | `wrangler.jsonc` serves `dist/`, unknown paths fall back to the app, `run_worker_first` is a list rather than a blanket `true`, and every path the Worker answers on is covered by one of its patterns | "A new room address cannot be quietly lost" |
| `tests/room-limit.test.ts` (9) | a room is created when the limiter allows; the limit is keyed on the calling address; a refusal is a `429` with `{"error":"too-many-rooms"}`; a refused request never touches the Durable Object; the room is created anyway when the limiter throws or is missing | "Rooms asked for faster than a lesson could need them", design D49 |
| `src/net/rooms.test.ts` (5) | the client tells a refusal from a service failure and words them differently | "A refusal does not cost the lesson" |

Whole suite at the time of the checkpoint commit `865f2a6`: **333 tests, 25 files, all
passing**; `npm run typecheck` and `npm run build` pass.

### The negative tests were run, not assumed

| Injected fault | Result |
|---|---|
| a `/health` route added to the Worker but not to `run_worker_first` | the test failed naming that path |
| the client's `429` message changed to contain the status number | the test failed |

Both reverted, both suites green again. A first attempt at the routing probe used
`/api/lessons`, which the `/api/*` pattern legitimately covers — that probe proved
nothing and was replaced, not counted.

## Manual — performed

| Check | How | Result |
|---|---|---|
| the fallback carries the client's routes (2.2) | `wrangler dev`, then `curl` | `/l/animals`, `/r/AB12`, `/t/AB12` each returned the app's HTML with a `200` |
| the fallback does **not** carry the room's routes (2.3) | same | `POST /api/rooms` returned the Worker's own JSON `400`, not HTML; `/ws` returned `426`/`400` from the Worker. This is the failure design D47 exists for |
| assets still come from the assets layer (2.4) | same | `/icon.svg`, `/manifest.webmanifest`, `/icon-180.png` all `200` with correct types |
| the deploy carries the right bindings (5.1) | `wrangler deploy --dry-run` | reported `env.ROOMS (Room) Durable Object` and `env.ROOM_LIMIT (10 requests/60s) Rate Limit` |
| published by hand (5.2) | `npm run deploy` after `wrangler login` | first published as `lesson-loop`, renamed to `web` so the address is not `lesson-loop.lesson-loop.workers.dev`. The old Worker was deleted by the repository owner |
| Durable Objects work on this account (part of 1.2) | the deploy itself | the DO binding and the `new_sqlite_classes` migration were accepted and rooms are created, which is stronger evidence of availability than a plan page. **The plan's quota numbers were not recorded** — see below |
| cold links (7.1, 7.2) | `curl` against the published address | `/`, `/l/animals`, `/l/body-parts`, `/r/AB12`, `/t/AB12` and an unrecognised address all returned the app with the icon links in `<head>` |
| a room across two screens (7.3) | opened a room by API, then the teacher link and the student link in two tabs | the teacher's panel showed **synced** then **student here**; the student's tap on 🐕 appeared on the teacher's screen as `dog · 犬 · inu` with the answer key greying out; the teacher's tap on 🐻 appeared on the student's screen as `bear · 熊 · kuma`. The student's screen carried no teacher controls |
| CI publishes from `main` (5.5) | pushed `865f2a6` | run #6: job `check` passed all four steps, then job `deploy` ran `npm ci`, `npm run build`, `npx wrangler deploy`, all green. The published page then served `index-Ds4_R83h.js`, the exact bundle the committed source builds. **Only the push half was observed** — no pull request was opened, so "a PR runs `check` and publishes nothing" is untested |

## Not met — the room limit does not bound anything in production

**Task 7.6 fails, and task 1.3's stop condition is met.** This is a requirement of
`synced-rooms` as modified by this change, and it is not satisfied by the deployed app.

What was observed, in order:

1. 14 room-creation requests in a row: all `201`. Then 5 more: all `201`.
2. A temporary diagnostic on the deployed Worker showed the binding is present
   (`typeof === 'object'`), the key is the real client address, and `limit()` **does not
   throw** — it resolves `{ success: true }` every time.
3. 25 further requests against that diagnostic path: `success=true` 25 times.
4. The limit was lowered to a deliberately absurd **2 requests per 10 seconds** and
   redeployed: 8 sequential requests, all still allowed.

The diagnostic was removed and the clean version redeployed; the `?diag=1` path is gone
from production, confirmed by curl.

So `POST /api/rooms` is currently **unbounded on the public internet**. The Worker's own
logic is correct and unit-tested — given a limiter that refuses, it refuses correctly and
without touching the Durable Object — but the platform's limiter never refuses on this
account.

Design D49 chose to fail open deliberately, and that choice is what makes this invisible
from outside: a limiter that never refuses is indistinguishable from no limiter at all.
The design's Risks section names the fallback: a counter in a Durable Object, which D49
rejected on cost rather than on correctness. **Taking that fallback would change D49 and
the tasks in section 4, and neither spec.** The decision was not taken before archiving,
so the risk is recorded in `docs/PLAN.md` §10, where it stays visible, rather than only
here.

## Manual — NOT performed

| Check | Why not |
|---|---|
| 1.2, the plan's quota numbers | availability of Durable Objects is proven by the deploy, but what the account's plan page says about Worker requests and Durable Object usage was never read or written down. `PLAN.md` §8 asks for exactly this at deploy time |
| 7.4, the student link on a second physical device on another network | **no second device was available — untested.** The room was proven only between two tabs on one machine, which is not the thing the change exists for |
| 7.5, the network turned off after load on the published address | not performed as written: the session cannot cut the machine's route to Cloudflare. What *was* done: with request logging cleared after the lesson had loaded, playing the lesson on the published address produced **zero network requests**; and the same build was played to the end offline locally, by killing the server that served it. Both are evidence, neither is the check as written |
| the pull-request half of 5.5 | no pull request was opened |

## A note for whoever reads this next

The published app also serves ~110 pre-generated audio clips, fetched when a lesson opens.
Those came in with `fix-silent-speech`, not with this change; they are mentioned only
because they are the largest thing the assets binding now carries, and because the "zero
requests during play" result above depends on them being fetched at load rather than at
tap.
