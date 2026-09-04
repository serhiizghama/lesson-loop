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
