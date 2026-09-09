## Why

The teacher cannot point at anything. In a room she and the child are looking at the same
ten pictures, she is talking down a Zoom call, and the word she needs is "this one" — but
there is no *this*. Her only instruments are the words themselves, which is precisely the
problem when the child does not yet have them: "the red one, next to the cake, no, the
other side" is not teaching, it is navigating. A finger on a shared page is the oldest
tool in a one-to-one lesson and the app removed it.

This is the first piece of feedback from the teacher actually using it:

> Would it be possible to have a small space or board on the screen where both the teacher
> and the student can write or draw? For example, if I need to write something, circle a
> word, or draw a line, I could do it directly on the board, and the student could do the
> same. Also, would it be possible for the teacher to turn off or disable the student's
> pen/drawing function when needed?

Asked which of a separate board, a full blank screen, or drawing on the exercise itself she
meant, she answered: on the exercise itself. That answer is the change. What she wants is
not a whiteboard — it is a way to touch the lesson that is already on screen, to circle the
apple, underline a word, join two pictures with a line, and write a letter the exercise
does not contain.

The second half of her message is the same tool seen from the other side. A pen the child
holds is worth having — a child who circles her own answer is doing something a tap cannot
express — but not at every moment. A pen is also a way to scribble over the exercise while
the teacher is trying to explain it, and the teacher needs to be able to take it away
without leaving the lesson.

## What Changes

- **Ink over the exercise, not beside it.** A transparent layer covers the exercise stage,
  and what is drawn on it lands on the same card, picture or word on both screens. Anything
  drawn belongs to the exercise it was drawn on, and is there again when the lesson comes
  back to it — a mark made on the matching exercise does not follow the lesson to the
  sorting one.

- **A pencil that is a mode, not a brush.** With the pencil on, the layer takes every
  pointer event: the person holding it draws and cannot tap the exercise. With it off, taps
  reach the exercise as they always have and the drawing stays visible underneath the
  hand — visible, but inert. The two things a person can do to an exercise are never live
  at the same time, so a stroke is never mistaken for an answer and an answer is never
  mistaken for a stroke.

- **Tools: a pen, an eraser, colours, two sizes, undo and clear.** The eraser removes whole
  strokes rather than pixels, which is what keeps the board a list of marks that can be
  undone, cleared and sent one at a time rather than a picture that can only be repainted.
  Undo takes back the person's own last stroke. Teacher and student draw in different
  colours by default, so the board says who made which mark.

- **Clear belongs to whoever is clearing.** The teacher's clear empties the exercise's
  board — hers and the student's — because she is the one running the lesson. The student's
  clear takes back only her own marks. Neither reaches an exercise other than the one on
  screen.

- **The teacher can take the pen away.** A third teacher-owned switch beside the two that
  already exist: the lock says whether the student may act on the exercise, the sound
  setting says whether the app may talk, and this says whether the student may draw. It is
  independent of both — an exercise can be locked while the child is still invited to
  circle her answer, and the pen can be taken away while the exercise stays hers to play.
  The student's pen starts on. Taking it away leaves what she has already drawn on screen;
  it stops her drawing more, and it is enforced by the room rather than by her browser.

- **A stroke travels once, when the pen comes up.** Ink does not pass through the lesson
  state, the reducer, or the full-state broadcast that carries every tap. It is a second
  kind of traffic that the room relays and stores but never interprets — because a stroke
  put into `LessonState` would enlarge the snapshot that is serialised to every socket on
  every *subsequent* tap, making the whole lesson more expensive for the rest of its life.
  A stroke is simplified before it is sent, so a mouse-drawn line arrives smoother than it
  was made, and a very long stroke is flushed early so nobody watches an empty screen.

- **The exercise stage gets a fixed shape, and room to draw in.** Today the card grid reflows — five across on
  a laptop, two on a phone — so the same fraction of the stage points at different cards on
  different screens, and a circle drawn around the apple would land on the milk. The stage
  is laid out at one reference width and scaled to fit, so both screens show the same
  arrangement at different sizes and a mark lands where it was made. It is also given a
  fixed height, so there is space to draw beneath the exercise rather than a strip cropped
  to the last row of cards — the same space on both screens. This is a visible change to
  every lesson on every screen, drawing or not.

- **Drawing belongs to a room.** A lesson opened from the home screen has no pencil at all:
  a mark made there has nobody to reach, since the only person who can see it is looking at
  the exercise already. A room whose connection has dropped still draws — that is a room
  with a bad network, not a lesson played alone.

- Deliberately **not** in scope: a separate whiteboard or blank page; shapes, arrows or a
  text tool; a laser pointer or any live-streamed pointer (it needs the per-stroke traffic
  model this change turns down); saving, exporting or printing a board; a pixel eraser;
  drawing on the home screen or the closing screen; and any change to what the lesson
  format contains — a lesson file does not gain a single field.

## Capabilities

### New Capabilities

- `shared-drawing`: the ink itself. That a mark is made over the exercise and lands in the
  same place on both screens; that the pencil is an exclusive mode; the tools and what each
  one means; that marks belong to the exercise they were made on and survive leaving and
  returning to it; who may clear what; that a stroke is a unit — sent, stored, undone and
  erased whole; and that it belongs to a room, a lesson played alone having no pencil.

### Modified Capabilities

- `synced-rooms`: gains ink as a second kind of traffic. A stroke reaches the other screen
  without going through the lesson state or the action reducer; the room stores the marks
  so a participant who reloads or joins late sees the board as it stands; and a stroke,
  unlike an action, is never refused for being out of date — two people drawing at once
  simply both drew.
- `teacher-view`: gains the switch that grants or withdraws the student's pen, and the
  teacher's clear that empties the whole board. Both are hers alone, enforced by the room,
  inherited by a late joiner, and surviving a reload.
- `lesson-player`: gains the pencil and its tools over the stage of a lesson held in a room,
  the room beneath the exercise to draw in, and the rule that the pencil and the exercise
  are never live at once.
- `exercise-blocks`: the stage the six exercises are laid out in becomes a fixed shape
  scaled to the screen rather than a fluid one that reflows — so that a mark made on one
  screen means the same thing on the other. No exercise changes what it teaches or how it
  is answered.

## Impact

- **New:** an ink model in `src/shared` (a stroke, its simplification, and the rules about
  who may draw and who may clear), a drawing layer and its toolbar in `src/ui`, and their
  tests. The ink model sits in shared code because the room enforces the pen rule, exactly
  as it enforces the lock.
- **Changed:** `src/shared/protocol.ts` (a stroke message, an erase, an undo, a clear, and
  the teacher's pen switch; the `state` message carries whether the student's pen is on),
  `src/shared/room.ts` and `worker/room.ts` (the marks, their relay, and a stored room from
  before this change loading with an empty board and the pen on),
  `src/ui/useLesson.ts` and `src/ui/useRoom.ts` (both expose the board, so the player still
  cannot tell which one it holds — D13), `src/ui/LessonPlayer.tsx` (the layer over the
  stage, the pencil, the toolbar), `src/ui/RoomLesson.tsx` (the pen switch beside the lock
  and the sound setting), `src/ui/app.module.css` (the fixed-shape stage).
- **Unchanged:** the lesson format and every lesson file, the reducer, the action set,
  `LessonState`, the answer keys, the routes, speech, the sound setting, and the star trail.
  A stroke is not an action and does not advance `v`, so nothing about how a lesson is
  played, scored or celebrated changes.
- **Tests:** the stroke model and its simplification; the room's pen rule and the refusal a
  student gets with the pen withdrawn; convergence, that two screens agree on the board;
  that the marks survive a reload and reach a late joiner; that the pencil makes the
  exercise untappable and that leaving it restores taps; that a lesson played alone draws
  with no socket. `tests/snapshot-size.test.ts` is expected to stay exactly as it is — if
  ink ever moved that number, ink went somewhere it should not have.
- **Docs:** `docs/PLAN.md` §6 (the protocol gains the ink messages and the pen switch),
  §12 (the product decisions this change settles).
- **Ordering:** `add-hotspot-memory-scramble` is proposed and unimplemented and adds three
  block types. It does not contradict this change — a new block is laid out in the same
  stage and inherits the layer over it — but whichever lands second checks that the new
  blocks sit inside the fixed shape.
- **Known trade-off:** fixing the stage's shape means a phone shows the laptop's
  arrangement scaled down, so cards are smaller there than they are today. It is accepted
  because the alternative — anchoring each mark to the element it was drawn over — needs a
  rule for a stroke that crosses two cards and one for a stroke that touches none, and
  neither has an obvious answer. If the smaller cards prove to be a real cost on the
  devices students actually use, that anchoring is the fallback, and it is a change to how
  a mark is stored rather than to anything in this proposal.
