## Context

See `proposal.md` for why. The four pages share one template and differ only in a `D` data
object: title, emoji, two named halves, and for each word `en`, `ja`, `e`, `s` (sentence) and
`sj` (Japanese sentence).

A trial conversion was run before this design, on a scratch copy of `HEAD`:

- 56 new test cases appeared automatically, one set per playable size, and the suite went
  from 1158 to 1214 passing with no test edited.
- `tsc` on the root project and `vite build` were clean. The worker project was not checked.
- `npm run audio` recorded 120 clips in about a minute and added about 0.3 MB.

That trial had no pictures, no romaji and placeholder prompts. It did not include the
sentence cards of D159, and it did not look at a screen.

All 40 Fluent Emoji assets named below (39 pictures, one of them built from two assets) were
confirmed to exist in the upstream repository.

## Goals / Non-Goals

**Goals:**

- Four topics that play at all twelve sizes, with no app code changed.
- Every word's picture says that word.

**Non-Goals:**

- The `spell` block. It is the next change, and nothing here prepares for it.
- A repeatable Fluent render script in the repository (D162).
- A commit or a deploy. Both wait for an explicit request.

## Decisions

### D157: One block sequence, written four times

Every topic has the same six exercises and the closing slide, all with `select: new`:

| id | type | Her exercise | Key fields |
|---|---|---|---|
| `learn` | `cards` | Look and learn | `front: emoji`, `back: [en, l1]` |
| `hear` | `listen` | Listen and pick | `choices: 3` |
| `pairs` | `match` | Match it | `left: en`, `right: emoji`, `count: 5` |
| `meaning` | `cards` | the 日本語 hint | D159 |
| `build` | `scramble` | Build the sentence | `template: {tag:s}` |
| `say` | `tpr` | Say it! | `prompt: {tag:say}` |
| `done` | `finish` | — | |

`select: new` makes each part exercise only its own five words, which is what her Lesson 1
and Lesson 2 tabs do, and the whole topic then covers all ten, which is her Review tab.

**Rejected: later parts revising the earlier half**, as Animals does with `select: all`. That
is a good idea of ours, but her pages deliberately keep the halves apart and put revision in
Review. The teacher already chooses revision by opening the whole topic.

### D158: Every word carries its sentence in a tag

Each item has `tags.s` (her sentence), `tags.sj` (her Japanese sentence), `tags.say` (D160) and
`example` (the same as `s`). `scramble` reads `{tag:s}`.

**Rejected: a frame per topic with `{article}`.** *I wear {article} {en}.* works for most of
Clothes, but not for *She wears a dress*. Weather has no shared frame at all: seven words take
*It is …*, and rainbow, thunder and umbrella take other verbs. One uniform mechanism is easier
to read than three.

Grammar fields stay correct even though these blocks do not read them, so a later block can:
`plural: true` on pants, shoes, socks, gloves, boots and scissors; `article: "none"` on the
weather adjectives and thunder. Her wording is kept as written, including *She* and *He*.

### D159: Her Japanese sentences are a second `cards` block

`meaning` is `cards` with `front: emoji`, `back: [tag:s, tag:sj]` and `speak: {tag:s}`, placed
directly before `build`, the exercise where her page offers the hint. `cardsSpeech` speaks
only `speak`, so the Japanese is never read by an English voice. The line is the same one
`scramble` speaks, so it needs no extra clip.

If the teacher does not want this block, `meaning` is removed and `tags.sj` stays in the data,
unshown, with D-64 updated to say so.

**Rejected on screen: the sentence on the card's front** (`front: tag:s`, `back: [tag:sj]`),
which was this design's first version. A card's front is set for a picture, at 2.6rem, and task
1.6 showed the longer sentences filling the card and `notebook.` running past its edge. Fixing
that means a view change. The first version's fallback was to remove the block, but that would
have left her Japanese sentences unshown, when moving the sentence to the back fits with no
code.

**Rejected: the Japanese sentence on the vocabulary card's back.** The back already holds the
word, the gloss and the romaji, and a fourth, longer line would crowd exactly the card a child
looks at first.

**Rejected: a 日本語 toggle in `scramble`.** It is the faithful option, but it is a new field,
a view change and synced state, for a change whose point is to be data only. It can come later
if she misses it.

### D160: Say it! is one fixed prompt per word

`tpr` over a `say` tag, with one of her six prompts written out in full for each word:

- **A** Say "{en}" three times!
- **B** Say "{en}" very quietly. Now very loudly!
- **C** Point to something like this, or draw it in the air. Say "{en}".
- **D** Say the sentence: "{s}"
- **E** Ask your teacher: "What is this?" Then answer: "{en}".
- **F** Make your own sentence with "{en}".

| Topic | Assignment |
|---|---|
| Clothes | shirt A, pants E, shoes C, socks B, hat D · dress F, jacket C, gloves A, scarf E, boots B |
| At Home | bed A, door C, window D, sofa B, TV E · house E, bath B, key C, garden F, fridge A |
| School | pencil C, pen A, book E, notebook B, bag D · ruler C, scissors A, chair E, teacher D, clock B |
| Weather | sunny A, rainy D, cloudy B, windy F, hot A · snowy B, cold D, rainbow C, thunder A, umbrella E |

The assignment is by hand because not every prompt suits every word. *What is this?* has no
good answer of "sunny", and there is nothing to point at for "hot", so the weather adjectives
never get C or E. Prompt A is an instruction only: nothing counts the three times, so D-39 and
D-52 are not reopened.

**Rejected: a random draw**, as on her page. It needs a new mechanic, closest to the `wheel` in
the backlog, and D-52 already declined to approximate a wheel.

**Rejected: `talk` or `phrases`.** `talk` climbs levels that this material does not have, and
`phrases` takes literal lines with no picture for the word.

### D161: Words, romaji and topic metadata

Glosses are her kana, unchanged. Romaji follows the existing files: `ou` for a long o
(`boushi`), and a doubled vowel for katakana ー (`buutsu`).

| Topic (id, emoji) | Part 1 | Part 2 |
|---|---|---|
| Clothes (`clothes`, 👕) | shirt *shatsu*, pants *zubon*, shoes *kutsu*, socks *kutsushita*, hat *boushi* | dress *wanpiisu*, jacket *jaketto*, gloves *tebukuro*, scarf *mafuraa*, boots *buutsu* |
| At Home (`home`, 🏠) | bed *beddo*, door *doa*, window *mado*, sofa *sofa*, TV *terebi* | house *ie*, bath *ofuro*, key *kagi*, garden *niwa*, fridge *reizouko* |
| School (`school`, 🎒) | pencil *enpitsu*, pen *pen*, book *hon*, notebook *nooto*, bag *kaban* | ruler *jougi*, scissors *hasami*, chair *isu*, teacher *sensei*, clock *tokei* |
| Weather (`weather`, 🌦️) | sunny *hare*, rainy *ame*, cloudy *kumori*, windy *kaze ga tsuyoi*, hot *atsui* | snowy *yuki*, cold *samui*, rainbow *niji*, thunder *kaminari*, umbrella *kasa* |

Part ids and titles follow Food's pattern, with her names (`Clothes 1 · Everyday Clothes`):
`everyday`/`warm`, `inside`/`around`, `things`/`classroom`, `today`/`more`. Part emoji is the
first word's, except At Home part 2, which uses 🔑. Item ids are the lowercase English word, so
`TV` has id `tv` and still shows as *TV*.

`teacher`'s `emoji` changes from her 🧑‍🏫 to 👩‍🏫, to match *She is my teacher.* `fridge` keeps
her 🧊 as the required field, which is only a fallback once the picture exists; task 2.3 checks
that the picture wins.

### D162: Thirty-nine Fluent pictures, rendered from a scratch folder

As in D144: *Color* SVGs under MIT, rendered headless onto a 512×512 white square, saved as
JPEG under `public/pics/<topic>/<item>.jpg`.

| Topic | Fluent asset per word |
|---|---|
| Clothes | shirt `T-shirt`, pants `Jeans`, shoes `Running shoe` ×2, socks `Socks`, hat `Womans hat`, dress `Dress`, jacket `Coat`, gloves `Gloves`, scarf `Scarf`, boots `Womans boot` ×2 |
| At Home | bed `Bed`, door `Door`, window `Window`, sofa `Couch and lamp`, TV `Television`, house `House`, bath `Bathtub`, key `Key`, garden `Deciduous tree` + `Tulip`, fridge: see D163 |
| School | pencil `Pencil`, pen `Pen`, book `Open book`, notebook `Notebook`, bag `Backpack`, ruler `Straight ruler`, scissors `Scissors`, chair `Chair`, teacher `Woman teacher` (light tone, D144), clock `One oclock` |
| Weather | sunny `Sun`, rainy `Cloud with rain`, cloudy `Cloud`, windy `Dashing away`, hot `Hot face`, snowy `Snowflake`, cold `Cold face`, rainbow `Rainbow`, thunder `Cloud with lightning and rain`, umbrella `Umbrella` |

Plural words show two where the emoji shows one (shoes, boots), following D143. `Socks` and
`Gloves` already show a pair.

The render is headless Playwright, run from the session's scratch folder and not added to
`package.json`. No visible browser is opened. A recipe goes into `SUBJECTS` for every item
because `npm run pictures` refuses an item without one; the new block carries the same
"not drawn" comment as the previous four topics.

**Rejected: drawing all forty in the house style through Gemini.** That is forty paid calls of
about a minute each, for words as plain as a pen, and D144 already settled this.

**Rejected: committing a render script.** It would bring Playwright into the dependencies for
something run once per batch. The recipe above is enough to repeat it.

### D163: The fridge is our own SVG, with Gemini as the fallback

Unicode has no fridge and Fluent therefore has none. The picture is a small hand-written SVG in
the same soft, rounded look as its neighbours: a two-door white fridge seen from the front. It
is rendered like the others, with its source in `.pics-src/home-fridge.svg`, and listed in
`THIRD_PARTY_NOTICES.md` as ours rather than Microsoft's.

If it does not read as a fridge on the contact sheet of task 2.2, delete the JPEG and run
`npm run pictures`: the recipe (*a small white two-door kitchen fridge, seen from the front*)
makes one Gemini drawing.

**Rejected: Gemini first.** The house style has thick navy outlines and would be the one flat
picture among nine soft ones in its topic. It also costs a paid call.

**Rejected: keeping her 🧊.** A child learning *fridge* from an ice cube has learned the wrong
thing.

**Rejected: another Fluent emoji for the kitchen.** None shows a fridge.

### D164: Her pages move to `docs/reference/`

`.wrangler/` belongs to Wrangler and is ignored by git, so it can be wiped at any time.
`docs/reference/` is where her earlier pages are. It is also ignored by git, so the move leaves
no trace in a diff.

## Risks / Trade-offs

- **[Spell it is missing until the next change.]** → It is named in the spec, the README and
  PLAN §9, so nobody reads the gap as a mistake.
- **[Thunder and rainy look alike]** (⛈️ and 🌧️), and the whole-topic `listen` can offer both.
  → They are her own choice of pictures, and the word is spoken. This is the first Weather
  picture to replace if it confuses a child.
- **[Pen and pencil look alike at small sizes.]** → The same answer, and the contact sheet is
  where to catch it.
- **[Eight topics now in a second visual style.]** → Accepted in D144. Each topic is consistent
  inside itself.
- **[Romaji and prompt assignments are ours, not hers.]** → D161 and D160 lay them out as
  tables so she can review them in one read, and changing one is a one-field edit plus
  `npm run audio`.
- **[Sentence cards are an exercise she did not design.]** → They carry her own Japanese
  sentences. D159 names the removal path if they crowd the screen or she prefers them gone.
- **[A topic with the id `home`.]** → Sizes become `home/inside` and `home/around`, and pictures
  go in `public/pics/home/`. No route or folder uses that name; the guide's `home.jpg` lives
  elsewhere. The trial played all sizes without conflict.

## Migration Plan

Nothing migrates. Four lesson files and four picture folders are added, and generated manifests
are regenerated. To roll back before any deploy, delete those files and regenerate. A published
app gets the topics only on the next deploy, which is outside this change.

## Open Questions

- **Will the teacher want changes to the romaji, the prompt assignments or the sentence cards?**
  Each is a data edit and changes nothing else in this plan. The items to show her are D159,
  D160, D161 and the fridge picture.
