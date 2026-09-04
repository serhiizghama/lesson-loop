## 1. The account — the owner's steps, not the agent's

These happen in someone's Cloudflare account and someone's GitHub settings. Each is
manual, and none may be reported as done on anyone else's say-so. No credential produced
here enters the repository (design D50).

- [x] 1.1 Log in to Cloudflare from this machine. **Check:** `npx wrangler whoami` names
  the intended account and reports the account id. The id is written down for task 5.3,
  not committed (design D50).
- [ ] 1.2 Confirm Durable Objects are available to that account on its current plan, and
  that our migration's `new_sqlite_classes` form is the one covered. **Check:** stated
  against the account's own plan page rather than against `PLAN.md`, which asks for
  exactly this ("verify the current limits at deploy time rather than trusting this
  document", §8). Record what the plan says about Worker requests and Durable Object
  usage, since design constraint 3 spends that budget.
- [ ] 1.3 Confirm the rate-limiting binding is available on the account (design D49).
  **Check:** if it is not, stop and say so — the fallback is a Durable Object counter,
  which changes design D49 and its tasks but neither spec.

## 2. One origin serves both halves

- [x] 2.1 Add the `assets` binding over `./dist` to `wrangler.jsonc`, with
  `not_found_handling: "single-page-application"` and
  `run_worker_first: ["/api/*", "/ws"]` (design D46, D47). Replace the file's "Local
  development only" header with what it now is. **Check:** `npm run build && npx wrangler
  dev` serves the home page at the Worker's own port — not just `vite dev`'s.
- [x] 2.2 Prove the fallback carries the client's routes. **Check:** against that same
  `wrangler dev`, `curl -s localhost:8787/l/animals`, `/r/AB12` and `/t/AB12` each return
  the app's HTML with a `200` (spec "A link opens cold, at whatever it names").
- [x] 2.3 Prove the fallback does **not** carry the room's routes. **Check:** `curl -s -X
  POST localhost:8787/api/rooms -H 'content-type: application/json' -d '{}'` returns JSON
  with a `400` — the Worker's own answer to a body with no lesson — and **not** HTML. A
  websocket upgrade on `/ws?room=AB12` is answered by the Worker, not with a page (spec
  "Serving the client never displaces the room"). This is the failure mode design D47
  exists for; run it, do not reason about it.
- [x] 2.4 Prove an icon still comes from the assets layer. **Check:** `curl -sI
  localhost:8787/icon.svg` returns `200` with `image/svg+xml`, and `/manifest.webmanifest`
  likewise — `public/` needs no work, but needs proving once (proposal, Impact).

## 3. A room route cannot be silently swallowed

- [x] 3.1 Export the paths the Worker answers on from `worker/index.ts` as a value, and
  route from that value rather than from free-standing string comparisons (design D48).
  **Check:** `npm run typecheck` passes and the existing Worker behaviour is unchanged —
  `npm test` stays green with no test edited to accommodate the refactor.
- [x] 3.2 Add a test that reads that exported list and `wrangler.jsonc`, and asserts every
  path the Worker answers on is covered by a `run_worker_first` pattern (design D48, spec
  "A new room address cannot be quietly lost"). **Check:** a named test per path, and
  `npm test` passes.
- [x] 3.3 Prove the test catches the failure it exists for. **Check:** temporarily add a
  path to the Worker's list without adding it to `run_worker_first`; `npm test` fails
  naming that path, and passes again once reverted. Report this as performed, not assumed.

## 4. Asking for a room cannot become a bill

- [x] 4.1 Declare the rate-limiting binding in `wrangler.jsonc` at ten requests per sixty
  seconds (design D49). **Check:** `npx wrangler dev` starts with the binding present and
  `npm run typecheck` passes with the binding added to `Env`.
- [x] 4.2 Consult the limiter in `POST /api/rooms` before a code is claimed, keyed by the
  client's address, answering `429` with a plain message when refused (design D49, spec
  "Rooms asked for faster than a lesson could need them"). **Check:** the check happens
  before any Durable Object is touched — a refused request must not create the thing the
  limit protects.
- [x] 4.3 Make the limiter fail open. **Check:** a unit test drives a fake limiter that
  throws and asserts the room is still created (design D49, and principle 4 — a protective
  mechanism may not be the reason a lesson cannot start).
- [x] 4.4 Unit test the limit against a fake limiter, the way speech is tested against a
  fake engine. **Check:** named tests for allowed, refused, and the refusal's status and
  body; no network and no real binding involved.
- [x] 4.5 Turn the refusal into something a teacher can read: `src/net/rooms.ts`
  distinguishes a `429` from a service failure and reports it as being asked for too
  quickly (spec "A refusal does not cost the lesson"). **Check:** a test asserts the two
  cases produce different messages, and the existing behaviour — the lesson stays on
  screen and playable, the notice appears — is unchanged.

## 5. Publishing

- [x] 5.1 Add a `deploy` script to `package.json` (`wrangler deploy`). **Check:** `npm run
  deploy --dry-run` — or `npx wrangler deploy --dry-run` — completes, reporting the
  bundle and the bindings, without publishing anything.
- [x] 5.2 Publish once by hand, now that task 1 is done (design D50, break-glass route).
  **Check:** the command reports the deployed URL; opening it shows the lesson list.
  Record the URL — it is what section 7 exercises.
- [x] 5.3 The account owner creates a scoped API token and stores it, with the account id,
  as GitHub repository secrets (`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`).
  **Check:** both appear in the repository's secrets list. **Manual, and the owner's — the
  agent neither sees nor creates the token** (design D50).
- [x] 5.4 Add a `deploy` job to `.github/workflows/ci.yml`: `needs: check`, and running
  only on a push to `main` (design D50, spec "Only a build that passed its checks becomes
  the published app"). **Check:** the workflow file is valid, and the job's condition
  excludes pull requests.
- [ ] 5.5 Prove CI publishes, and only from green. **Check:** a push to `main` publishes
  and the deployed URL serves the new revision; a pull request runs `check` and shows no
  `deploy` job having run. State which of the two was actually observed if only one was.

## 6. Docs and quality gates

- [x] 6.1 Update `README.md`: "Running it" gains how the app is published — the address,
  that CI publishes from `main`, and the by-hand route. **Check:** a reader can publish
  from the README alone, without opening `design.md`.
- [x] 6.2 Update `docs/PLAN.md` §8 (the Worker now really does serve the assets, and the
  two-process development story is no longer the whole picture) and §9 (v0.1's last item).
  **Check:** no statement left in `PLAN.md` contradicts the delta specs — including that a
  new lesson now reaches the teacher on a deploy, which narrows D-20 and must not be left
  reading as it does today.
- [x] 6.3 Add to `docs/PLAN.md` §12: close `D-18`, and record the domain, the CI
  publishing and the room limit as product decisions. **Check:** each row names the date
  and what was decided, in the existing table's form.
- [x] 6.4 Run the full gate. **Check:** `npm run typecheck`, `npm test` and `npm run build`
  all pass, and the result is reported honestly, naming anything skipped.

## 7. Acceptance — against the published address

- [x] 7.1 Open the published address in a browser that has never seen it. **Check:** the
  lesson list appears, and an icon is on the tab (spec "The teacher opens the app from a
  link").
- [x] 7.2 Open a lesson link and a made-up address directly, as first requests. **Check:**
  the lesson opens; the unrecognised address loads the app and says it does not know that
  address, rather than showing a server error (spec "A link opens cold", "An address the
  app does not recognise").
- [x] 7.3 Run a room across two browsers on the published address. **Check:** the teacher
  invites, the student link is copied out and opened in a second browser, a tap on either
  screen moves both, and the teacher's key grants the teacher's half (spec "The room is on
  the same origin as the page that opens it", "A second device is not configured").
- [ ] 7.4 Open the student link on a second physical device, on a different network.
  **Check:** it joins the same room. If no second device was available, say so and name
  this untested — a room proven only between two tabs on one machine is not the thing the
  change exists for.
- [ ] 7.5 Play a lesson on the published address with the network turned off after load.
  **Check:** every exercise behaves as it does locally (spec "Playing with the network
  gone", principle 4).
- [ ] 7.6 Exercise the room limit deliberately. **Check:** requesting rooms in a loop
  starts being refused with `429`; the lesson on screen stays playable; a room opened
  before the burst is undisturbed; and normal use immediately afterwards is not blocked
  (spec "A refusal does not cost the lesson", "A teacher's own pace is never refused").
- [ ] 7.7 Report which checks were automated and which were performed by hand, in the
  change's `verification.md`. **Check:** the manual tier is named as manual, never
  presented as test coverage; anything not actually performed — a second device, a second
  network, the pull-request half of 5.5 — is listed as untested.
