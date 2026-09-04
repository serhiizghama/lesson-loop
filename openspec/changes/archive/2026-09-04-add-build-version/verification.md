# Verification — add-build-version

Two tiers, and a third thing this file has to say plainly: **the change was archived
before it was ever published.** Its acceptance section could not be run, because at the
moment of archiving the code existed only in a working tree — no commit, no deploy, and a
published app still serving the build from before this change.

Date: 2026-09-04. Archived at the repository owner's explicit direction after that was
pointed out.

## Automated — part of `npm test`

| Test file | What it proves | Spec requirement |
|---|---|---|
| `src/version.test.ts` (12) | the count lands where the patch goes; the base's last part is replaced rather than appended to; a raised minor is followed; a count of `0` works; a missing count gives `0.1.0-unknown` and never `0.1.0`; the line reads `lesson-loop@<version> · <time>`; the stamp pads so its width never jumps | "The published app says which build it is", design D57, D60 |
| `src/ui/build-line.test.tsx` (4) | the home screen carries the app name and a version; a rendered exercise does not, on the student's screen, the teacher's, or solo | "Saying which build it is disturbs no lesson" |

Suite at the time of archiving: **349 tests, 27 files, all passing.** `npm run typecheck`
and `npm run build` pass.

### The negative test was run, not assumed

`LessonPlayer` was temporarily made to render the build line, and all three "no other
screen does" tests failed, naming `lesson-loop@` in the exercise markup. Reverted, all
four green again.

A first attempt at that probe broke the file's syntax instead, so the suite failed to
collect. "No tests" is not "a test failed" — that probe proved nothing and was replaced.

## Manual — performed

| Check | How | Result |
|---|---|---|
| the version really reaches the bundle (2.1) | `npm run build`, then read the built JavaScript | the literals `"0.1.16"` and `"2026-09-04 18:32"` are in it. Read from the bundle, not inferred from the config |
| the fallback survives no git (2.3) | `git archive HEAD \| tar -x` into a directory with no `.git`, then build there | the build succeeded and carried `0.1.0-unknown` — not a false `0.1.0` |
| the line reads as intended (3.1, 3.2) | served `dist/` locally and looked at the home screen | `lesson-loop@0.1.16 · 2026-09-04 18:32`, small and muted, below the lesson cards, after everything else on the page. An eye judgement, not test coverage |
| the actions the pipeline uses exist (4.1) | queried the tags of `actions/checkout` and `actions/setup-node` | `v7` exists for both. This was checked because the versions had been raised to `v7` in the working tree and I wrongly suspected they were invented; they are not |

## NOT performed — the whole of acceptance

None of the following was possible: the change was never committed, so it was never
published, so there was nothing deployed to check it against. They are listed as untested
and must not be read as passing.

| Check | Why not |
|---|---|
| 4.2, the pipeline writes nothing back | needs a published push to inspect afterwards |
| 6.1, the published app shows a real number and not `-unknown` | **this is the check that proves `fetch-depth: 0` works.** Until it runs, whether CI produces a real version or `0.1.0-unknown` is unknown — the fallback is honest, which is exactly what would make a broken checkout look fine |
| 6.2, a new revision shows a different version | needs two publishes |
| 6.3, a tab left open across a publish shows the older version | needs two publishes |
| 6.4, no build line inside a lesson or on the student's screen, on the published app | covered by unit tests against rendered markup, never against the deployed app |
| 6.5, nothing is fetched to know the version | the value is a literal in the bundle, which is what `define` does and what the build output shows — but no request log was taken on the published app to confirm it |

## What this leaves

The main specs now carry two requirements saying the published app names its build. The
published app does not, and will not until this work is committed and a deploy runs. That
gap is the direct consequence of archiving first, and it closes the moment the change is
pushed — after which 6.1 in particular is worth running, since it is the only thing that
distinguishes a working `fetch-depth` from a silently unknown version.
