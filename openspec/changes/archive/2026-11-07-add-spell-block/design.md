## Context

See `proposal.md` for why. `scramble` is the closest existing block: it works through items one
at a time, takes tokens in order through `pick`, refuses a wrong one in place, and moves on through
`tap`. Its shuffled tokens are derived from the seed rather than stored (D131), because `reduce`
has no seed and both screens must agree. Spelling has the same shape, with letters for words.

What her page does, read from `docs/reference/lesson_clothes.html`: a picture and 🔊, a slot area,
and shuffled letter tiles. Letters go down in any order, a tap on the slot area removes the last
one, and a full attempt is checked: right plays the word and moves on after a second; wrong shows
"Almost! Try again." and wipes the attempt. It reshuffles so the tiles never already spell the word.

## Goals / Non-Goals

**Goals:**

- A `spell` block that any lesson can use with no lesson-specific code.
- Her four topics play it at all twelve sizes, with no new recording or picture.

**Non-Goals:**

- The missing-letter variant in the PLAN backlog. None of her pages has it, and it stays there.
- Spelling in the other ten topics (D171).
- A commit or a deploy. Both wait for an explicit request.

## Decisions

### D165: A block type of its own, with its own small reducer

`spell` is a new member of `Block`, with `spellLogic`, `SpellView` and `SpellState`. The block
declares only `items`. `SpellState` has the same shape as `ScrambleState`:
`{ order, index, placed, wrong }`.

**Rejected: a `by: "letter"` mode on `scramble`.** It looks cheaper, but every part would branch on
the mode: the validation rule, what is spoken, how the line joins, the tile size, the key's title.
It would also break the guide, whose table has one line per block type: "Build it" cannot also
describe spelling.

**Rejected: extracting a shared "assembly" reducer and moving `scramble` onto it.** The reducer is
about twenty lines and this would be its second user. Refactoring a shipped block to save them
risks an exercise that works, for no change the teacher can see. `spell` does reuse `scrambleUsed`,
which already does exactly what repeated letters need.

### D166: Letters go down in order, and a wrong one is refused in place

This is the mechanic of `scramble` rather than of her page. `pick` with side `a` carries the letter
itself, because `reduce` has no seed and cannot resolve a tile's position. A letter that is not next
sets `wrong` and changes nothing else. Any copy of a repeated letter is accepted, because the match
is by text.

Her undo disappears with this, because only correct letters are ever placed. Her *Almost! Try
again.* becomes the tile's existing wrong state, with no words.

**Rejected: her mechanic, any order and a check at the end.** Wiping a whole attempt removes progress
already earned, which "Feedback is immediate and never punitive" forbids. It would also be the one
tile exercise in the app that behaves differently. The cost is that a child gets a tile-by-tile hint
rather than having to hold the whole word in mind; the teacher decides whether that matters (D-66).

**Rejected: a typed answer.** The app is tap-driven, and a typed word is a keyboard problem on a
tablet before it is a spelling problem.

### D167: Letters are derived, and never already spell the word

`spellLetters` shuffles `Array.from(item.en)` with `seedFor(seed, 'letters', state.index)`. Nothing
is stored, as in D131. If the shuffle happens to spell the word, the result is rotated by one.
Rotation changes the order of any word that has at least two different letters, and it needs no loop
and no second seed, so it stays pure and both screens agree.

Without this, *TV* would arrive already spelled in about half of all runs.

**Rejected: reshuffling in a loop**, as her page does. It needs a bound and a sequence of seeds, for
a result rotation gets in one step.

**Rejected: storing the letters in state.** It would make this the first such exercise whose state
cannot be rebuilt from the seed.

### D168: What is on screen and what is said

From top to bottom: the picture; a 🔊 control; one place per letter, filled as letters land; the
letter tiles; and, once a word is whole and is not the last, *Next word →*.

- **No word on screen until it is spelled**, not even the Japanese gloss, as on her page. Otherwise
  the exercise is copying.
- **One place per letter.** Her slot area does not show the length. Showing it helps a child with
  *scissors* and gives away nothing the tiles do not, since all the letters are already offered.
- **Spoken:** the word when it is finished (subject to the lesson's sound, like every unasked line),
  and the word when 🔊 is pressed (`'demand'`, so it works with the sound off). Nothing on arrival,
  as on her page. No letters either, as on her page: they would need clips of their own, and
  saying the letter names is the teacher's part.
- **A silent device still works.** The picture carries the word, so the exercise never depends on
  sound, and the control needs none of `listen`'s no-voice handling. Those exist because `listen`
  has no other way to ask.
- `speakableLines` returns `item.en` for each selected item, so these are lines that exist already.

### D169: A letter tile is 7 rem, because the stage scales

A tile is `min-height: var(--tap)`, which is 3.25 rem. That is fine at full size, but the stage scales
as a whole, which puts a default tile at about 21 px in a 380 px window. Spec requires a target a
finger can use where the learner meets it, and `stage.ts` puts that at 44 px.

The stage is given less than the window: `.split` keeps 0.75 rem on each side, so a 380 px window
leaves 356 px and a scale of 0.405. A letter tile is therefore 7 rem square: 112 px at the reference
width and 45.3 px at 380 px, with a large letter in it. This design first said 6.5 rem, working from
the window's width; on screen that measured 43.3 px at 390 px, below the floor, and task 3.4 caught it.

An eight-letter word (*scissors*, *notebook*, *umbrella*) takes 8 × 112 px plus gaps, which is more
than the 880 px stage, so it wraps to seven tiles and one. That is acceptable, because a taller
exercise makes the board taller on both screens.

**Rejected: keeping the default tile**, as `scramble` does. A sentence's chips hold whole words and
are wider, while a one-letter tile at the default size would be the smallest target in the app.

### D170: A word that cannot be spelled is rejected, not adapted

Validation rejects a selected item whose `en` does not match `^\p{L}{2,}$`. This runs per size, like
every other cross-check, and names the block and the item.

**Rejected: stripping the space from *ice cream***, as her page's code does. A child would spell
*icecream* and be told it is right. None of her forty words has a space, so nothing is lost. If
Yummy Food ever wants this, deciding how to show a space belongs to that change.

The key's row is `label: item.en`, `value: "s c i s s o r s"`, with the same marks as `scramble`. It is
written out letter by letter because the teacher may read it aloud.

### D171: Her four topics only, in her position

Each of the four lessons gains one block with `select: new`, between `pairs` and `meaning`. That is
her order, after Match it and before anything about sentences:

`learn → hear → pairs → spell → meaning → build → say → done`

At the whole size, spelling covers all ten words, as her Review tab does.

**Rejected: adding it to the other ten topics now.** Some have words it rejects (*ice cream*), some
are built around another skill (colours, numbers), and she has not asked. Adding it is one block per
file whenever she does.

### D172: The requirement on her material is replaced rather than modified

"Spell it is absent rather than approximated" stops being true, and a `MODIFIED` requirement cannot
drop a scenario: the validator refuses it. So the requirement is `REMOVED` and `ADDED` again as "The
format covers the teacher's material", with its other text and scenarios unchanged. At archive it
goes back where the old one stood in the spec, so the file's order holds. Nothing refers to the old
name outside the spec.

**Rejected: keeping the scenario's name and changing its body.** A title saying *absent* over a body
saying *played* is a false statement in the contract.

## Risks / Trade-offs

- **[In-order placement is easier than her page's check at the end.]** → This is the teacher's call
  (D-66), and the view could change without touching the data if she wants the harder version.
- **[Tiles wrap at eight letters.]** → Checked on screen by task 3.4.
- **[The whole size is ten words spelled in a row]**, which is long for a young child. → It is what
  her Review tab does, and the teacher can move on: the arrow is never blocked by an unfinished
  exercise.
- **[The fixture needs every block type.]** Adding one shifts the exercise counts in
  `student-view.test.tsx` from 19 to 20. → Mechanical, and the tests fail loudly if missed.
- **[`tests/support/play.ts` silently skips a block type it does not know]**, so without a case for
  `spell` the playthrough test would still pass without playing it. → Task 2.6 adds the case, and its
  check proves the exercise was actually completed.
- **[A room open across the deploy.]** A room stores its slide as a number, and `spell` is inserted at
  position four, so a room on one of these four topics at that moment would land one exercise off.
  Rooms live three hours. → Deploy outside lesson time. Nothing is lost: block state is kept by id.

## Migration Plan

Nothing migrates. Lessons gain one block, and block state is created on first use. To roll back
before a deploy, revert the change. A published app gets the exercise only on the next deploy, which
is outside this change.

## Open Questions

- **Will the teacher want the harder version, with any order and a check at the end?** This is
  deferrable because it changes only the block's reducer and view, not the format or the lessons.
