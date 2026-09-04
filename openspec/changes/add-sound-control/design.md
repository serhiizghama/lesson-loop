## Context

See proposal.md — Why. What the design has to work with:

- **Speech is a module, not a hook.** `src/speech/speech.ts` exports one `Speech` object
  built over the browser's `speechSynthesis` and a clip player, with `speak`, `enable`,
  `cancel`, `preload`, `getState` and `subscribe`. `LessonPlayer` imports the singleton and
  hands it to whichever block view is on screen through `BlockViewProps.speech`.
- **The seven speaking call sites are in the views.** Five are automatic — `CardsView` and
  `SortView` speak inside an `onClick`, `MatchView` in an `onClick` plus a ref-guarded
  effect, `TprView`, `SentenceView` and `ListenView` in an effect keyed on the line. Two are
  the learner asking: the sentence exercise's `🔊 Listen` and the listening exercise's
  repeat. `ListenView` also has `speech.enable()`, which is the device-level offer.
- **The room already has a teacher-only boolean.** `locked` lives in `RoomState`, is set by
  `{ t: 'lock', value }`, is refused for anyone but the teacher in `RoomCore.handle`, rides
  out on every `state` message, and is persisted with the rest of the room by the Durable
  Object. A second one costs the same path.
- **`LessonPlayer` must not learn which store it holds (D13).** It takes a `LessonStore`;
  `RoomStore extends LessonStore` is asserted at compile time by
  `roomStoreIsALessonStore`. Anything the player needs from a room has to exist on a solo
  lesson too.
- **`speech.speak()` is called from effects whose dependency lists include `speech`.** Four
  views do this. Whatever object the player passes down therefore has to have a deliberate
  identity, because changing it re-runs those effects.
- **`add-star-trail` is proposed and unimplemented.** It adds `src/sound/` (a chime and
  notes, synthesised on device) and a held follow-up utterance in `speech.ts`, and it left
  this change as an open question.

## Goals / Non-Goals

**Goals:**

- One place where "may the app speak right now" is decided, reached by every exercise
  without any exercise knowing about it.
- The room's copy of that setting follows the path `locked` already proved, so nothing new
  is invented in the protocol, the reducer or the Durable Object.
- Two call sites change in the views, not seven — the default has to be the safe one.
- The teacher's switch is one tap and always where she can reach it.

**Non-Goals:**

- Not a general "user preferences" mechanism. One boolean, no storage, no settings screen.
- Not a per-exercise or per-lesson-file setting. The lesson format gains nothing.
- Not a change to `speakableLines` or to which lines exist: recordings are unaffected.
- Not a device volume control. The device's own volume stays the device's own.

## Decisions

### D57 — One setting, held where the lesson's state is held: in the room, or locally

`RoomState` gains `muted: boolean`, set by a new teacher-only `{ t: 'mute', value }` and
carried out on every `state` message beside `locked`. `ClientView` gains it, `useRoom`
returns it, and `useLesson` returns a `useState` boolean with the same name and setter. So
`LessonStore` gains `muted` and `setMuted`, `RoomStore` still extends it, and
`LessonPlayer` reads `store.muted` without learning which one it is holding (D13).

*Why:* the switch has to cover both screens, which makes it room state by definition — the
room is the only thing the two screens agree through, and it is already what makes the lock
work across a reload, a late joiner and a lesson change. Putting it anywhere else would
mean a second synchronisation mechanism for one boolean.

*Rejected:* a per-device flag in each browser — cannot satisfy "the teacher turns it off
and the student's screen goes quiet", which is the whole request; it would also drift
between the two screens after a reload. *Rejected:* two switches, hers and the student's —
more panel, more state, and the teacher would have to remember which one she pressed.
*Rejected:* a field in `LessonState` — that is the reducer's, replayed and versioned per
action, and a setting is not an action's outcome; it would also reset on every
`switch-lesson`, which the spec says it must not.

### D58 — The setting is applied by wrapping `Speech`, and a line declares its intent

`speak` becomes `speak(text: string, intent?: SpeechIntent)` where
`SpeechIntent = 'auto' | 'demand'`, defaulting to `'auto'`. `Speech` also gains a readonly
`quiet: boolean` saying whether it is currently suppressing volunteered lines — `false` on
the module itself. `src/speech/policy.ts` exports `quietable(base: Speech, muted: boolean):
Speech`, returning a `Speech` with `quiet: muted` that drops `speak(text, 'auto')` while
muted and delegates everything else — `'demand'`, `enable`, `cancel`, `preload`, `getState`,
`subscribe` — to the base **by reference**, so the snapshot functions
`ListenView` hands `useSyncExternalStore` keep their identity and their caching.
`LessonPlayer` builds the wrapper and passes it down as the `speech` prop, so the views'
prop type does not change.

Two call sites gain an argument: `SentenceView`'s `🔊 Listen` and `ListenView`'s repeat
both become `speech.speak(line, 'demand')`. Every other call is left exactly as it is and
is `'auto'` by the default.

*Why:* the rule is one function that the whole app reaches through the prop it already
receives, which is what makes "no custom logic per page" true rather than aspirational. The
default matters as much as the wrapper: a block type added later, written by someone who
has never read this document, is quiet during a lesson that asked for quiet rather than
being the one thing that shouts. And the two intents are exactly the two the spec
distinguishes — inventing a third class ("prompt" for the listening target and the physical
instruction) would be a distinction the chosen policy never acts on.

*Rejected:* passing `muted` into `BlockViewProps` and checking it in each view — seven
checks to keep in step, and it is precisely the per-page custom code the change exists to
remove. *Rejected:* the flag living inside `speech.ts` as module state — the singleton is
shared by every screen this tab could show, a room's setting is not the module's business,
and a module-level mutable would have to be pushed into on every render anyway.
*Rejected:* suppressing at the bottom, inside `request()` — `enable()` funnels through it,
so the device-level offer would stop working exactly when it is needed.

### D59 — Off means the app volunteers nothing; a control the learner presses always speaks

*Why:* "completely off, including the buttons" would leave the listening exercise with no
question. The written word is the fallback for a device that cannot speak, and turning a
listening exercise into a reading exercise because the teacher wanted quiet is the wrong
trade — she wants the app to stop interrupting her, not the exercise to stop working. With
the buttons live, a quieted listening exercise becomes press-to-hear, which is a usable
exercise and is closer to how the teacher would run it by ear anyway.

*Rejected:* total silence — see above. *Rejected:* exempting the listening target and the
physical-response instruction from the setting, so they always speak — the physical-response
instruction is the single line the teacher is most likely to be saying herself ("Touch your
nose!"), so exempting it would silence everything except the one she most wants silenced.

### D60 — With the sound off, the listening control invites a first play

`ListenView` reads `speech.quiet` — the flag the wrapper carries (D58) — to choose its
wording only: `🔊 Listen` (nothing has been said yet) instead of `🔊 Listen again`. The
`showWord` fallback is left keyed on the device's own `status`, untouched by the setting.

*Why:* "Listen again" in front of a child who has heard nothing is a broken-looking button,
and this is the one exercise where the spoken line is the question. It is a label, not a
rule — the view reads what speech is doing, exactly as it already reads `speaking` and
`status`, and holds no copy of the policy. Reading it off the `speech` prop rather than a
new `BlockViewProps` field is what keeps the flag out of the five views that have no use
for it.

*Rejected:* putting `quiet` inside `SpeechState` behind `getState()`/`subscribe()` — the
wrapper would then have to return a derived snapshot, and a `useSyncExternalStore`
`getSnapshot` that builds a fresh object per call loops forever; caching it would mean the
wrapper subscribing to the module to rebuild one boolean. *Rejected:* a `muted` field on
`BlockViewProps` — a prop every block view carries so that one of them can pick a word.

*Rejected:* revealing the written word when the sound is off — it makes the exercise
readable rather than audible, and the spec keeps that last resort for a device that cannot
speak. *Rejected:* auto-unmuting on reaching a listening exercise — the teacher's switch
would then be overridden by the lesson, and she would find sound back on without having
touched anything.

### D61 — The wrapper's identity changes with the setting, which is what re-speaks a standing prompt

`LessonPlayer` builds the wrapper with `useMemo(() => quietable(speech, muted), [muted])`,
so its identity changes when and only when the setting changes. Four views list `speech` in
an effect's dependencies, so turning the sound back on re-runs those effects:
`ListenView` speaks its target, `TprView` its instruction, `SentenceView` its sentence.
`MatchView`'s effect re-runs too but its `announced` ref makes it a no-op, and `CardsView`
and `SortView` speak from `onClick` and so say nothing. That is exactly the split the spec
asks for: a standing prompt is spoken again, a line that answered a tap already gone is
not. Turning the sound *off* also re-runs them, and the wrapper drops what they ask for;
`LessonPlayer` additionally calls `cancel()` in an effect so a word already in flight stops.

*Why:* the behaviour and the mechanism are the same fact — "the exercise's automatic line
is a function of its current state, re-evaluated when the policy changes" — and it needs no
new signal, no broadcast and no per-view code. It is what makes the teacher's flip on a
listening exercise produce the word on both screens, which is the moment she will actually
use this in.

*Rejected:* a stable wrapper reading the setting from a ref — nothing would be spoken on
turning the sound back on, and the teacher would have to tell the child to press the
speaker. *Rejected:* an explicit "say your prompt now" signal pushed from the player into
the views — a second mechanism describing what the effects already describe, and one more
thing for a new block type to forget. *Trade-off recorded:* this behaviour rests on
dependency arrays, so it is pinned by tests (tasks 5.3, 6.4) rather than left to be
rediscovered.

### D62 — Sound starts on, and a room opens with it on

`RoomCore.open` sets `muted: false`, `useLesson` starts `false`, and the invitation
(`POST /api/rooms`) carries the lesson and its state as it does today — not the setting.

*Why:* on is what the app does today, so no lesson changes behaviour until someone asks it
to; a switch that starts in the state nobody chose would be a surprise the first time the
teacher opened a lesson after the deploy. Carrying the solo setting through the invitation
would add a field to the one non-socket request the app makes, to save one tap once per
room, on a screen where the teacher is already deciding how to teach.

*Rejected:* off by default in a room, on when alone — the shape first sketched from the
request. It makes the app's behaviour depend on which link you opened, so the same lesson
is silent or not for reasons the teacher did not set; and a teacher who never finds the
switch would conclude the app's sound is broken. *Rejected:* remembering it per device in
`localStorage` — MVP principle 2 keeps nothing at rest, and a remembered mute is a
first-class support question ("why is it silent today?").

### D63 — The control lives in the player's header, not in the teacher panel

An icon-only toggle (`🔊` / `🔇`, `aria-pressed`, an accessible name) sits in
`LessonPlayer`'s header, rendered where `canSteer` is true — which is the teacher in a room
and the one person playing a lesson alone, and never a student (D22). `TeacherPanel` is not
touched.

*Why:* one implementation covers both the room and the solo lesson, which the panel cannot
because a solo lesson has no panel. The panel is also dismissible, and the spec requires
this control to stay reachable when the teacher has dismissed it to see what the student
sees. `canSteer` is already the app's word for "this screen paces the lesson", so the
control appears and disappears with the rest of that set, and the "nothing on the student's
screen" requirement holds by construction rather than by a second check.

*Rejected:* the teacher panel beside the lock — conceptually its sibling, but it would
vanish with the panel and would need a second copy for solo. *Rejected:* the footer beside
`↺ Reset` — the footer is about pacing the lesson; a setting is not a step.

### D64 — When `add-star-trail` lands, its chime and notes obey this same setting

Nothing in this change touches `src/sound/`, which does not exist. The wrapper is shaped so
that the completion chime and the closing screen's notes are `'auto'` lines by the same
definition — the app making a noise nobody asked for — and `add-star-trail`'s player work
routes them through the same `muted` value it will already be reading.

*Why:* "turn the sound off" has to mean all of it, and recording the intent now is what
stops the two changes from shipping two switches.

*Rejected:* writing the requirement into this change's `sound` spec delta now — there is no
`sound` capability in `openspec/specs/` yet, and a requirement no shipped code satisfies is
a spec that lies.

### D65 — A room stored before this change loads as unmuted, in the adapter

`worker/room.ts` normalises what it reads from storage — `{ ...stored, muted: stored.muted
?? false }` — before handing it to `RoomCore`, and `viewReceive` reads `message.muted ===
true` so a client running new code against an old Worker, or the reverse, sees sound on.

*Why:* storage shape is the adapter's job by its own contract (it owns the sockets, the
storage and the alarm; the core owns the rules), and the safe default and the intended
default are the same value, so every combination of old and new on either side of the wire
lands on the behaviour the app has today.

*Rejected:* a stored schema version and a migration — one optional boolean whose absent
value is its default does not need one.

## Risks / Trade-offs

- **The re-speak on turning the sound back on rests on effect dependency arrays (D61).** A
  later refactor that memoises the `speech` prop harder, or drops it from a dependency
  list, would silently remove a specified behaviour. → Two tests pin it directly: the
  listening view speaks its target when the setting flips on, and does not when it flips
  off. Both fail loudly, in the view, if the wiring changes.
- **A teacher who turns the sound off and forgets may report the app as broken.** → The
  control shows its state rather than only its action, and it is in the header on every
  screen that steers, so the state and its remedy are in the same place.
- **A student on a quieted listening exercise may not realise they should press.** → D60's
  wording change is exactly this: the control reads as an invitation to play, not as a
  repeat of something they missed.
- **Both screens still speak when the sound is on, and the teacher hears the student's
  through Zoom as well as her own.** → Unchanged by this change and out of its scope; the
  room-wide switch is the remedy the teacher now has for it. A per-device refinement can be
  added later without moving the room's setting.
- **`add-star-trail` edits the same two files.** → No behavioural conflict (a held
  follow-up utterance and a suppression rule over intents compose), but whichever lands
  second reconciles `src/speech/speech.ts` and `src/ui/LessonPlayer.tsx` by hand. Recorded
  in the proposal so neither change is applied assuming the other has not moved.
- **One more thing in the header at 380 px**, beside the back arrow, title, progress and —
  in a solo lesson — the invite button. → The control is icon-only and the narrow-window
  check is an explicit task; the title shrinks first, as it already does.

## Migration Plan

Deployed as one revision, client and Worker together. Nothing to migrate: no lesson file, no
`LessonState` field, no route and no stored schema change beyond an optional boolean whose
absence reads as its default (D65). A room opened before the change keeps working, with
sound on, the moment a device running the new code joins it.

Rollback is a revert. A room whose state was stored with `muted: true` and is then served by
the previous Worker keeps the field in storage, ignores it, and plays with sound on — the
behaviour that build has anyway.
