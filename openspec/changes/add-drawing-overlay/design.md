## Context

See `proposal.md` — Why. What follows is only the state of the code that shapes the
approach.

Three existing properties decide almost everything here.

**The room broadcasts whole state, not patches (design D10).** Every applied action
produces a fresh `LessonState` that is serialised to every socket and written to Durable
Object storage. `tests/snapshot-size.test.ts` holds that message under 32 KB and says
plainly that if it ever fails, the answer is the patch message D10 turned down rather than
a bigger limit. A stroke is 60–90 raw points; a handful of them would blow that budget, and
worse, they would enlarge the snapshot serialised on every *subsequent* tap for the rest of
the lesson.

**The deployment is on the Workers Free plan.** Bandwidth is not billed and wall time is
not billed; the limits that bite are 100 000 requests a day across the whole account and
**10 ms of CPU per request**. At the teacher's expected load — five to ten lessons a week —
request count is not a constraint under any design considered here (the worst one measured
about 1 % of a day's allowance). CPU is the one to respect, and the dominant CPU cost per
message today is `JSON.stringify` of the state snapshot. That is the second reason ink must
not enter `LessonState`: it would make every message more expensive, not just its own.

**The exercise stage reflows.** `.stage` is `max-width: 46rem` and the block grids are
`repeat(auto-fill, minmax(8.5rem, 1fr))`, so a ten-item exercise is five across on a laptop
and two across at 380 px. A fraction of the stage therefore names different content on
different screens, which is fatal for an overlay: a circle around the apple would arrive
around the milk.

Two existing mechanisms are the models to copy rather than invent past. `lock` and `mute`
are teacher-owned booleans held in `RoomState`, enforced inside `RoomCore` rather than in
the browser — deliberately, because the child the rule is aimed at is the likeliest person
to reload the page (D14, D23). And `applyAction` is one pure function run in two places,
optimistically on the client and authoritatively in the room.

## Goals / Non-Goals

**Goals:**

- A mark lands on the same content on both screens, at any two viewport sizes.
- Ink costs the existing lesson traffic nothing — the snapshot size test must not move.
- The board is a list of whole strokes, so undo, erase and clear are all expressible.
- The room enforces who may draw, the way it enforces who may act.
- A room that has lost its socket still draws; a lesson played alone offers no pencil.

**Non-Goals:**

- Sub-frame fidelity. A mark must mean what it meant; it need not trace the hand exactly.
- A general drawing application. There is no layer, no fill, no shape, no text.
- Reconciling two people editing *the same stroke*. Strokes are owned and atomic; there is
  no such operation.
- Any change to how a lesson is authored. No lesson file gains a field.

## Decisions

Numbering continues from D100. D84–D94 belong to `add-hotspot-memory-scramble`, and
D94–D100 are referenced by the pictures work already in `main`; starting at D101 avoids
both.

### D101 — Ink is a second channel: relayed and retained, never reduced

The board lives in `RoomState` beside `state`, never inside it:

```
RoomState = { lesson, state, board, locked, muted, pen, teacherKey, participants }
Board     = Record<blockId, Stroke[]>
```

`LessonState` is untouched, `applyAction` never sees a stroke, and `v` does not advance for
one. The room relays ink messages to the other sockets and keeps the board so it can be
handed to a joiner; it never computes anything from a stroke's geometry.

*Why:* the two reasons in Context — the 32 KB snapshot budget, and the CPU cost of
serialising a snapshot that ink would permanently inflate. There is also a modelling
reason: `LessonState` is defined as the learner's progress through the lesson, and a
drawing is not progress. Putting it there would make `isLessonComplete` and the star trail
answer questions about ink.

*Rejected:* a stroke as a sixth `Action`. It would have been less new machinery and it is
how every other interaction works, but it inherits the full-state broadcast and the
determinism tests, neither of which a drawing wants. *Rejected:* keeping the board only in
the browsers, which is cheapest of all, but then a reload loses it and a joiner never had
it — and the room's whole reason for existing is to be the one place both screens agree on.

### D102 — Ink has its own pure function, run in the same two places as the reducer

Ink does not go through `applyAction`, but it follows the same shape: a pure
`applyInk(board, op, by): Board` in `src/shared`, run optimistically on the client and
authoritatively in the room. The operations are add-or-append, erase, undo and clear.

*Why:* the architecture rule is "one reducer, two execution sites", and the reason behind
it — that a rule written only in the browser is a rule the student can reload away — applies
to ink exactly as it applies to actions. Undo in particular must be resolved by the same
code on both sides: "remove my last stroke" evaluated independently on two devices at two
different moments removes two different strokes.

*Rejected:* resolving undo on the client and sending an erase-by-id. It works, and it is
one fewer operation on the wire, but the client would have to know the room's board rather
than its own optimistic one to pick the right id, which is the bug this project's
optimistic-then-authoritative split exists to avoid.

### D103 — The stage is laid out at a fixed reference width and scaled, not reflowed

The exercise stage is laid out at 46 rem — the width it already uses on a laptop — and
scaled by `min(1, available / reference)` to fit narrower viewports. Above the reference
width nothing changes at all; below it, the arrangement stays the laptop's and shrinks.

Coordinates are then simply fractions of the stage box, quantised to 12 bits, because both
screens compute the same layout.

*Why:* it is the smallest change that makes a position mean the same thing on two screens.
It costs nothing on the teacher's laptop — which is where it renders today — and it needs
no new concept anywhere: not in the lesson format, not in the stroke, not in the room.

*Rejected:* anchoring each stroke to the element it was drawn over ("this mark belongs to
card `apple`, at these coordinates within it"). It is strictly better on a phone, since the
layout stays adapted, and it is the fallback if scaling proves too costly there. It loses
here because it needs an answer for a stroke crossing two cards, an answer for a stroke
touching none, and a rule for what happens to a mark when a reset re-orders the items it
was anchored to — three new questions, none with an obvious answer, in exchange for a
benefit on a device nobody has confirmed is in use.

*Rejected:* a fixed aspect ratio with letterboxing. A fixed *width* is enough: the height
follows from the same layout and therefore already matches. Constraining height as well
would add bars for no gain.

### D104 — The eraser removes whole strokes, and the board is never a bitmap

Erasing hit-tests the strokes near the pointer and removes the whole of any it touches. The
eraser's size is its hit radius.

*Why:* it is what keeps every other operation expressible. A pixel eraser turns the board
into an image, and then erasing has to travel as ink of its own, undo has nothing to undo,
clear cannot distinguish whose marks are whose, and a late joiner needs the image rather
than a list. One decision buys undo, per-author clear, cheap relay and a small snapshot.

*Trade-off, accepted:* rubbing out half of a long line is impossible — the line goes or it
stays. In annotation, where marks are short and made by an adult who can also press undo,
this is a smaller cost than everything it buys.

### D105 — A stroke is simplified before it is sent, and encoded compactly

On the way out a stroke is thinned twice: points closer than a threshold to the previous
one are never recorded, and the finished stroke is reduced by Ramer–Douglas–Peucker at a
tolerance well below what the eye resolves. Points travel as a flat array of 12-bit
integers, delta-encoded after the first.

*Why:* raw pointer input is mostly redundant — a straight segment sampled at 60 Hz is sixty
collinear points that two reproduce exactly — and the reduction is typically 70–85 % with no
visible difference. There is a second benefit that matters more than the bytes: the teacher
draws with a **mouse**, and a simplified, smoothed stroke reads better than the jittery one
her hand actually made.

*Rejected:* a binary encoding. It is roughly twice as compact again and it breaks the
property that everything on the wire is plain serialisable data, which `protocol.ts` and
`purity.test.ts` are built on. At the volumes measured, it buys nothing worth that.

### D106 — A stroke is sent once when the pen comes up; a long one is sent in ordered parts

The client buffers points and flushes when the pen comes up, or earlier if the buffer
passes a threshold — one named constant, `STROKE_FLUSH_POINTS`, starting at a value of
about a second of drawing.

A part is an **append**, not a preview: the receiver adds the points to the stroke of that
id, creating it if it is new. WebSocket delivery is ordered, so no reconciliation, no
replacement and no re-send is needed. The room stores a stroke only once it is complete;
in-flight strokes are kept so a joiner sees a mark being drawn, and are dropped if their
author disconnects before finishing.

*Why:* the threshold makes "send on release" and "stream live" the same mechanism at two
settings, so the choice is a constant rather than an architecture. Starting high is right
because most annotation strokes are under a second, because a mouse-drawn line looks better
smoothed than streamed, and because fewer, larger messages survive a poor connection better
than many small ones — and the student's device is unknown.

*Rejected:* flushing on a timer at 10–20 Hz from the start. It was the original proposal and
it is genuinely smoother for long strokes. It loses because it needs a preview that is later
replaced by the canonical simplified stroke — a visible snap, and a reconciliation path — for
a benefit confined to the rare long stroke. The threshold leaves the door open: lowering the
constant produces exactly that behaviour if the teacher asks for it.

### D107 — The student's pen is a third teacher-owned switch, enforced in `RoomCore`

`RoomState.pen: boolean` joins `locked` and `muted`, with a `{ t: 'pen', value }` client
message that only the teacher may send, and `pen` added to the `state` server message. A
student's ink operation with the pen withdrawn is refused with a new `RefusedReason`.

The three switches stay independent. `locked` governs actions, `pen` governs ink, `muted`
governs speech, and no one of them implies another.

*Why:* it is the shape `mute` already established (D66, D71, D74) and it inherits that
shape's guarantees for free — teacher-only, inherited by a joiner, surviving a reload and a
change of lesson. Enforcing it in the core rather than by hiding the toolbar follows D14 and
D23 for the same reason those exist.

*Rejected:* folding it into `locked`. `src/shared/room.ts` already records that pacing and
the lock are different rules; making the pen a third meaning of the second one would
prevent exactly the combination the teacher described — an exercise she is holding, on
which the child is still invited to circle her answer.

### D108 — Drawing mode is local to a participant and never enters the room

Whether a person is holding the pencil is browser state. It is not in `RoomState`, it is not
sent, and the other screen cannot observe it.

Exclusivity is achieved by the layer's `pointer-events`: on while the pencil is held, so it
takes every event over the stage; `none` otherwise, so taps fall through to the exercise
underneath and the marks stay visible but inert.

*Why:* the mode is a property of a hand, not of the lesson, and two people must be able to
be in different modes at once — the teacher annotating while the child answers is a normal
moment in a lesson, not a conflict. Routing it through the room would also make the pencil
wait for a round trip.

### D109 — The board is keyed by block id and bounded per block

`Board` is keyed by block id, so marks belong to the exercise they were made on, a reset
does not touch them, and changing the room's lesson discards them with the rest of that
lesson's state. Each block holds at most `MAX_STROKES_PER_BLOCK`; past it the oldest stroke
is dropped rather than the new one being refused.

*Why:* the overlay decides this rather than choosing it — a mark drawn over the matching
exercise means nothing over the sorting one. Bounding by dropping the oldest keeps the pen
always working, which matters more mid-lesson than keeping a mark from ten minutes ago; and
it puts a ceiling on both the storage write and the board a joiner is sent.

### D110 — A room stored before this change loads with an empty board and the pen granted

The Durable Object's constructor already reads a stored `RoomState` and fills in what an
older build did not write (`muted`, D74). `board` and `pen` are filled in the same place,
with an empty board and the pen granted — the behaviour a room from before this change had.

*Why:* reading the stored shape is the adapter's job and not the core's, which is what D74
settled; this follows it rather than opening it again.

### D113 — Drawing belongs to a room, and the stage is given room to draw in

*Both taken during implementation, from the teacher trying the first build.*

**Drawing is offered only in a room.** A lesson opened from the home screen has no pencil
at all. A mark made there has nobody to reach — the only person who can see it is looking
at the exercise already — so the tools were clutter around a screen that did not need them.
A room that has lost its socket still draws, because that is a room with a bad connection
rather than a lesson played alone.

The board still lives in `useLesson` and is still applied by the same `applyInk`, so the
store contract that D13 protects is untouched; what changed is a prop the room sets and the
home screen does not.

*Rejected:* removing the board from `useLesson` entirely. It would mean `LessonPlayer`
could no longer be written against one store type, which is the property D13 exists for,
to save about ten lines that cost nothing.

**The stage is given a fixed height as well as a fixed width.** The first build bounded the
board to the exercise's own content, which meant there was nowhere to draw beneath the last
row of cards — and a mark is made around and beside the content at least as often as on it.
The stage now has a reference height as well as a reference width, so the space below the
exercise is real, and is the same space on both screens.

This is the letterboxing D103 turned down, arrived at from the other direction: D103 needed
only the width to make a position mean the same thing, and it was right that height was not
needed *for that*. It is needed for something else — for there to be a board at all rather
than a strip.

*Rejected:* letting the drawable area fill the window. It is the obvious reading of "let me
draw anywhere", and it cannot work: two windows of different heights would give the same
mark two different places, which is the one thing this whole change is built to prevent.

The reference box was then widened as well, to about 1.4:1, because at the first height it
came out very nearly square and an arrow or a written word wants room sideways. How much
wider it may ever go is decided by one number: the scale is `available / reference`, so
every pixel added here shrinks everything on a phone in exact proportion. At the narrowest
supported 380 px the widening took the smallest card from about 70 px to about 59, and the
44 px a young child's finger needs is the floor. `src/ui/stage.test.ts` holds that floor.

### D114 — The pencil lives in the header, and its tools in a bar beneath it

The pencil is a control in the header beside the sound setting; the tools appear in a slim
bar directly under the header while it is down, and nothing at all while it is up.

*Why the header:* the student draws too and has no panel, so the header is the one surface
both participants have. And the pencil is the same kind of thing as the control beside it —
a mode this screen is in — rather than a room setting like the lock.

*Rejected:* the teacher's panel, which was the first suggestion. It has the room for it,
but it would have left the student's identical pencil with nowhere to live, and split one
control across two designs. *Rejected:* a bar under the exercise, which is where the first
build put it. It read as an afterthought stranded below the content, and it sat in the part
of the stage that is now the board — the tools would have been in the way of the drawing.

### D112 — Order converges per author, not across authors

*Taken during implementation, after a convergence test measured the gap.*

Every screen applies its own mark the instant it is made and learns of the other's by
relay, so two marks made at the same moment can be ordered differently on the two screens:
measured, the teacher held `[t1, s1]` where the student held `[s1, t1]`. What **is**
guaranteed, and is enough, is that one participant's own marks are in the order she made
them on every screen — her own arrive in order, and relayed ones arrive in order too.

*Why that is enough:* the only thing the interleaving decides is which of two overlapping
marks is drawn on top, and only when they overlap and are different colours. Nothing a
participant can act on depends on it — undo walks back through one person's own marks, and
those agree everywhere.

*Rejected:* a room-assigned ordinal on every stroke, which is correct but needs the room to
answer the sender as well as relay to the others — an extra message per stroke, doubling
the ink traffic that D106 exists to keep small, to fix which of two crossing lines is on
top. *Rejected:* a deterministic sort key of (per-author counter, role). It is nearly free
and it does make the order identical everywhere, but it discards chronology: a mark the
teacher makes after three of the student's would render underneath them, which is a worse
picture than the one it fixes.

### D111 — Both stores expose the board, so the player still cannot tell which it holds

`useLesson` (solo) and `useRoom` (shared) both expose the board and the same operations, so
`LessonPlayer` remains unable to distinguish them — the property D13 established. Solo mode
applies `applyInk` locally and sends nothing.

## Risks / Trade-offs

**A scaled stage makes a phone's cards smaller than they are today** → At the narrowest
supported width the scale is about 0.52, which takes a 136 px card to roughly 71 px — still
above a comfortable finger target, but the text on it shrinks equally. Mitigation: measure
with real lessons during implementation, and if the text is too small, raise the reference
layout's base type size rather than reintroducing reflow. If it proves to be a genuine cost
on the devices students actually use, D103's rejected alternative — anchoring to elements —
is the fallback, and it changes only how a stroke is stored.

**Non-integer scaling can soften text and hairlines** → Accepted. The content is mostly
drawn pictures and large type, which tolerate it; and above the reference width, where the
teacher works, the scale is exactly 1.

**A partial stroke left behind by a disconnect** → The room keeps in-flight strokes only
while their author is connected and drops them on `leave`, and only completed strokes are
persisted. A joiner may briefly see a stroke that then vanishes, which is correct: it was
never finished.

**Ink pushes the room past its bounded size** → The board is bounded per block (D109) and
strokes are simplified before storage (D105). The room's existing size discipline covers
the rest; `tests/snapshot-size.test.ts` is expected to be unchanged by this work, and if it
moves, ink went somewhere D101 says it must not.

**A third switch crowds the teacher's controls** → The teacher's panel already carries the
lock and the sound setting, and `lesson-player`'s narrow-window requirement constrains what
may be added. The toolbar is the drawing mode's, not the panel's; only the pen switch and
clear join the panel.

## Migration Plan

There is no data to migrate. The change is additive on the wire and in storage: a client
built before it ignores the new server messages by the existing `parseServerMessage`
default, and a room stored before it loads under D110.

Deployment is the project's usual one — a build that passes its checks becomes the published
app, and rooms in flight are unaffected (`published-app`: "Publishing costs a lesson in
progress nothing"). Rollback is a redeploy of the previous build; rooms created by the newer
one keep a `board` and `pen` the older build does not read, and behave as they did before.

The one change that is *not* additive is D103, the fixed reference width. It alters how
every lesson is laid out below 46 rem, drawing or not, and it is the part to look at first
in review and the part a rollback most visibly reverts.

## Open Questions

- **Does the reference layout need a larger base type size at narrow widths?** Answerable by
  measuring with the five real lessons once the stage is scaled. It changes CSS values, not
  the approach, the specs or the task breakdown.
- **Where should `STROKE_FLUSH_POINTS` settle?** Starts at about a second of drawing; the
  teacher's first real lesson answers it. Lowering it produces the live-streaming behaviour
  D106 rejected, without any other change.
- **What devices do the students actually use?** Unknown, and the teacher does not know
  either. It does not block anything: it only decides whether D103's fallback is ever
  needed.
