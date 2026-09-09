/**
 * The whole data model, shared by the browser and — from the next change onward —
 * by the Cloudflare Durable Object. Nothing in `src/shared` may import React or
 * touch the DOM; `src/shared/purity.test.ts` enforces that.
 */

// ── Lesson content ───────────────────────────────────────────────────────────

export type Audience = 'kids' | 'teens' | 'adults'

/** A face is one way of showing an item: its picture, its word, its gloss, a tag. */
export type Face = 'emoji' | 'en' | 'l1' | 'example' | `tag:${string}`

export type Item = {
  id: string
  en: string
  emoji: string
  /** First-language gloss, e.g. the Japanese word plus its romanisation. */
  l1?: { word: string; romaji?: string }
  example?: string
  /**
   * Grammar is declared, not guessed (design D5): "an hour" and "a unicorn" defeat
   * the vowel-letter rule, and English plurals are not a suffix test.
   */
  plural?: boolean
  article?: 'a' | 'an' | 'none'
  tags?: Record<string, string>
}

/** How a block chooses the items it works with. */
export type ItemRef =
  | { select: 'all' }
  | { select: 'ids'; ids: string[] }
  | { select: 'tag'; tag: string }

export type SentenceLevel = {
  /** What the button says, e.g. "It is a…". */
  label: string
  /** Placeholders: {en} {article} {it} {be} {this}. */
  template: string
}

export type Bucket = { key: string; label: string; emoji: string }

type BlockBase = { id: string; title: string; hint?: string }

/**
 * `speak` is what a block says aloud about one item, as a template: "A {en} says
 * {tag:sound}!". Without it a block speaks the plain English word, which is right for
 * vocabulary and wrong for a themed exercise whose whole point is the tag.
 */
export type Block =
  | (BlockBase & { type: 'cards'; items: ItemRef; front: Face; back: Face[]; speak?: string })
  | (BlockBase & {
      type: 'match'
      items: ItemRef
      left: Face
      right: Face
      count?: number
      /** Spoken when a pair is completed — the teaching moment, not on every tap. */
      speak?: string
    })
  | (BlockBase & { type: 'sentence'; items: ItemRef; levels: SentenceLevel[] })
  | (BlockBase & { type: 'sort'; items: ItemRef; by: string; buckets: Bucket[] })
  | (BlockBase & { type: 'listen'; items: ItemRef; choices?: number })
  | (BlockBase & { type: 'tpr'; items: ItemRef; prompt: string })
  | (BlockBase & { type: 'finish'; message: string })

export type BlockType = Block['type']
export type BlockOf<T extends BlockType> = Extract<Block, { type: T }>

export type Lesson = {
  id: string
  title: string
  emoji: string
  audience: Audience
  /** Language of the gloss shown beside the English, or null for none. */
  l1: 'ja' | null
  items: Item[]
  blocks: Block[]
}

// ── Runtime state ────────────────────────────────────────────────────────────

export type Side = 'a' | 'b'

export type CardsState = { order: string[]; flipped: string[] }
export type MatchState = {
  orderA: string[]
  orderB: string[]
  selected: { side: Side; id: string } | null
  paired: string[]
  /** Last refused pair, cleared by the next action. Both screens see the mistake. */
  wrong: { a: string; b: string } | null
}
export type SentenceState = {
  item: string | null
  level: number
  /** Highest level ever reached, so stepping back down never un-earns progress. */
  maxLevel: number
}
export type SortState = {
  order: string[]
  selected: string | null
  placed: Record<string, string>
  wrong: { item: string; bucket: string } | null
}
export type ListenState = {
  order: string[]
  /** Index into `order` of the word currently being asked. */
  index: number
  answered: string[]
  wrong: string | null
}
export type TprState = { order: string[]; index: number; started: boolean }
export type FinishState = { seen: boolean }

export type BlockStateMap = {
  cards: CardsState
  match: MatchState
  sentence: SentenceState
  sort: SortState
  listen: ListenState
  tpr: TprState
  finish: FinishState
}

export type BlockState = BlockStateMap[BlockType]

export type LessonState = {
  /** Increments on every applied action; unchanged when an action is refused. */
  v: number
  lessonId: string
  slide: number
  /** Drawn once at creation — the only impure moment in the model (design D3). */
  seed: number
  /** Only blocks the learner has actually reached (design D2). */
  blocks: Record<string, BlockState>
  /** Per-block reset generation, feeding the shuffle so a reset re-orders. */
  resets: Record<string, number>
}

// ── Actions ──────────────────────────────────────────────────────────────────

export type Action =
  | { t: 'nav'; slide: number }
  | { t: 'reset'; block: string }
  /** cards: flip · listen: answer · tpr: advance past `target` · sentence: choose item */
  | { t: 'tap'; block: string; target: string }
  /** match: side a/b of the pair · sort: 'a' an item, 'b' a bucket key */
  | { t: 'pick'; block: string; side: Side; target: string }
  | { t: 'level'; block: string; level: number }

// ── Participants ─────────────────────────────────────────────────────────────

/**
 * Which half of the lesson a participant is holding. The room decides this, never the
 * client (design D12).
 *
 * It lives here rather than in `protocol.ts` because a stroke carries the role that made
 * it, and the data model may not import the wire format. `protocol.ts` re-exports it, so
 * every existing import of `Role` from there still resolves.
 */
export type Role = 'teacher' | 'student'

// ── Ink ──────────────────────────────────────────────────────────────────────

/**
 * The board's coordinate grid: a point is a pair of integers in `[0, INK_GRID)`, being a
 * fraction of the exercise stage quantised to 12 bits (design D105).
 *
 * Integers rather than fractions because the stage is at most about a thousand pixels
 * across, so a twelfth of a pixel is already finer than anything an eye or a mouse can
 * resolve — and because integers delta-encode to one or two digits where floats do not.
 * The stage is laid out to a fixed reference width and scaled (design D103), so the same
 * pair names the same content on both screens.
 */
export const INK_GRID = 4096

export type Point = { x: number; y: number }

/**
 * One continuous mark, from the pen going down to it coming up. The smallest thing the
 * board holds: strokes are added, removed and undone whole, never split or trimmed
 * (spec `shared-drawing`).
 */
export type Stroke = {
  id: string
  /** Who drew it. Decides its colour, and what undo and a student's clear may touch. */
  by: Role
  colour: string
  width: number
  points: Point[]
  /**
   * False while the stroke is still being drawn and arriving in parts (design D106). An
   * unfinished stroke is shown and relayed but never persisted, and is dropped if the
   * participant drawing it disconnects.
   */
  done: boolean
}

/**
 * The marks of a lesson, keyed by block id — so a mark belongs to the exercise it was
 * made on, a reset does not disturb it, and changing the room's lesson discards it with
 * the rest of that lesson (design D109).
 *
 * Deliberately not part of `LessonState`: ink never passes through the reducer and never
 * enlarges the state snapshot broadcast on every tap (design D101).
 */
export type Board = Record<string, Stroke[]>

/** What can be done to a board. Each names the block it applies to; nothing is global. */
export type InkOp =
  /**
   * Adds `stroke`, or appends its points to the stroke already carrying that id — which
   * is how a long stroke arrives in ordered parts (design D106).
   */
  | { t: 'ink'; block: string; stroke: Stroke }
  | { t: 'ink-erase'; block: string; ids: string[] }
  | { t: 'ink-undo'; block: string }
  | { t: 'ink-clear'; block: string }
