## Why

The app now publishes itself on every push to `main`, which means the teacher's screen and
the repository can differ at any moment and nothing on screen says so. When she writes
"the sound stopped working", there is no way to know which build she is looking at: her
tab may have been open since this morning, and reloading it is the first thing anyone
would ask her to do — but only if someone thinks to ask.

That is a support problem today and a worse one once a second person is teaching with it.
A build that cannot name itself turns every report into a guess, and the fix — "try
reloading" — is exactly the advice that wastes a lesson if it was not the cause.

## What Changes

- **The published app says which build it is.** The home screen carries a single quiet
  line at the bottom: the app's name, the version, and when that build was made.
- **The version is derived, not maintained.** It is computed when the app is built, from
  the repository's own history, so no file has to be edited and no one has to remember.
  Every commit that reaches `main` produces a distinguishable version without a second
  commit being made to record it.
- **It says nothing during a lesson.** The line appears where a lesson is chosen and
  nowhere else — not in an exercise, not on the student's screen, not on the teacher's.
  The student's screen is specified to show the exercise and nothing more, and a child of
  seven has no use for a build number.
- **A build made outside the pipeline still works.** Someone building on a laptop, or from
  a copy of the source with no git history at all, gets an honest placeholder rather than
  a crash or a number that pretends to be a release.

Deliberately out of scope: a version tag per commit, a changelog, a release process, an
in-app "what's new", and any prompt telling the teacher a newer build exists — that last
one needs the app to poll for something, which is a network dependency the lesson does not
have today.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `published-app`: gains a requirement that the published app identifies the build it is
  running, where the teacher can see it and the lesson cannot be disturbed by it.

## Impact

- `vite.config.ts` — the version and build time are computed at build and substituted into
  the bundle. This is the only place the git history is read.
- `package.json` — keeps its version as the human part of the number; the build supplies
  the rest. No script edits it, and no CI job commits to the repository.
- `src/ui/` — one line on the home screen, and its style.
- Tests — the version is derived by a small pure function that can be given a repository
  that has history, one that has none, and one that is not a repository at all.
- `README.md` and `docs/PLAN.md` §12 — where the number comes from and why nothing bumps
  it.
- **Unchanged:** `.github/workflows/ci.yml`. The pipeline neither writes nor tags; it just
  builds, and the build stamps itself. That is the whole point of deriving rather than
  maintaining.
- **Unchanged:** the lesson, the room, the protocol, the Worker. Nothing crosses the
  socket and nothing new is fetched.
