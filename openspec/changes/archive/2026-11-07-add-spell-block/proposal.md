## Why

A child who has met *scissors* can recognise it, hear it and put it in a sentence, but nothing
in the app makes them look at how it is written. Letter order is where a Japanese child learning
English has the most to learn: a kana word gives no help with *scissors* or *umbrella*. The
teacher's Clothes, At Home, School and Weather pages each have an exercise for exactly this,
Spell it, and it is the one exercise of those pages the app does not play (D-62).

Sentence assembly is the closest thing the app has, and it works on whole words. Calling that
spelling would teach the teacher that the app half-does it, so this needs a block of its own.

## What Changes

- **A new `spell` block.** The child sees a picture and the word's letters, shuffled, and taps
  them in order to spell it. The word appears one letter at a time and is spoken when finished.
  The child moves on when ready. It works through the selected words one at a time.
- **Tapping the wrong letter costs nothing.** It is refused with visible feedback, and letters
  already placed stay placed, as in sentence assembly. Her page instead accepts letters in any
  order, checks at the end, wipes the attempt if it is wrong, and offers an undo. Those are
  dropped on purpose (D-66).
- **A 🔊 control says the word on demand**, as on her page, with the sound on or off.
- **Letters are never offered already spelled**, so *TV* and *pen* are not given away by the
  shuffle.
- **The teacher's key** shows each word with its letters and marks the one on screen.
- **A lesson is rejected if a selected word cannot be spelled**: fewer than two letters, or
  anything other than letters in it, such as the space in *ice cream*.
- **Clothes, At Home, School and Weather gain the exercise**, in her order: after Match It at
  every size. Each lesson goes from seven slides to eight.
- **The teacher's guide** describes the new exercise, as its test requires of every block type.

The missing-letter variant named in the PLAN backlog is not part of this change: none of her
pages has it.

## Capabilities

### New Capabilities

None. A new block type extends existing capabilities.

### Modified Capabilities

- `exercise-blocks`: adds the spelling exercise, and adds it to the rule on when an exercise may
  speak.
- `lesson-format`: adds what a spelling block declares and when it is rejected, and changes Spell
  it from absent to played in the requirement on the teacher's material.
- `teacher-view`: adds the word being spelled to what the answer key shows.

## Impact

- **New:** `src/shared/blocks/spell.ts`, `src/blocks/SpellView.tsx`, and their tests.
- **Changed code:**
  - `src/shared/types.ts`, `src/shared/validate.ts`, and both block registries;
  - `src/shared/blocks/speakable.ts`, for the lines the block can speak;
  - `src/blocks/blocks.module.css`;
  - `src/ui/Guide.tsx`, for the guide's exercise table.
- **Changed tests:**
  - `tests/support/play.ts`, which silently skips a block type it does not know;
  - `src/shared/__fixtures__/lesson.ts`, which must hold every block type, and so the exercise
    counts in `src/ui/student-view.test.tsx`;
  - `src/ui/stage-fit.test.tsx`.
- **Changed data:** the four lesson files, one block each.
- **Changed docs:** `README.md`, and `docs/PLAN.md` §5, §9 and §12.
- **Unchanged:** the action set and the room protocol (the block uses the existing `pick` and
  `tap` actions), and `worker/`.
- **Cost:** no new pictures and no new recordings. Every word is already recorded, because the
  cards in these lessons speak it.
- **Not in this change:** a commit or a deploy.
