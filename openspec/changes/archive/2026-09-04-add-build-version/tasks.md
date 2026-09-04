## 1. The version, as a pure function

- [x] 1.1 Add the function that builds the display string from a base version, a commit
  count and a build time (design D59). **Check:** given `0.1.0` and `16` it returns
  `0.1.16`; given `0.1.0` and no count it returns `0.1.0-unknown` (design D60).
- [x] 1.2 Unit test it, including the shapes that are easy to get wrong. **Check:** named
  tests for a normal count, a count of `0`, a missing count, and a base version that
  already has more than two parts; `npm test` passes with no repository involved — the
  test must not shell out to git (design D59).

## 2. The build stamps itself

- [x] 2.1 In `vite.config.ts`, compute the version and the build time and substitute them
  into the bundle with `define` (design D58). **Check:** `npm run build` succeeds and the
  built JavaScript contains the literal version string — `grep` the bundle for it, do not
  infer it from the config.
- [x] 2.2 Make the git call unable to break a build. **Check:** `git rev-list --count HEAD`
  is run so that a non-zero exit, a missing `git`, or a directory that is not a repository
  all yield "no count" rather than an exception (design D60).
- [x] 2.3 Prove the fallback, do not assume it. **Check:** copy the source to a directory
  with no `.git` — for example `git archive HEAD | tar -x -C <tmp>` — install and build
  there; the build succeeds and the bundle carries `0.1.0-unknown`. Report this as
  performed.
- [x] 2.4 The stale comment at the top of `vite.config.ts` says the Worker serves no
  assets and that publishing is a later change. Both stopped being true when
  `add-cloudflare-deploy` landed, and this task edits that file. **Check:** the comment
  describes what is actually the case — Vite serves the client in development and proxies
  the room; the deployed app is one Worker serving both.

## 3. The teacher can see it

- [x] 3.1 Render one line at the bottom of the lesson picker in `src/ui/App.tsx`:
  `lesson-loop@<version>` and the build time (design D61). **Check:** it appears below the
  lesson cards on the home screen and reads as one quiet line, not as a control.
- [x] 3.2 Style it in `src/ui/app.module.css` with the palette's muted ink and a small
  size. **Check:** it is legible without competing with the lesson cards; judged by eye and
  recorded as a manual check, never as test coverage.
- [x] 3.3 Show it on the home screen and nowhere else (spec "Saying which build it is
  disturbs no lesson"). **Check:** a test asserts the line is absent from a rendered
  exercise and from the student's view, in the manner `src/ui/student-view.test.tsx`
  already asserts the student sees no teacher controls.
- [x] 3.4 Prove that test bites. **Check:** temporarily render the line unconditionally;
  `npm test` fails naming the student's view, and passes again once reverted. Report this
  as performed, not assumed.

## 4. The pipeline gives the build what it needs

- [x] 4.1 Give the deploy job's checkout the full history, since the version is counted
  from it (design D57, Risks). **Check:** `.github/workflows/ci.yml` fetches enough history
  for `git rev-list --count HEAD`, and the change is a checkout option only — no job
  writes to the repository and no tag is created (design D-26).
- [ ] 4.2 Confirm the pipeline still writes nothing back. **Check:** `git log` after a
  published push contains only the commit that was pushed — no `chore: v0.1.x` commit
  appears, and `git tag` lists nothing new.

## 5. Docs and quality gates

- [x] 5.1 Update `README.md`: where the number comes from, that nothing bumps it, and what
  `-unknown` means when someone sees it. **Check:** a reader can explain the version on the
  page without opening `design.md`.
- [x] 5.2 Add a `D-26` row to `docs/PLAN.md` §12: the version is derived at build time from
  the commit count rather than bumped and tagged, and it is shown on the home screen only.
  **Check:** the row names what was decided and why, in the existing table's form, and no
  statement left in `PLAN.md` contradicts it.
- [x] 5.3 Run the full gate. **Check:** `npm run typecheck`, `npm test` and `npm run build`
  all pass, and the result is reported honestly, naming anything skipped.

## 6. Acceptance

- [ ] 6.1 Open the published app after this change is deployed. **Check:** the home screen
  shows `lesson-loop@0.1.<n>` with a real number and a build time — **not** `-unknown`,
  which would mean the checkout does not carry the history (task 4.1).
- [ ] 6.2 Publish again and compare. **Check:** the version shown differs from the previous
  one (spec "A new revision is published").
- [ ] 6.3 Leave a tab open across a publish. **Check:** the old tab and a freshly opened one
  show different versions, so a stale tab can be recognised (spec "A tab left open since an
  earlier build").
- [ ] 6.4 Open a lesson and a student link on the published app. **Check:** no build
  information appears on either, and the exercise is unchanged (spec "Inside a lesson",
  "The student's screen").
- [ ] 6.5 Confirm nothing is fetched for it. **Check:** with request logging cleared after
  load, opening the home screen and reading the version produces no network request (spec
  "Nothing is fetched to know the version").
- [x] 6.6 Report which checks were automated and which were performed by hand, in the
  change's `verification.md`. **Check:** the manual tier is named as manual, and anything
  not actually performed is listed as untested.
