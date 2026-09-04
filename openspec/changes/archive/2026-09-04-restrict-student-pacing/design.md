## Context

See proposal.md — Why for the motivation, and the three delta specs for the behaviour
being contracted.

What exists: `LessonPlayer` renders one footer for everyone — previous, reset, position,
next — and takes a `readOnly` prop that `RoomLesson` sets for a locked student. `readOnly`
disables the footer's buttons and makes the exercise `inert`. `RoomCore.handle` already
refuses a locked student's action before it reaches `applyAction`, which is the only place
in the system where "this participant may not do that" is currently decided.

Decisions continue the numbering of `add-synced-rooms`'s design (D9–D21), because code
comments cite decisions by bare number.

Two constraints shape the work:

1. **Solo mode must not notice.** A lesson opened from the home screen has no room, no
   role and no teacher; it keeps every control it has today, and the change must not reach
   it.
2. **A rule the browser owns is not a rule.** The refusal has to survive a page reload and
   a second tab, exactly as the lock does (design D14).

## Goals / Non-Goals

**Goals**

- One axis in `LessonPlayer` that says whether this screen steers the lesson, so that no
  block view and no exercise learns anything new.
- The refusal decided in `RoomCore`, where the lock already is, so both rules are read in
  the same place and tested the same way.

**Non-Goals**

- No new protocol message, no new server round trip and no change to the Worker or the
  Durable Object. `nav` and `reset` remain ordinary actions; only who may send them
  changes.
- No handing pacing back to the student (proposal — Not in scope).
- No change to the lock, which keeps its own job.

## Decisions

### D22 — Steering is a property of the screen, not a disabled button

`LessonPlayer` gains `canSteer` (default `true`). When false it renders the position and
the progress and omits previous, next and reset from the markup entirely. `RoomLesson`
passes `canSteer={role === 'teacher'}`; `SoloLesson` passes nothing.

*Why:* a greyed-out arrow is an invitation to keep tapping and then ask why it does not
work, and a child is the person least likely to read it as "not yours". The `teacher-view`
spec also requires that no control only the teacher may use is *present* on the student's
screen — a disabled one is present.

*Rejected:* `disabled` on the existing buttons — fails the spec and teaches the child
that the app is broken. *Rejected:* hiding them with CSS — the same failure with an extra
step, and `src/ui/student-view.test.tsx` reads the rendered markup precisely so that this
cannot pass. *Rejected:* a second boolean beside `readOnly` inside every block view — the
block views must not learn about rooms at all (design D13).

### D23 — The room refuses `nav` and `reset` from a student

`RoomCore.#act` refuses those two action types from a participant whose role is `student`,
with the existing `not-teacher` reason, before the lock is even considered. The refusal
path already sends the sender the room's own state, so a device that somehow applied one
optimistically is pulled straight back into line.

*Why:* the same argument D14 made for the lock, and it is the same three lines in the same
place. Without it the guarantee is a piece of layout, undone by anyone who reloads with a
console open — and, more mundanely, by a future bug that renders the footer for the wrong
role.

*Rejected:* enforcing only in the UI — see above. *Rejected:* a new `refused` reason such
as `teacher-only` — `not-teacher` already says exactly this and is what `switch-lesson`
and `lock` return; a second word for one idea is a worse protocol. *Rejected:* refusing in
`applyAction` — the reducer has no notion of who is acting, and giving it one would put
room concepts into the one function that runs in both places for the express purpose of
not having any.

### D24 — The student's footer keeps the position and the progress

`3 / 9` and the progress bar stay on the student's screen; only the controls go.

*Why:* "how much is left" is what keeps a child going, and it is not a control. The
`teacher-view` spec already lists progress among what the student's view shows, and this
change adds the position beside it rather than taking it away.

*Rejected:* removing the whole footer — a cleaner screen bought by taking away the one
thing a child actually wants to know.

### D25 — The offline student stops where the room left them

With the socket down a student holds the exercise on screen and cannot advance; the
teacher can, because she steers. This narrows what `lesson-player` guaranteed and the
delta spec says so in as many words.

*Why:* the alternative — returning the arrows whenever sync drops — makes controls appear
and disappear under a child's fingers at the exact moment the lesson is already going
wrong, and hands pacing back precisely when the teacher cannot see what is happening. The
guarantee that actually matters, that the exercise in play never becomes unusable, is
untouched.

*Rejected:* arrows that come back while unsynced — see above. It stays available if a real
lesson shows the student stranded often enough to matter. *Rejected:* leaving the
`lesson-player` spec as it was and letting the implementation quietly diverge — the spec
would then describe something the app does not do.

## Risks / Trade-offs

- **A student stranded by an outage the teacher does not notice.** → The "working without
  sync" banner is on both screens, and the teacher's panel shows her own connection; the
  outage is visible before the stranding is. The room's state is authoritative on return,
  so nothing is lost either way.
- **The teacher now has to drive every transition.** → That is the point, and it is one
  tap she is already making. If it proves tiring across a full hour, the answer is handing
  pacing back (proposal — Not in scope), not restoring the student's arrows.
- **`canSteer` and `readOnly` are two booleans that sound alike.** → They are genuinely
  different — one is who paces the lesson, the other is whether the student may touch the
  exercise at all — and both are named in the specs. A comment at the prop and a test per
  combination keep them apart.
- **A student mid-tap when the teacher advances loses the tap.** → Already true today and
  unchanged by this: the room applies whatever arrives first, and the loser is a tap the
  child can repeat.

## Migration Plan

Nothing to migrate: no data, no deployed instance, no persisted shape. Rooms already open
carry no notion of who may steer, because the rule is evaluated per action rather than
stored. A revert is the two call sites and the guard in `RoomCore`.

## Open Questions

- Does the teacher want a keyboard shortcut for next/previous once she is the only one
  moving the lesson? Worth asking after she has taught with it; it changes nothing here.
