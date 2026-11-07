## Why

The teacher sent four more HTML lessons: Clothes, At Home, School and Weather. They give her
children the words for the world around them: what they wear, the rooms they live in, what
is on their desk, and what it is like outside today. The app has none of this vocabulary,
and none of the forty words overlaps a word already in a lesson.

The four pages are one template filled four times; they differ only in their data. Each
topic has ten words in two halves of five, and a Review tab over all ten. That is exactly
what `parts` and the whole-topic size already express (D-43).

Five of the six exercises on each page map onto existing blocks. A trial conversion, run
through the real validator and the full test suite, was accepted with no code change. The
children can have these four topics now, as data. The one exercise that needs a new block
(Spell it) is named here and left to a change of its own.

## What Changes

- **Four new topics, as data**, each with two parts of five and the whole topic:
  - `clothes.json`: *Clothes*. Parts `everyday` and `warm`.
  - `home.json`: *At Home*. Parts `inside` and `around`.
  - `school.json`: *School*. Parts `things` and `classroom`.
  - `weather.json`: *Weather*. Parts `today` and `more`.
- **Her exercises map onto existing blocks:**
  - Look and learn → `cards`;
  - Listen and pick → `listen`, with three choices as on her page;
  - Match it → `match`;
  - Build the sentence → `scramble`, with each word's own sentence carried as a tag;
  - Say it! → `tpr`, with one of her six prompts fixed to each word.
- **Her Japanese sentences stay in the lesson.** Her page hides them behind a 日本語 button
  inside Build the sentence, which `scramble` has no place for. They become a `cards` block
  placed just before it: the picture on the front, the English and Japanese sentences on the
  back.
- **Spell it is absent by name.** It is on all four pages and in the PLAN backlog, and it
  gets its own change next. It is not approximated here.
- **The random draw in Say it! is not carried.** Each word has one fixed prompt, rather than
  a random prompt on a random word.
- **Romaji for all forty words.** Her pages have only kana, while all 76 existing words carry
  romaji. These are written here, and the teacher should review them.
- **Forty pictures.** Thirty-nine come from Microsoft Fluent Emoji (MIT), as with the last
  four topics (D144).
- **Pictures that correct her page:**
  - `fridge` was an ice cube on her page, and Unicode has no fridge, so it gets its own
    drawing;
  - `garden` becomes a tree and a tulip, so it no longer repeats the park's tree;
  - `shoes` and `boots` show two, because the word is plural (D143);
  - `teacher` is a woman, because the sentence says "She".
- **Recordings** for every new line, from the existing pipeline.
- **Her source pages move** from `.wrangler/`, a tool's scratch folder, to `docs/reference/`
  beside the earlier ones.

## Capabilities

### New Capabilities

None. Four topics are four lesson files.

### Modified Capabilities

- `lesson-format`: the requirement "The format covers the teacher's existing material" grows
  to cover Clothes, At Home, School and Weather. It also names what those lessons carry
  differently (Say it!, the Japanese sentences) and what is absent (Spell it).

## Impact

- **New:**
  - `lessons/clothes.json`, `lessons/home.json`, `lessons/school.json`, `lessons/weather.json`;
  - 40 pictures under `public/pics/{clothes,home,school,weather}/`;
  - about 120 new clips under `public/audio/`.
- **Changed:**
  - `scripts/pictures.ts`: forty recipes in `SUBJECTS`, because the script refuses an item
    without one;
  - `src/blocks/pictures.ts` and `src/speech/clips.ts`, both regenerated and never
    hand-edited;
  - `THIRD_PARTY_NOTICES.md`, `README.md`, and `docs/PLAN.md` §9 and §12.
- **Unchanged:** all app code under `src/` except the two generated manifests, plus
  `worker/`, the action set and the room protocol.
- **Tests:** no test changes are needed. Every file under `lessons/` is already validated and
  played at every size it offers.
- **Cost:** no paid generation is planned. Gemini is only the fallback for one picture.
- **Not in this change:** the `spell` block, any commit, and any deploy.
