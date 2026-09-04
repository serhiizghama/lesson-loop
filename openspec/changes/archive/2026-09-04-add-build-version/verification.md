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

## Acceptance — run after archiving, on commit `4a36af1`

The change was archived before it was published, so this section was written as "not
performed". It was then committed, published by CI, and the checks below were run against
the deployed app. This paragraph is the honest record of that order: the archive was
closed first, the evidence came second.

| Check | Result |
|---|---|
| 6.1 the published app shows a real number, not `-unknown` | **passed.** `web.lesson-loop.workers.dev` serves `0.1.17` with the stamp `2026-09-04 11:42`. This is what proves `fetch-depth: 0` reached the build — the fallback is honest, so a broken checkout would have looked fine |
| 6.4 no build line inside a lesson or on the student's screen | **passed.** Read from the live DOM: `/l/animals` and `/r/WQJQ` both contain no `lesson-loop@`, and the student's view carries no teacher controls |
| 6.5 nothing is fetched to know the version | **passed.** Loading the home screen made seven requests — the page, its script and stylesheet, the manifest and the icon — and none for a version. It is a literal in the bundle |
| 4.2 the pipeline writes nothing back | **passed.** After the published push, `main` carries only the commit that was pushed: no `chore: v0.1.x` appeared and no tag was created |

### Still not run

| Check | Why |
|---|---|
| 6.2 a new revision shows a different version | needs two *versioned* publishes. Only one exists — the publish before it had no version line at all, which is a difference but not the check as written |
| 6.3 a tab open across a publish shows the older version | same reason; it needs a second publish to compare against |

## One thing worth knowing

The build stamp is written in the timezone of whatever machine built it. A local build
showed `18:32`; the CI build of the same work shows `11:42`, because the runner is on UTC.
So the time the teacher reads is UTC, not her own. Nothing is wrong — the version, which
is what identifies the build, is exact either way — but the time beside it is not the time
where she is. Noted rather than fixed: the change is closed, and this is a decision about
what the line should say, not a defect in what it does.
