# How this change was verified

Design D19 of `add-synced-rooms` set the three tiers this project verifies in, and
requires that the manual tier is never reported as test coverage. This is that report for
`restrict-student-pacing`.

## Automated

`npm run typecheck` (client and Worker), `npm test` (221 tests, up from 209) and
`npm run build` all pass.

**`src/shared/room.test.ts`** — five new tests for the pacing rule (design D23): a
student's `nav` and a student's `reset` each refused `not-teacher` with the room's state
untouched by reference; the teacher's own `nav` and `reset` still applied; and the rule
proved separate from the lock — with the lock **off**, the same student's `tap` applies
while their `nav` does not.

**`src/shared/convergence.test.ts`** — a student that applies `nav` and `reset`
optimistically, is refused twice, and ends identical to the room field by field (spec
"A student's attempt to steer changes nothing").

**`src/ui/student-view.test.tsx`** — six new tests reading the rendered markup: the
student's footer contains no button at all, still contains `3 / 7` and the progress; the
footer is byte-identical whether or not the student is locked; a lesson opened alone keeps
`←`, `↺ Reset` and `→`; and the teacher keeps all four lesson controls, locked or not.

Three pre-existing tests changed rather than being added to. The lock's own tests used a
student's `nav` as the action they refused, which after this change is refused by the
pacing rule instead — they would have kept passing while measuring the wrong thing. They
now act inside the exercise, so they still test the lock.

## Checked by hand, not covered by tests

Performed against `wrangler dev` plus `vite dev` in two browser windows on 2026-09-04.
Manual observations; nothing below is regression-protected.

- A lesson opened from the home screen: `←`, `↺ Reset` and `→` all present and working —
  next, previous and reset each confirmed against the position indicator.
- In a room, the student's footer rendered as exactly
  `<footer><span>3 / 9</span></footer>` — no buttons — with the progress bar still in the
  header, while the teacher kept her three footer controls and all six panel controls.
- With the lock **off**, the student played the whole matching exercise (six pairs,
  13% → 25%): the change took pacing, not participation.
- A raw WebSocket joined as a student, bypassing the page entirely, and sent `nav` and
  `reset`. The room answered `refused: not-teacher` to both and returned its own state
  unchanged; neither browser moved and the twelve made pairs survived (spec "A student who
  asks for the next exercise anyway").
- The teacher reset the exercise: re-shuffled on both screens, the earlier exercise's
  progress untouched. She then moved on and the student followed.
- The Worker was stopped mid-exercise. The student saw "working without sync", finished
  the sentence exercise offline (13% → 25%), stayed on `4 / 9` and was offered no way
  forward; the teacher walked her own copy from `5 / 9` through to the closing screen
  (design D25). On restart both converged on the room's state at `6 / 9` with no reload,
  and the student's footer was still without controls.

## Not verified

- `.github/workflows/ci.yml` was not run on GitHub — nothing has been pushed. Its three
  steps were each run locally and pass.
- Nothing is deployed; acceptance stops at two browsers against `wrangler dev`.
