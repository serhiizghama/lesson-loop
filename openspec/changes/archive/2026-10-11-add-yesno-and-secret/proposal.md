## Why

Phase 1 (`add-fruit-drinks-family-places`) shipped four of the teacher's sentence lessons.
Two of her exercises reached the child only as lists of sentences to repeat, and one did
not ship at all:

- **Ask & Answer** (lessons 2, 7, 21) and **Is this your…?** (lesson 18). This is where a
  child first *answers* a question rather than naming a thing. A picture appears with a
  question about it, the child says her answer, then taps *Yes* or *No* and hears the full
  reply ("No, I don't. I don't like tea."). In lesson 18 the question can be wrong on
  purpose: a picture of mom is shown and the child is asked "Is this your sister?". Then
  *No, it isn't* is the only right answer, and the child has to look before she agrees.
  Today all of this is a phrases block. The child hears the question and both answers read
  out, and never has to choose.
- **Guess My Secret** (lessons 7, 18, 21). A drink, a person or a place is hidden. The
  child finds it by asking the frame's question about one candidate after another: "Do
  you like milk? — No, I don't." Each wrong guess makes her say the question once more. It
  is the most repetition of the frame in any of her games, and the child is the one asking.
  Phase 1 left it out (D-52).

There is also one compromise in how the format fits her halves. Fruit's second part
carries three exercises her own 2B does not have (Ask & Answer, This or That, Talk Time),
because the format could not say "the whole topic only" (design D136).

This is Phase 2a, chosen first because it closes the most of her sections for the least
cost (`docs/PLAN.md` §9).

## What Changes

- **A new exercise, `yesno`.** It shows one picture at a time with a question about it, and
  offers *Yes* and *No*. Each answer has its own full reply, written as a template, and the
  reply is shown and spoken for the item on screen. It works two ways:
  - **an opinion** (`check: false`): both answers are right. The question is always about
    the picture shown. Used for *Do you like…?* and *Do you want to go…?*;
  - **a check** (`check: true`): the question names either the item shown or another one,
    chosen from the seed, about half the time each. Only the true answer is accepted, and
    the reply is about what is really shown ("No, it isn't. This is my mom."). Used for
    *Is this your…?*

  After an answer the item stays on screen with its reply until the learner moves on.
  The exercise is complete when every item has been answered.
- **A new exercise, `secret`.** One item is hidden behind a 🎁, and every selected item is
  offered as a tile.
  - A wrong tile is crossed out and speaks the block's `guess` line ("Is it your dad? No,
    it isn't.").
  - The right tile reveals the secret and speaks its `found` line ("Yes, it is! This is my
    grandma.").
  - The block plays a declared number of `rounds`, each with a different secret. It is
    complete when the last secret is found.
  - The teacher's key names the secret; the student's screen never does.
- **A block can belong to the whole topic only.** In `only`, the name `"all"` means the
  whole-topic sitting, the same word its address already uses (`/l/fruit/all`). A block
  with `only: ["all"]` appears when the whole topic is chosen and in no part. Because of
  that, `all` can no longer be used as a part id.
- **The lessons take the new exercises** (D-42: a new type ships used):
  - **Drink Talk:** *Ask & Answer* becomes a `yesno`, and *Guess My Secret Drink* is added.
  - **Let's Go!:** *Do You Want To Go…?* becomes a `yesno`, and *Guess My Secret Place* is
    added. Its `guess` line needs a new tag, `np` ("the park", "school", "home").
  - **My Family:** *Is This Your…?* becomes a checked `yesno`, one per part over the words
    that part teaches. *Guess My Secret Person* is added.
  - **Fruit Talk:** *Ask & Answer* becomes a `yesno`. It, *This or That* and *Talk Time*
    become `only: ["all"]`, so part 2 is again exactly her 2B.
- **Deliberately not built:** in lesson 21, *No, I don't* opens a second choice ("Where do
  you want to go?" → tap another place). That follow-up is dropped. The reply is just "No,
  I don't.", and the teacher can ask the follow-up herself. It would make the one exercise
  two.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `exercise-blocks`:
  - gains two requirements, one for the yes/no exercise and one for the secret game: what
    each presents, what counts as right, what a wrong answer does and when it is complete;
  - its requirement "An exercise speaks unasked only while the lesson's sound is on" names
    the new places the app volunteers a line.
- `lesson-format`:
  - gains the declarations of the two exercises and the rules that make them valid;
  - its requirement "The format covers the teacher's existing material" moves Ask & Answer
    and Is this your…? from "carried as phrases" to "playable", and Guess My Secret from
    "absent" to "playable".
- `lesson-size`: its requirement "Exercises belong to the sittings they suit" gains the
  whole-topic-only block, and `all` becomes a reserved part id.
- `teacher-view`: its answer-key requirement gains the keys for the two new exercises.

## Impact

- **New:**
  - logic: `src/shared/blocks/yesno.ts`, `src/shared/blocks/secret.ts`;
  - views: `src/blocks/YesNoView.tsx`, `src/blocks/SecretView.tsx`;
  - their tests.
- **Changed:**
  - `src/shared/types.ts` (two block shapes, two state shapes);
  - `src/shared/validate.ts` (schemas, cross-checks, `only: ["all"]`, reserved part id);
  - the block registries `src/shared/blocks/index.ts` and `src/blocks/index.ts`;
  - `src/shared/blocks/speakable.ts`, `src/blocks/blocks.module.css`;
  - the test fixture `src/shared/__fixtures__/lesson.ts`, and `tests/support/play.ts`,
    which plays block types by name;
  - the guide's exercise table, which a test holds to the registry;
  - the four lesson files, the clips for the new lines, `README.md` and `docs/PLAN.md`.
- **Unchanged:**
  - the action set: both exercises are expressed in `tap`;
  - `LessonState`'s shape, the reducer's dispatch, the room protocol, the Worker;
  - `narrow`'s logic: a block naming `all` already belongs to the whole topic and to no
    part, so only validation changes.
- **Naming:** `docs/PLAN.md` §9 called the yes/no exercise `ask`. It is named `yesno`
  because `ask` is already a field of `quiz`, and two meanings of one word in one format is
  a bug waiting for a lesson author.
