## Context

See proposal.md — Why for the motivation, and `specs/published-app/spec.md` for the
behaviour being contracted.

What exists: `package.json` carries `"version": "0.1.0"` and nothing reads it. `vite.config.ts`
already computes values at config time (it resolves an alias from `import.meta.url`), so
substituting more is a small addition rather than a new mechanism. The home screen is
`src/ui/App.tsx`'s lesson picker; `src/ui/app.module.css` holds its styles. CI builds on
every push to `main` and deploys if the checks pass (D-24), so "published" and "built" are
the same moment.

Three constraints shape the work:

1. **Nothing may be written back to the repository.** A pipeline that commits a version
   bump doubles the history, and the commit it publishes is then one the author never
   wrote. The user weighed this against having the number stored in a file and chose
   derivation (recorded as D-26).
2. **The lesson must not learn about this.** Principle 4 and the `published-app`
   requirement "Publishing costs a lesson in progress nothing": the version may not be
   fetched, may not delay a screen, and may not appear where an exercise is.
3. **A build must work without git.** CI checks out with history, but `npm run build` also
   runs on a laptop, in a tarball, and in a shallow clone. None of those may fail the
   build.

Decisions continue the shared `Dn` sequence, last used at D56 by `fix-silent-speech`,
because code comments cite decisions by bare number.

## Goals / Non-Goals

**Goals**

- One line the teacher can read out, that names exactly what she is looking at.
- A number that changes on every published revision and needs nobody to maintain it.
- A build that succeeds wherever it is run, and is honest when it cannot know its version.

**Non-Goals**

- No tags, no releases, no changelog, no "what's new". Tags were considered and turned
  down with the same decision that turned down bumping (D-26).
- No update prompt, no polling for a newer build: that would give the lesson a network
  dependency it does not have.
- No version on the student's screen or inside an exercise. That is not a placement
  preference — it is what the specs already promise those screens.

## Decisions

### D57 — The version is `<package.json version>.<commits on this history>`

`package.json` keeps `0.1.0`; the build appends the commit count, so the app reports
`0.1.16`, then `0.1.17`, and so on. The major and minor stay a human decision made by
editing `package.json`; the last part counts itself.

*Why:* it changes on every commit that reaches `main` without anyone touching it, it reads
as a version rather than as a hash, and it sorts. The human half stays where a human
expects to find it.

*Rejected:* **bumping `package.json` in CI and committing the result** — the first
proposal, and it works, but it writes a commit for every commit and a tag for every tag,
so the history doubles and the published revision is one the author did not write. The
loop it risks is avoidable (a push made with the default CI token does not start another
run), but the noise is not. *Rejected:* **the commit SHA as the version** — it is exact and
it does not sort, does not compare, and cannot be read aloud over a video call, which is
the situation this exists for. *Rejected:* **the build timestamp alone** — two builds a
minute apart are hard to tell apart, and it says nothing about how much has changed.

### D58 — It is computed in `vite.config.ts` and substituted into the bundle

Vite's `define` replaces two identifiers at build time with literal strings: the version
and the build time. Nothing reads git at runtime, and nothing is fetched.

*Why:* the value has to be frozen at build, because that is what "which build is this"
means. `define` is the mechanism Vite already provides for exactly this, and it costs no
dependency and no plugin.

*Rejected:* **an environment variable set by CI** — it would work in CI and produce nothing
locally, so the local build would differ from the published one in a way nobody notices
until it matters. *Rejected:* **generating a `version.ts` file before the build** — a
generated file in the source tree is one more thing to gitignore, to forget, and to find
stale in an editor. *Rejected:* **reading `package.json` at runtime** — it is not served,
and making it served to learn a version is absurd.

### D59 — Deriving is a pure function; running git is the only impure part

A small function takes the base version, a commit count and a clock, and returns the string
to display. `vite.config.ts` supplies the count by running `git rev-list --count HEAD`, and
the function is what the tests drive.

*Why:* the interesting behaviour is the shape of the string and what happens when the count
is missing — neither needs a repository to test. This is the same split the project already
uses for the room: rules in a pure function, the impure edge as thin as possible (D19).

*Rejected:* **testing by shelling out to git in the test** — it would test the machine's git
and the repository the tests happen to run in, which is a different thing every time.

### D60 — Without git, the version is unknown and says so

If `git rev-list` fails for any reason — no repository, no git on the machine, a shallow
clone with no history — the build succeeds and the app shows `lesson-loop@0.1.0-unknown`.

*Why:* constraint 3. A build that dies because it could not count commits is a build that
fails for a reason nobody expects, in the place least convenient to debug. And a fallback
that quietly shows `0.1.0` would be worse than useless: it would name a version that is not
this build.

*Rejected:* **failing the build** — it makes a tarball of the source unbuildable.
*Rejected:* **falling back to the raw `package.json` version** — it looks correct and is
not, which is the failure mode the whole change exists to prevent.

### D61 — One line at the bottom of the home screen, and nowhere else

`src/ui/App.tsx` renders the line only on the lesson picker: `lesson-loop@0.1.16` and the
build time, small, in the muted ink already used for secondary text, below the lesson
cards.

*Why:* the teacher's way in is the home screen, so that is where she can be asked to look.
The exercise screens and the student's view are excluded by the specs, not by taste
(`synced-rooms` gives the student the exercise "and nothing else").

*Rejected:* **a fixed bar across the bottom of every screen** — it takes a strip of a
tablet screen from the exercise, permanently, to display something that matters twice a
year. *Rejected:* **behind a tap or a long-press** — undiscoverable exactly when it is
needed, which is when someone is being talked through it on a call.

## Risks / Trade-offs

- **The commit count is not the same on a branch as on `main`.** A build from a feature
  branch can report the same number as a different build from `main`. → Accepted: the
  contract is that published revisions differ from one another, and only `main` is
  published (D-24). The build time in the same line separates two builds that share a
  number.
- **A shallow CI checkout would silently produce `unknown`.** `actions/checkout` fetches
  one commit by default. → The checkout is given the full history in the build job, and a
  task checks the deployed page shows a real number rather than `unknown` — otherwise the
  fallback would hide the mistake it exists to survive.
- **The number never resets.** After `0.2.0` the count keeps climbing from where it was, so
  `0.2.400` is possible. → Accepted; it stays sortable and unambiguous, which is what it is
  for. A count since the last tag was the alternative, and it needs tags, which D-26 turned
  down.
- **A teacher reading a version aloud is being asked to do support work.** → It is one
  short line and only when asked; the alternative is guessing which build she has, which
  costs her more.

## Migration Plan

Nothing to migrate: two substituted values, one line of UI and a pure function. Rollback is
removing the line — the app is unchanged in every other respect, and no stored state, no
deployed resource and no history is involved.

## Open Questions

None.
