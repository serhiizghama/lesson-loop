## Why

The teacher sent six more HTML lessons (`docs/reference/lesson2*`, `lesson7*`, `lesson18*`,
`lesson21*`). Together they move her children past naming things. Until now a child has
learned to *recognise* a word: *dog*, *red*, *circle*. These lessons are about *using* one
in a sentence about herself: **I like grapes. Do you like milk? This is my grandma. Let's
go to the zoo.** Each topic is a single sentence frame, and the word slots into it. That
is the step from vocabulary to talk, and the app has no lesson that takes it.

Read together, the six pages are one template filled four times. Each runs the same
sections: look → meet the names → the sentence → say more → ask and answer → a run of
games → show and tell. Only the words and the frame change. 2A and 2B are not new topics
either. They are lesson 2 cut in half by the teacher herself, two fruits behind each half,
which is exactly what `parts` already expresses (D-43).

Mapping that template onto the engine shows that most of it is playable today, with no
new block type:

- the words with their syllables,
- the sentence ladder,
- listening,
- sentence assembly,
- the clue riddles,
- the "to the / to / —" pattern sort,
- the model sentences of the dialogues.

Phase 1 is everything the existing format can carry. The children get four topics now,
not after five new exercise types are built. The parts that genuinely need new mechanics
are named and left for Phase 2.

## What Changes

- **Four new topics, as data:**
  - `fruit.json`: *Fruit Talk*. Two parts, exactly the teacher's halves:
    - `a` (oranges, pears);
    - `b` (grapes, watermelons).
    The whole topic is her lesson 2.
  - `drinks.json`: *Drink Talk*. Milk, juice, water and tea. One sitting, no parts.
  - `family.json`: *My Family*. Six words, so two parts:
    - `home` (mom, dad, brother, sister);
    - `grand` (grandma, grandpa), which carries all six and revises them.
  - `places.json`: *Let's Go!* Park, school, home and the zoo. One sitting, no parts.
- **Every frame is expressed with what the format already has:**
  - *I like {en}.*, *This is my {en}.* and *Let's go {tag:go}.* are sentence templates;
  - *He / She* comes from a `he` tag, not a new placeholder;
  - the irregular *to the park / to school / home* comes from a `go` tag, not grammar code.
- **Her exercises map onto existing blocks:**
  - Meet the names → `cards`, with the syllables on the back;
  - the sentence and "say more" → `sentence`;
  - Listen & Pop → `listen`;
  - Build the Sentence → `scramble`;
  - Clue Detective → `quiz` over a `clue` tag;
  - Which Pattern? → `sort` by a `pattern` tag;
  - Ask & Answer, the role-plays, This or That and Talk Time → `phrases`.
- **The dialogues are carried as their language, not their mechanic.** The phrases block
  plays the model lines: the question, both answers, the role-play turns. It does not
  supply the yes/no buttons, the role swap or the question ladder. Those wait for the
  Phase 2 block that owns each one, and the phrases block is what that block replaces.
- **Named as absent**, following the precedent of D-39. Each one needs something the
  engine does not have:
  - *Fruit Stand Hunt*;
  - the *say it three times* star meter (D-39 itself);
  - *Spin & Say*;
  - *Silly Voices*;
  - *Guess & Say* (the blurred reveal);
  - *Say more* as a free combination of feeling × word × reason;
  - *Class Survey* / *Family Album* (typed names);
  - *Guess My Secret*.
- **Japanese glosses with romaji** are written for every word. The teacher wrote glosses
  for Family and Places. For Fruit and Drinks this is assumed, as it was for Shapes.
- **Eighteen pictures from Microsoft Fluent Emoji (MIT)**, not generated (D144). They are
  rendered onto the app's 512 white square, with plural fruit shown as several pieces. The
  four topics therefore look different from the drawn ones, which is a known and accepted
  trade-off. Nothing goes to Gemini.
- **Recordings** for every new line, from the existing pipeline.

## Capabilities

### New Capabilities

None. Four topics are four lesson files.

### Modified Capabilities

- `lesson-format`: the requirement "The format covers the teacher's existing material"
  grows to cover Fruit, Drinks, Family and Places. It also names the exercises of those
  lessons that are carried only as model phrases, and the ones that are absent.

## Impact

- **New:**
  - `lessons/fruit.json`, `lessons/drinks.json`, `lessons/family.json`, `lessons/places.json`;
  - 18 pictures under `public/pics/{fruit,drinks,family,places}/`, from Fluent Emoji;
  - `THIRD_PARTY_NOTICES.md`, the Fluent Emoji MIT notice;
  - new clips under `public/audio/`.
- **Changed:**
  - `scripts/pictures.ts`: eighteen recipes in `SUBJECTS`, marked as unused for these
    topics (the script requires one per item);
  - `src/blocks/pictures.ts` and `src/speech/clips.ts`, both regenerated and never
    hand-edited;
  - `README.md`, and `docs/PLAN.md` §9 and §12.
- **Unchanged:** every file under `src/shared/`, `src/blocks/*View.tsx`, `src/ui/`,
  `src/speech/` (except the generated manifest), `worker/`, the action set and the room
  protocol. No app code changes. That is the point of the phase, and the check that it
  held.
- **Tests:** no test changes are needed for the new topics to be checked. Every file under
  `lessons/` is already validated at every size it offers (D-46), part length is already
  capped (`tests/lesson-length.test.ts`) and pictures are already checked against the
  manifest. All of them start covering four more topics.
- **Cost:** no Gemini calls. Recordings run on macOS.
- **Ordering:** none. No other change is open.
