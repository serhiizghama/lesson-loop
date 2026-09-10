## Why

We decided how long a lesson is, and we decided it once, in the files. D-36 read the
teacher's own re-cut of Animals — five words behind one tab, five behind another — and
turned it into a rule the content obeys: a lesson file introduces at most five words, and
a topic longer than that becomes two files. It is the right reading of what she sent, and
it is still a guess made on her behalf. She has one child in front of her and we are not
in the room: some days five is the sitting, some days the child has met these words
before and ten is right, and nothing in the app lets her say so. The evidence is thinner
than the rule, too — her Animals is five and five, but her Shapes is **four** and four, so
even the number we wrote down is not the number she used.

The cost of that guess is not only pedagogical. Every topic has to be pre-cut by hand into
`-1` and `-2` files, four topics are still waiting to be cut, and each cut is a new file to
author and keep in step. We are doing content work to express a decision that is not ours
to make.

**Give the choice back to her.** A topic is one file that declares its own halves; when
she opens it she says how much of it this sitting is — five words, or the lot — and the
app builds that lesson. What we keep is the *shape* of her finding: that a topic has
halves, that a later half revises the earlier one, that a sitting introduces a handful of
words. What we stop doing is deciding which of those sittings she is having today.

## What Changes

- **A topic is one file again, and declares its own parts.** `animals-1` + `animals-2`
  become `animals.json` (ten words, two declared parts); `shapes-1` + `shapes-2` become
  `shapes.json` (eight words, two parts). A part names its own items and carries its own
  title — the halves she drew herself, moved from the filenames into the file.
  **BREAKING**: the addresses `/l/animals-1`, `/l/animals-2`, `/l/shapes-1` and
  `/l/shapes-2` no longer resolve.

- **The teacher chooses the size when she opens the topic.** The topic's card offers
  **five words** — and, when the topic has parts, which half — or **all of them**. The
  lesson that starts is built to that choice. A topic that declares no parts offers only
  the one choice and opens as it does today.

- **Choosing a later part carries the earlier ones for revision.** Part two of Animals is
  a ten-word lesson that *teaches* five: exactly what `animals-2` is today (D-37), now
  derived rather than authored twice. This is what keeps "Where do they live?" an actual
  question instead of one bucket — the flaw in the teacher's own part two, which we
  already fixed once by hand.

- **Blocks say what they work on rather than naming words.** A new selector means "the
  words this sitting teaches", so one authored block serves every size. A block may also
  declare the parts it belongs to, which is how a revision exercise stays out of the first
  sitting — and how her Shapes model phrases, which differ between the halves because they
  quote that half's words, keep differing.

- **A lesson file is valid only if every size it offers is valid.** The existing
  cross-checks — a sort bucket no item falls into, a match asking for more pairs than
  there are items — now run against each derived lesson. The exact defect in her own file
  becomes a build error rather than a dull exercise.

- **The remaining four topics get parts instead of being cut into new files.** `colours`,
  `body-parts`, `food` and `numbers` gain a `parts` declaration and lose nothing: same
  items, same pictures, same recordings. This retires the outstanding v0.2 task of
  re-cutting them, which would have meant four new files plus their pictures and audio.

- **D-36 is superseded.** The rule "a lesson file introduces at most five words, and the
  format has no notion of parts" is replaced by "a topic file declares its parts, and the
  teacher chooses how much of it to teach". The teaching finding behind D-36 survives as
  the default she is offered; it stops being a constraint on the data.

## Capabilities

### New Capabilities

- `lesson-size`: How much of a topic a sitting teaches. What the teacher is offered when
  she opens a topic, what lesson each choice produces, how the choice reaches an address
  so a reload and a cold link keep it, and how it meets a room.

### Modified Capabilities

- `lesson-format`: "A lesson teaches one sitting's worth of vocabulary" is replaced —
  the file is a topic that declares parts, rather than a topic being split across files.
  "Blocks select their items by explicit reference" gains the selector for the words a
  sitting teaches, and blocks gain the parts they belong to. "A malformed lesson is
  rejected loudly before it is played" is extended to every size a topic offers.

## Impact

- **Content**: all eight lesson files. `animals-1`/`animals-2` merge, `shapes-1`/`shapes-2`
  merge, and the other four gain parts. No new pictures and no new recordings — every word
  already has both.
- **Code**: `src/shared/types.ts` (the topic's parts, the new selector, the block's parts),
  `src/shared/validate.ts` (validate every derived size), a new narrowing function that
  turns a topic plus a choice into an ordinary lesson, `src/lessons.ts`, `src/ui/router.ts`
  (the address carries the choice), `src/ui/App.tsx` (the topic card offers it).
- **Not affected**: the reducer, the room, the Durable Object and the wire protocol. The
  lesson that reaches the player and the room is an ordinary lesson with no notion of
  parts — narrowing happens before anything is played, so nothing downstream learns a new
  concept.
- **Docs**: `docs/PLAN.md` — D-36 superseded, the v0.2 remainder loses "re-cut the
  remaining four lessons", and the new decisions recorded.
