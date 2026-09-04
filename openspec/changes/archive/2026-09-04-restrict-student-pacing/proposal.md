## Why

The student's screen currently carries the same footer the teacher's does: previous,
next, and reset. In a one-on-one lesson that is not a small excess of freedom — it is a
hole in the lesson, because every one of those controls moves **the teacher's** screen
too. A child tapping "next" while the teacher is mid-sentence takes her slide away from
her; a child tapping "reset" wipes an exercise both of them were working on. Neither is
the child misbehaving. The buttons are there, so they get pressed.

The lock already exists for the child who runs ahead, but it is all-or-nothing: it stops
the child touching the exercise at all, which is exactly the passivity this app was built
to end. What is missing is the ordinary case — the student plays the exercise, and the
teacher decides when the lesson moves on.

## What Changes

- **The student's screen loses its lesson controls.** No previous, no next, no reset. The
  position (`3 / 9`) and the progress bar stay: the student should know where they are
  without steering.
- **Pacing becomes the teacher's alone.** Moving between exercises, resetting an exercise
  and changing lesson are hers. The student's half of the screen is the exercise.
- **The room enforces it, the UI only reflects it.** A student's `nav` or `reset` is
  refused by `RoomCore`, the same way a locked student's action already is (design D14) —
  a rule that lives only in the browser is undone by a page reload.
- **BREAKING for the student in a room:** with the connection down, a student can no
  longer advance through the rest of the lesson on their own. The exercise on screen stays
  fully playable; reaching the next one waits for the room. This is a deliberate narrowing
  of the offline guarantee and the reason `lesson-player` changes below. A lesson opened
  solo from the home screen is untouched and keeps every control.
- The lock stays exactly as it is, and keeps its own job: stopping the child touching the
  exercise itself.
- **Not in scope:** handing pacing back to the student. The teacher is on a video call
  and can simply say "which one do you want?". If she asks for a real toggle after
  teaching with this, it is a later change.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `teacher-view`: the student's screen is defined by what it shows; it must now also be
  defined by what it cannot do. Lesson controls join answer keys and room administration
  in what the student's view never carries, and steering the session becomes the teacher's
  exclusively rather than merely available to her.
- `lesson-player`: free navigation currently has one exception (a locked learner). It
  gains the larger one — a student in a room does not navigate at all — and the offline
  guarantee narrows accordingly: the exercise in play stays completable without the
  connection, but the student no longer walks the rest of the lesson alone.
- `synced-rooms`: the list of actions either participant may perform currently includes
  moving between exercises and resetting one. Those two become the teacher's, while every
  action inside an exercise stays open to both.

## Impact

- **Changed:** `src/shared/room.ts` (`RoomCore` refuses `nav` and `reset` from a student),
  `src/ui/LessonPlayer.tsx` (the footer's controls become conditional), and
  `src/ui/RoomLesson.tsx` (which decides who steers). `src/ui/SoloLesson.tsx` is untouched.
- **Unchanged:** the protocol, the Worker, the Durable Object, the reducer, every block
  view, and every lesson file. No new message type and no new dependency.
- **Tests:** `src/shared/room.test.ts` and `src/ui/student-view.test.tsx` gain cases; the
  convergence test gains a scenario for a student trying to steer.
