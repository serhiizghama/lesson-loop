# LessonLoop

Interactive English lessons for one-on-one online teaching. A lesson is a sequence of
tap-based exercises — flip cards, matching, sentence building, sorting, listening, and
physical-response games — built from a plain JSON vocabulary list.

Everything runs in the browser. No sign-up, no database, no network calls once the page
has loaded.

> **Where this is going.** The next change puts the teacher and the student on the same
> synchronised page from two different links, with answer keys and lesson controls on the
> teacher's side only. See `docs/PLAN.md`.

## Running it

```bash
npm install
npm run dev        # http://localhost:5173
```

```bash
npm run typecheck  # tsc --noEmit
npm test           # vitest
npm run build      # production bundle in dist/
```

## Adding a lesson

Drop a JSON file into `lessons/`. Nothing else — no code, no registration, no imports.
It is picked up at build time, validated on load, and appears on the home screen.

A lesson has a vocabulary list and an ordered list of exercise blocks:

```jsonc
{
  "id": "colours",            // lowercase kebab-case, unique across lessons
  "title": "Colours",
  "emoji": "🎨",
  "audience": "kids",         // kids | teens | adults
  "l1": "ja",                 // language of the gloss, or null for none
  "items": [
    {
      "id": "red",
      "en": "red",
      "emoji": "🔴",
      "l1": { "word": "赤", "romaji": "aka" },
      "example": "It is red.",
      "tags": { "mood": "warm" } // free-form; exercises read these
    }
  ],
  "blocks": [ /* see below */ ]
}
```

### Grammar

The sentence exercise builds real sentences, so an item can declare what spelling cannot
tell it:

- `"plural": true` → *They are **eyes**.* instead of *It is a eyes.*
- `"article": "an"` → *It is **an** hour.* (the vowel-letter rule gets this wrong)
- `"article": "none"` → *It is hair.* for uncountable nouns

### Exercise blocks

Every block takes `id`, `title`, an optional `hint`, and an `items` selector — one of
`{"select":"all"}`, `{"select":"ids","ids":[…]}`, or `{"select":"tag","tag":"sound"}`.

| `type` | What the learner does | Extra fields |
|---|---|---|
| `cards` | Taps a card to reveal it and hear the word | `front`, `back` (faces), `speak` |
| `match` | Taps one side, then the other, to make a pair | `left`, `right` (faces), `count`, `speak` |
| `sentence` | Picks a word, then grows it into a sentence | `levels` (label + template) |
| `sort` | Taps an item, then the bucket it belongs in | `by` (tag), `buckets` |
| `listen` | Hears a word and taps the right picture | `choices` |
| `tpr` | Follows a spoken instruction with their body | `prompt` (template) |
| `finish` | The closing screen | `message` |

A **face** is one way of showing an item: `emoji`, `en`, `l1`, `example`, or `tag:<name>`.
A **template** fills `{en}`, `{article}`, `{it}`, `{be}`, `{this}`, `{l1}` and `{tag:<name>}`.
`speak` is a template too: the line a block says out loud about one item. Without it a
card speaks the English word and a pair says nothing beyond the tile that was tapped.

A themed exercise is never a new block type — it is an existing one reading a different
tag. "Which sound does it make" is `match` over `tag:sound`; "where does it live" is `sort`
by `habitat`; "move like this animal" is `tpr` with the prompt `{tag:move}`.

### If a lesson is wrong

Validation runs on load and in CI, and names the exact place:

```
blocks.6.buckets.2.key: no selected item has habitat = "ocean"
```

## How it is built

- `src/shared/` — the lesson format, its validation, and the pure state reducer. No React,
  no DOM: it is written to run unchanged inside a Cloudflare Worker in the next change, and
  a test enforces that.
- `src/blocks/` — one React view per exercise type.
- `src/ui/` — the shell: lesson picker, progress, navigation.
- `lessons/` — the content.

Every tap is an action; `applyAction(lesson, state, action)` is pure and deterministic, and
shuffled orders come from a seed held in the state rather than from `Math.random` at render
time. That is what will let two people on two devices see the same screen.
