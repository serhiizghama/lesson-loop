## Context

The six reference pages are one template. `proposal.md` explains why and how they are
grouped into four topics. This document covers how each topic is written down as a lesson
file, so that the file still validates at every size it offers (D-46), and which choices
had alternatives.

Constraints that shape every decision below:

- **A topic has to be valid at each size it offers, not only as a whole.**
  - `validateLesson` narrows the topic to each size and cross-checks the result.
  - A `listen` that asks for 4 choices fails in a part that carries only 2 words.
  - A `sort` whose buckets all fill from one part fails too.
- **A part may introduce at most five words** (`tests/lesson-length.test.ts`), and
  `NOT_YET_PARTED` is empty. So a six-word topic with no parts is a failing test, not a
  warning.
- **Template placeholders are a closed set:** `{en} {article} {it} {be} {this} {l1}
  {tag:x}`. `{it}` and `{this}` render capitalised (`It`, `They`, `This`, `These`), so
  they only work at the start of a sentence.
- **Pictures are drawn against an anchor.**
  - Every drawing is generated with `animals/dog` attached as a style reference.
  - The generator skips a file that already exists.
  - It stops on an item that has no recipe in `SUBJECTS`.
- **Audio is generated from what a lesson says.** Clips are keyed by a hash of the spoken
  line, so a line that is already recorded is reused for free, whichever lesson says it.

## Goals / Non-Goals

**Goals:**

- Four topics that a teacher can open and teach today, in every size each one offers.
- Every frame of the reference lessons expressed through existing faces, tags and
  templates.
- No change to any file the room or the reducer depends on.

**Non-Goals:**

- Any new block type, placeholder, face or validation rule. Anything that would need one
  is Phase 2 or is named absent.
- Reproducing the reference pages' visual design: per-word colours, the hero row, the
  per-tap star counter.
- Re-drawing or re-recording the Food lesson's milk and water.

## Decisions

### D135: The four frames are carried by tags, not by new placeholders

Three things in these lessons vary per word in ways the template language cannot derive:

| What varies | Examples | How the file carries it |
|---|---|---|
| a pronoun | He / She | tag `he` |
| a destination phrase | to the park / to school / home | tag `go` |
| a reason | They are juicy. / It is creamy. | tag `why`, written as a whole clause with `{it} {be}` at sentence start |

So the longer sentences are written like this:

- *I like {en}. {it} {be} {tag:why}.*
  - With fruit, `plural: true` makes this *I like grapes. They are sweet.*
  - With drinks, which are uncountable singulars, it makes *I like tea. It is warm.*
- *This is my {en}. {tag:he} is {tag:adj}.*
- *Let's go {tag:go}! We can {tag:can}.*

**Rejected: a `{he}` placeholder with a `gender` field on the item.** It is the cleaner
format in the long run, and it is code: a new field, a schema change and a renderer branch.
It would break the phase's own rule over one word in one lesson. If a second lesson ever
needs pronouns, that is when to promote the tag.

**Rejected: a grammar rule for "go home".** *home* and *school* take no article for
reasons the engine cannot see. Writing the phrase on the item is what the format already
does for irregular articles (`"article": "an"`).

### D136: Fruit is one topic whose parts are her halves, and the whole topic's extras live in part `b`

- `parts`:
  - `a` = oranges, pears;
  - `b` = grapes, watermelons.
- The whole topic is lesson 2.
- Ask & Answer, This or That and Talk Time are declared `only: ["b"]`. Lesson 2 has these
  exercises; 2A and 2B do not.

**The trade-off.** The format cannot say "whole topic only": `only` names parts, and the
whole topic carries everything (lesson-size, *The whole topic carries everything*). So
placing them in `b` means the second-half sitting gets three exercises that the teacher's
own 2B does not have. They belong there more than anywhere else, because `b` is the only
part that carries all four fruits, so their phrases can quote any of them.

**Rejected: a reserved `only: ["whole"]`.** It is a small change to `narrow` and its
validation, and it is code. It is listed as a Phase 2 candidate.

**Rejected: leaving the extras out entirely.** That makes the whole topic poorer than her
lesson 2 in order to make part `b` match her 2B exactly. The whole topic is the lesson she
actually wrote, and her halves are cuts of it.

### D137: Listening in Fruit offers two choices at every size

Part `a` carries two words, so a `listen` asking for four fails validation in that sitting.
The block declares `choices: 2`. That is also what her 2A and 2B do: each round offers
both of that half's fruits.

**Rejected: two `listen` blocks**, one with 2 choices (`only: ["a"]`) and one with 4
(`only: ["b"]`). The whole topic would then carry both, and the child would play the same
exercise twice in one lesson.

### D138: Family is split 4 + 2: the family at home, then the grandparents

- `home` = mom, dad, brother, sister.
- `grand` = grandma, grandpa. It carries all six and revises them.

Her page has no halves, and six words is over the cap, so the split is ours.

**Why 4 + 2:**

- The first sitting gets the four words a child needs to talk about the people they live
  with.
- The first sitting still carries enough words for a 4-choice `listen` and a 4-choice clue
  quiz.
- The second part, small as it is, revises all six and so is never thin.

**Rejected: 3 + 3.** Any 3 + 3 split breaks up a pair: mother and father, or brother and
sister. It also leaves the first part one word short of a 4-choice listen.

This is the one content decision in the phase that the teacher is most likely to want to
reverse. Reversing it means editing the `parts` arrays and nothing else.

### D139: Clue riddles are chosen so they do not depend on the drawing

Her Clue Detective clues come two per word, and half of them describe *her* pictures:
grandpa "wears yellow clothes and has a moustache", sister "wears an orange skirt". A `tag`
holds one clue per word, so the file keeps the one that is true of any drawing:

| Word | Clue |
|---|---|
| grandpa | He does tai chi in the park. |
| grandma | She waters the flowers. |
| brother | He is a boy. He plays soccer with a ball. |
| sister | She is a girl. She likes drawing. |
| mom | She cooks dinner for the family. |
| dad | He goes to work every day. |

Sister's is the exception. Both of her clues describe appearance ("long brown hair", "an
orange skirt"), so neither survives a picture we did not draw. Hers is written new, in the
same shape as her brother's. (An earlier draft kept "long brown hair" and had the drawing
match it; that went with D144.)

Places' clues need no such care, because they describe what you do there ("You can see
elephants and zebras here.").

### D140: Which Pattern? is a `sort`, with buckets that do not give the answer away

- `by: "pattern"`, with three buckets:
  - `the` → *Let's go to the …*
  - `to` → *Let's go to …*
  - `none` → *Let's go …*
- Each bucket's emoji is a neutral marker (1️⃣ 2️⃣ 3️⃣), not a place. A 🏠 on the last
  bucket would answer the question for the child.
- All three buckets fill: the park and the zoo, then school, then home.

### D141: Dialogues become `phrases` blocks, one per exercise of hers, titled after it

Each of her dialogue exercises becomes a `phrases` block with her title and her lines:

- Ask & Answer;
- Is This Your…?;
- Do You Want To Go…?;
- the role-play (Fruit Stand, Drinks Café, Family Photo, Plan Our Day);
- This or That;
- Talk Time.

Each one replaces itself when its Phase 2 block arrives. Keeping them separate means a
Phase 2 change swaps one block for another and does not split a merged list apart.

- **Lines that quote words follow the part they quote.** Fruit `a` quotes oranges and
  pears, `b` quotes grapes and watermelons (lesson-size, *Each part keeps its own
  phrases*).
- **Talk Time keeps only her level-1 questions.** Levels 2 and 3 are follow-ups to the
  child's own answer, and a flat list would present them out of context.

**Rejected: one `phrases` block per topic that holds every dialogue.** It reads as a wall
of sentences, and it loses her exercise titles, which are how she navigates a lesson.

### D142: Drinks takes all four pictures from one set, milk and water included

`drinks/milk` and `drinks/water` could have been Food's drawn glasses, copied. They are not:
under D144 the other two drinks come from Fluent Emoji, and a lesson whose four cards are
two drawings and two emoji-illustrations looks like two lessons. All four come from the
same set. Food keeps its own drawings, untouched.

Recordings are unaffected either way: "milk" and "water" are already recorded lines, and a
clip is keyed by its line, not by its lesson.

### D143: Fruit shows several pieces, because the word is plural

The cards say *oranges*, so the picture shows three oranges, not one. A single orange
under the word *oranges* teaches the wrong number.

- Oranges are three tangerines, pears two, watermelons two slices; grapes are already a
  bunch.
- `"orange"` as an item id does not clash with the colour lesson's `orange`, because
  pictures are keyed `<topic>/<item>`.

### D144: The four topics' pictures are Fluent Emoji, not generated drawings

Every word in these topics is plain and concrete: a pear, a mom, a school. An openly
licensed set already draws all of them, so a generated drawing per word (one paid Gemini
call each, about a minute) buys nothing but house style.

- **Source:** Microsoft Fluent Emoji, the *Color* SVGs, under the MIT license.
  `THIRD_PARTY_NOTICES.md` carries the notice and says which file came from which emoji.
- **Format:** each picture is rendered headless onto the same 512×512 white square as every
  other picture and saved as JPEG, so `public/pics/<topic>/<item>.jpg` and the manifest
  work unchanged. Average size is about 24 KB.
- **Composites:** where one emoji does not say the word, two are combined:
  - park = a tree and a playground slide. Fluent's "national park" is mountains and a
    lake, which is not where a child goes to play.
  - zoo = a giraffe and an elephant (her page's own 🦒🐘).
- **People** use the light skin tone throughout, so the six read as one family.
- **The recipes stay in `SUBJECTS`**, because the script refuses an item without one. They
  are marked as unused: deleting one of these pictures would make the script draw a
  replacement in the house style, which would not match its topic.

**The trade-off.** These four topics look different from the drawn ones: soft
three-dimensional illustrations, not flat drawings with a dark outline. Inside a lesson
the set is consistent; on the home screen the difference shows. This was chosen knowingly
over sixteen generated drawings.

**Rejected: images found by web search.** The app is published and its repository is
public. A picture without a licence that allows that cannot ship, however ordinary the
watermelon.

**Rejected: OpenMoji and Twemoji.** OpenMoji is CC BY-SA, whose share-alike reaches further
than a children's lesson needs to argue about. Twemoji is flat and small, and reads as an
emoji rather than a picture at card size.

## Risks / Trade-offs

- **[Four topics in a second visual style (D144).]** → The style is consistent inside
  each topic. If the difference on the home screen matters to the teacher, the house-style
  recipes are already written and redrawing a whole topic is one script run.
- **[Brother and dad look alike in Fluent.]** → They differ in age and in hair, and every
  exercise that shows both also says the word aloud. If the teacher finds them confusable,
  this is the first picture to replace.
- **[2A becomes a lesson of exercises over two words.]** With only two words, `listen` and
  `scramble` are near-trivial. → This is what her 2A is, and the whole topic exists for the
  child who needs more.
- **[Part `b` carries three exercises her 2B does not have (D136).]** → This is recorded
  as a deliberate choice, and the reserved `only: ["whole"]` is a named Phase 2 candidate.
- **[The phrases stand-ins may be mistaken for the finished exercises.]** → The spec names
  them as carried-as-phrases, and the README and PLAN §9 say Phase 2 replaces them.
- **[Tag values hold whole English clauses]** (`why`, `can`, `clue`), so they bypass the
  template's grammar helpers. → They are written once, by hand, and each one is spoken in
  full in the check pass of the tasks.

## Migration Plan

Nothing migrates. Four lesson files, four picture folders and `THIRD_PARTY_NOTICES.md` are
added, and no existing file or route changes. To roll back, delete them.

## Open Questions

- **Should Fruit and Drinks carry Japanese glosses?** Her two pages for them do not; her
  Family and Places pages do. This change writes them (as it did for Shapes), and removing
  them is a one-field edit per item.
- **Should Talk Time's level-2 and level-3 questions come back?** They could return as a
  second `phrases` block before Phase 2 builds the question ladder. That depends on how
  level 1 goes in a real lesson.
