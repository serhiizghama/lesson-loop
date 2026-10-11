## Why

After Phase 2a, the teacher's four sentence lessons can play every exercise that has a
right answer. What is left is her conversation games. They are the exercises that turn a
child who can say *I like grapes* into a child who can talk about grapes for thirty
seconds:

- **Guess & Say** (all six pages). A blurred picture, a guess said out loud, a peek, then
  the reveal with its sentence.
- **The role-plays** (Fruit Stand, Drinks Café, Family Photo, Plan Our Day). Two roles, a
  question, an answer, a follow-up, and the two people swap roles.
- **Talk Time** (lessons 2, 7, 18, 21). Questions in three levels: an easy one, then
  "harder follow-up" until the child is answering the hardest.
- **This or That** (lessons 2, 7). Two pictures; the child picks one and says *I prefer
  grapes to pears because…*.
- **Say more** (lessons 2, 7, 18, 21). A sentence built from rows of choices: *I really
  like* + *grapes* + *because they are juicy*. It notices when the parts disagree ("I love
  grapes because they are too sticky") and asks *Does that make sense?*.

Today the role-plays, This or That and Talk Time reach the child as a flat list of
phrases, and Guess & Say and Say more are absent (D-52). On her pages each of them is
thin: a random pick, a string, the browser's voice. The teaching is in the talk around
them. That talk is exactly what a synchronised screen makes possible: both people look at
the same blurred picture, the same role card, the same question.

This is Phases 2b and 2c together (`docs/PLAN.md` §9), at the teacher's request.

## What Changes

- **`reveal`** (Guess & Say). One item at a time, its picture heavily blurred.
  - *Peek* makes it clearer; *Reveal* shows it and says its line ("I like grapes.").
  - Nothing can be wrong: the child guesses out loud, and the teacher judges.
  - The exercise is complete when every item has been revealed.
- **`dialogue`** (role-play). Two named roles, and per item an ordered list of lines, each
  spoken by one of the roles ("What do you like?" / "I like {en}." / "Why do you like
  them?" / "Because they are {tag:why}.").
  - Each tap reveals and says the next line.
  - *Swap roles* changes which person plays which role. The roles are labels on the
    screen — "Shopkeeper: Teacher" — and nothing enforces who taps.
  - The exercise is complete when every item's dialogue has been played through.
- **`talk`** (Talk Time). Questions in declared levels, as literal text like phrases.
  - *New question* asks one from the first level.
  - *Harder* moves up a level and asks one from there.
  - Questions come in a fixed, shuffled order, so both screens ask the same one.
  - The exercise is complete once a question from the last level has been asked.
- **`prefer`** (This or That). A declared number of rounds, each offering two items. The
  child taps one and the sentence appears, rendered with a new placeholder `{other}` for
  the item not chosen: *I prefer grapes to pears.* The exercise is complete when the last
  round is chosen.
- **`combine`** (Say more). Rows of options declared by the lesson, plus the lesson's own
  items, joined by a template that names each row (`{row:feel} {en} because {row:why}.`).
  - An option can carry a *mood* (good / bad). When two chosen options disagree, the
    screen asks *Does that make sense?* and still allows the sentence.
  - An option can belong to particular items only, so that *play on the swings* is offered
    for the park and not for school.
  - *Surprise me* picks a sensible combination.
  - The exercise is complete when a sentence has been built and heard for every item.
  - **Its sentences are spoken by the device's voice, not recorded.** A lesson's
    combinations run to hundreds of sentences. This is the one exercise whose lines are
    deliberately left to the fallback voice, at the teacher's request, and the speech
    requirement that every line is known in advance gains a named exception for it.
- **The lessons take the new exercises** (D-42):
  - every topic gains *Guess & Say* and *Say more*;
  - the phrases stand-ins for the role-plays, This or That and Talk Time are replaced by
    `dialogue`, `prefer` and `talk`;
  - Fruit Talk's whole-topic-only exercises stay `only: ["all"]`, and its new *Say more*
    joins them, because her 2A and 2B have neither.
- **Named as still absent:** the picture hunt, the three-times speaking meter, the
  spinning wheel, the silly voices, and the survey / family album (D-52 stands for these).
  After this change those are the only exercises of her six pages that the app does not
  play.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `exercise-blocks`:
  - gains a requirement for each of the five exercises;
  - its requirement "An exercise speaks unasked only while the lesson's sound is on" names
    the new places the app volunteers a line.
- `lesson-format`:
  - gains the declarations of the five exercises, including `{other}` in `prefer` and
    `{row:…}` in `combine`;
  - its requirement "The format covers the teacher's existing material" moves the
    role-plays, This or That, Talk Time, the blurred guess and the sentence combiner to
    "playable", leaving only the named five absent.
- `teacher-view`: its answer-key requirement gains the five keys.
- `speech`: its requirement "Every line a lesson can speak is known before the lesson
  runs" gains the one named exception, a sentence combiner's combinations.

## Impact

- **New:** five logic modules under `src/shared/blocks/` and five views under
  `src/blocks/`, each with tests.
- **Changed:**
  - `src/shared/types.ts`, `src/shared/validate.ts`;
  - `src/shared/text.ts` (`{other}` and `{row:…}`);
  - the two registries, `speakable.ts` (and its test's list of types that record
    nothing), `blocks.module.css`;
  - the test fixture and `tests/support/play.ts`;
  - the guide's exercise table;
  - the four lesson files and new clips;
  - `README.md`, `docs/PLAN.md`.
- **Unchanged:** the action set (everything is `tap`), `LessonState`, the reducer's
  dispatch, the room protocol, the Worker, `narrow`.
- **Size:** about as much engine work as Phase 2a for each two blocks. `combine` is the
  largest single piece.
