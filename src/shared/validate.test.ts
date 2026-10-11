import { describe, expect, it } from 'vitest'
import { resolveItems, validateLesson } from './validate'
import type { Lesson } from './types'

function base(): Lesson {
  return {
    id: 'animals',
    title: 'Animals',
    emoji: '🐾',
    audience: 'kids',
    l1: 'ja',
    items: [
      { id: 'dog', en: 'dog', emoji: '🐶', l1: { word: '犬' }, tags: { habitat: 'farm', sound: 'Woof' } },
      { id: 'cat', en: 'cat', emoji: '🐱', l1: { word: '猫' }, tags: { habitat: 'farm', sound: 'Meow' } },
      { id: 'lion', en: 'lion', emoji: '🦁', l1: { word: 'ライオン' }, tags: { habitat: 'jungle', sound: 'Roar' } },
    ],
    blocks: [
      { id: 'vocab', type: 'cards', title: 'What is it?', items: { select: 'all' }, front: 'emoji', back: ['en'] },
    ],
  }
}

/** Deep-clones a fixture so a test can break exactly one thing in it. */
function broken(mutate: (l: Lesson) => void): Lesson {
  const lesson = structuredClone(base())
  mutate(lesson)
  return lesson
}

describe('shape validation', () => {
  it('accepts a well-formed lesson without complaint', () => {
    const result = validateLesson(base())
    expect(result.ok).toBe(true)
  })

  it('names the exact path of a missing field', () => {
    const lesson = broken((l) => {
      delete (l.items[0] as { en?: string }).en
    })
    const result = validateLesson(lesson)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors.some((e) => e.startsWith('items.0.en:'))).toBe(true)
  })

  it('rejects a face that is neither fixed nor a tag', () => {
    const lesson = broken((l) => {
      ;(l.blocks[0] as { front: string }).front = 'colour'
    })
    expect(validateLesson(lesson).ok).toBe(false)
  })

  it('rejects a value that is not a lesson at all', () => {
    expect(validateLesson(null).ok).toBe(false)
    expect(validateLesson('animals').ok).toBe(false)
  })
})

describe('cross-reference validation', () => {
  it('rejects a block referring to an unknown item, naming both', () => {
    const lesson = broken((l) => {
      ;(l.blocks[0] as { items: unknown }).items = { select: 'ids', ids: ['dog', 'dragon'] }
    })
    const result = validateLesson(lesson)
    expect(result.ok).toBe(false)
    if (result.ok) return
    const message = result.errors.join('\n')
    expect(message).toContain('"vocab"')
    expect(message).toContain('"dragon"')
  })

  it('rejects a tag selection that matches nothing', () => {
    const lesson = broken((l) => {
      ;(l.blocks[0] as { items: unknown }).items = { select: 'tag', tag: 'colour' }
    })
    const result = validateLesson(lesson)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors.join('\n')).toContain('selects no items')
  })

  it('rejects a sort bucket no item can fill', () => {
    const lesson = broken((l) => {
      l.blocks.push({
        id: 'homes',
        type: 'sort',
        title: 'Where do they live?',
        items: { select: 'all' },
        by: 'habitat',
        buckets: [
          { key: 'farm', label: 'Farm', emoji: '🏡' },
          { key: 'jungle', label: 'Jungle', emoji: '🌴' },
          { key: 'ocean', label: 'Water', emoji: '🌊' },
        ],
      })
    })
    const result = validateLesson(lesson)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors.join('\n')).toContain('no selected item has habitat = "ocean"')
  })

  it('rejects an item that cannot be sorted into any bucket', () => {
    const lesson = broken((l) => {
      l.items.push({ id: 'fish', en: 'fish', emoji: '🐟', tags: { habitat: 'ocean', sound: 'Blub' } })
      l.blocks.push({
        id: 'homes',
        type: 'sort',
        title: 'Where do they live?',
        items: { select: 'all' },
        by: 'habitat',
        buckets: [
          { key: 'farm', label: 'Farm', emoji: '🏡' },
          { key: 'jungle', label: 'Jungle', emoji: '🌴' },
        ],
      })
    })
    const result = validateLesson(lesson)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors.join('\n')).toContain('which has no bucket')
  })

  it('rejects a matching block whose items cannot render a face', () => {
    const lesson = broken((l) => {
      l.blocks.push({
        id: 'sounds',
        type: 'match',
        title: 'Sounds',
        items: { select: 'all' },
        left: 'emoji',
        right: 'tag:move',
      })
    })
    const result = validateLesson(lesson)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors.join('\n')).toContain('cannot render it')
  })

  it('rejects a physical-response prompt reading a tag some items lack', () => {
    const lesson = broken((l) => {
      l.items[0]!.tags = { habitat: 'farm', sound: 'Woof', move: 'Run like a dog!' }
      l.blocks.push({
        id: 'move',
        type: 'tpr',
        title: 'Move like me',
        items: { select: 'all' },
        prompt: '{tag:move}',
      })
    })
    const result = validateLesson(lesson)
    expect(result.ok).toBe(false)
    if (result.ok) return
    const message = result.errors.join('\n')
    expect(message).toContain('"move"')
    expect(message).toContain('"cat"')
  })

  it('rejects duplicate block ids', () => {
    const lesson = broken((l) => {
      l.blocks.push(structuredClone(l.blocks[0]!))
    })
    const result = validateLesson(lesson)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors.join('\n')).toContain('duplicate block id')
  })

  it('rejects duplicate item ids', () => {
    const lesson = broken((l) => {
      l.items.push(structuredClone(l.items[0]!))
    })
    const result = validateLesson(lesson)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors.join('\n')).toContain('duplicate item id')
  })
})

describe('spoken templates', () => {
  it('accepts a template every selected item can fill', () => {
    const lesson = broken((l) => {
      ;(l.blocks[0] as { speak?: string }).speak = 'The {en} says {tag:sound}!'
    })
    expect(validateLesson(lesson).ok).toBe(true)
  })

  it('rejects a template reading a tag an item lacks, naming both', () => {
    const lesson = broken((l) => {
      l.items[2]!.tags = { habitat: 'jungle' }
      ;(l.blocks[0] as { speak?: string }).speak = 'The {en} says {tag:sound}!'
    })
    const result = validateLesson(lesson)
    expect(result.ok).toBe(false)
    if (result.ok) return
    const message = result.errors.join('\n')
    expect(message).toContain('blocks.0.speak:')
    expect(message).toContain('"lion"')
  })
})

/** `base()` plus the two halves it could be taught in, and a block belonging to one. */
function topic(): Lesson {
  const lesson = structuredClone(base())
  lesson.parts = [
    { id: 'farm', title: 'Farm Animals', emoji: '🏡', items: ['dog', 'cat'] },
    { id: 'wild', title: 'Wild Animals', emoji: '🦁', items: ['lion'] },
  ]
  lesson.blocks.push({
    id: 'homes', type: 'sort', title: 'Where do they live?', only: ['wild'],
    items: { select: 'all' }, by: 'habitat',
    buckets: [
      { key: 'farm', label: 'Farm', emoji: '🏡' },
      { key: 'jungle', label: 'Jungle', emoji: '🌴' },
    ],
  })
  return lesson
}

describe('a topic declaring parts', () => {
  it('accepts parts and a block that names one of them', () => {
    const result = validateLesson(topic())
    if (!result.ok) throw new Error(result.errors.join('\n'))
    expect(result.lesson.parts).toHaveLength(2)
  })

  it('accepts a block selecting the words the sitting teaches', () => {
    const lesson = topic()
    lesson.blocks[0] = { ...lesson.blocks[0]!, items: { select: 'new' } } as Lesson['blocks'][number]
    expect(validateLesson(lesson).ok).toBe(true)
  })

  it('refuses a block that belongs to no part at all', () => {
    const lesson = topic()
    ;(lesson.blocks[1] as { only: string[] }).only = []
    expect(validateLesson(lesson).ok).toBe(false)
  })

  it('refuses a single part, which is no division of a topic', () => {
    const lesson = topic()
    lesson.parts = [{ id: 'farm', title: 'Farm', emoji: '🏡', items: ['dog', 'cat', 'lion'] }]
    expect(validateLesson(lesson).ok).toBe(false)
  })

  /** The message for a topic broken in exactly one way. */
  function errorsOfTopic(mutate: (l: Lesson) => void): string {
    const lesson = topic()
    mutate(lesson)
    const result = validateLesson(lesson)
    expect(result.ok).toBe(false)
    return result.ok ? '' : result.errors.join('\n')
  }

  it('names the part and the item when a part names a word the topic has not got', () => {
    const message = errorsOfTopic((l) => {
      l.parts![1]!.items.push('tiger')
    })
    expect(message).toContain('"wild"')
    expect(message).toContain('"tiger"')
  })

  it('names both parts when they claim the same word', () => {
    const message = errorsOfTopic((l) => {
      l.parts![1]!.items.push('dog')
    })
    expect(message).toContain('"dog"')
    expect(message).toContain('"farm"')
    expect(message).toContain('"wild"')
  })

  it('refuses a part that names nothing, naming it', () => {
    const message = errorsOfTopic((l) => {
      l.parts![1]!.items = []
    })
    expect(message).toContain('"wild"')
    expect(message).toContain('names no items')
  })

  it('refuses a block belonging to a part the topic does not declare, naming both', () => {
    const message = errorsOfTopic((l) => {
      ;(l.blocks[1] as { only: string[] }).only = ['nope']
    })
    expect(message).toContain('"homes"')
    expect(message).toContain('"nope"')
  })
})

describe('validation at every size a topic offers', () => {
  /**
   * The defect in the teacher's own re-cut of Animals: sound as a ten-word file, and no
   * question at all once the second half is played alone, because every one of its
   * animals lives in the same place (proposal, design D6).
   */
  function withBuckets(farmForWild: boolean): Lesson {
    const item = (id: string, habitat: string) => ({
      id, en: id, emoji: '🐾', tags: { habitat },
    })
    return {
      id: 'animals',
      title: 'Animals',
      emoji: '🐾',
      audience: 'kids',
      l1: null,
      items: [
        item('dog', 'farm'), item('cat', 'farm'),
        item('lion', 'jungle'), item('bird', farmForWild ? 'farm' : 'jungle'),
      ],
      parts: [
        { id: 'known', title: 'Known', emoji: '🐶', items: ['dog', 'cat'] },
        { id: 'wild', title: 'Wild', emoji: '🦁', items: ['lion', 'bird'] },
      ],
      blocks: [
        {
          id: 'homes', type: 'sort', title: 'Where do they live?', only: ['wild'],
          items: { select: 'new' }, by: 'habitat',
          buckets: [
            { key: 'farm', label: 'Farm', emoji: '🏡' },
            { key: 'jungle', label: 'Jungle', emoji: '🌴' },
          ],
        },
      ],
    }
  }

  it('refuses a size whose sorting exercise has only one bucket to fill, naming both', () => {
    const result = validateLesson(withBuckets(false))
    expect(result.ok).toBe(false)
    if (result.ok) return
    const message = result.errors.join('\n')
    expect(message).toContain('size "wild"')
    expect(message).toContain('farm')
  })

  it('passes once the part spreads across the buckets', () => {
    const result = validateLesson(withBuckets(true))
    if (!result.ok) throw new Error(result.errors.join('\n'))
    expect(result.ok).toBe(true)
  })

  it('checks a match against each size, not only against the file', () => {
    const lesson = topic()
    lesson.blocks.push({
      id: 'pairs', type: 'match', title: 'Matching', items: { select: 'new' },
      left: 'emoji', right: 'en', count: 3,
    })
    const result = validateLesson(lesson)
    expect(result.ok).toBe(false)
    if (result.ok) return
    // Three pairs is fine for the whole topic and for its first half, and one word too
    // many for the half that teaches only the lion.
    const message = result.errors.join('\n')
    expect(message).toContain('size "wild"')
    expect(message).toContain('"pairs"')
    expect(message).not.toContain('size "all"')
  })

  it('checks a listening exercise against each size', () => {
    const lesson = topic()
    lesson.blocks.push({
      id: 'hear', type: 'listen', title: 'Which one?', items: { select: 'new' }, choices: 3,
    })
    const result = validateLesson(lesson)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors.join('\n')).toContain('size "wild"')
  })
})

describe('resolveItems', () => {
  const lesson = base()

  it('throws on the words a sitting teaches, which narrowing should have resolved', () => {
    expect(() => resolveItems(lesson, { select: 'new' }, 'vocab')).toThrow(/"vocab"/)
  })

  it('selects every item', () => {
    expect(resolveItems(lesson, { select: 'all' }).map((i) => i.id)).toEqual(['dog', 'cat', 'lion'])
  })

  it('selects only items carrying a tag', () => {
    const jungle = resolveItems(lesson, { select: 'tag', tag: 'habitat' })
    expect(jungle).toHaveLength(3)
    const partial = resolveItems(
      { ...lesson, items: [...lesson.items, { id: 'ghost', en: 'ghost', emoji: '👻' }] },
      { select: 'tag', tag: 'habitat' },
    )
    expect(partial.map((i) => i.id)).toEqual(['dog', 'cat', 'lion'])
  })

  it('preserves the declared order of an explicit list', () => {
    const picked = resolveItems(lesson, { select: 'ids', ids: ['lion', 'dog'] })
    expect(picked.map((i) => i.id)).toEqual(['lion', 'dog'])
  })
})

describe('the three exercises added for Shapes', () => {
  /** `base()` has dog and cat on the farm and the lion in the jungle — two of everything. */
  function withBlock(block: unknown): unknown {
    const lesson = structuredClone(base()) as unknown as { blocks: unknown[] }
    lesson.blocks.push(block)
    return lesson
  }

  function errorsOf(block: unknown): string {
    const result = validateLesson(withBlock(block))
    expect(result.ok).toBe(false)
    return result.ok ? '' : result.errors.join('\n')
  }

  const phrases = { id: 'talk', type: 'phrases', title: 'Say it', lines: ['What is it?'] }
  const quiz = {
    id: 'guess', type: 'quiz', title: 'Which one?', items: { select: 'all' },
    ask: 'tag:sound', show: 'emoji', count: 3,
  }
  const describe_ = {
    id: 'tell', type: 'describe', title: 'Tell me', items: { select: 'all' },
    questions: [
      { label: 'What is it?', face: 'en' },
      { label: 'Where does it live?', face: 'tag:habitat' },
    ],
    sentence: 'The {en} lives on the {tag:habitat}.',
  }

  it('accepts all three when they are well formed', () => {
    expect(validateLesson(withBlock(phrases)).ok).toBe(true)
    expect(validateLesson(withBlock(quiz)).ok).toBe(true)
    expect(validateLesson(withBlock(describe_)).ok).toBe(true)
  })

  it('rejects a phrase list with no phrases in it', () => {
    expect(errorsOf({ ...phrases, lines: [] })).toContain('lines')
  })

  it('rejects an empty phrase', () => {
    expect(errorsOf({ ...phrases, lines: ['What is it?', ''] })).toContain('lines.1')
  })

  it('rejects a quiz asking by a tag an item does not carry', () => {
    const message = errorsOf({ ...quiz, ask: 'tag:move' })
    expect(message).toContain('blocks.1.ask:')
    expect(message).toContain('"dog"')
  })

  it('rejects a quiz that asks and shows by the same face', () => {
    const message = errorsOf({ ...quiz, ask: 'emoji', show: 'emoji' })
    expect(message).toContain('prints the answer in the question')
  })

  it('rejects a quiz offering more choices than it has items', () => {
    expect(errorsOf({ ...quiz, count: 9 })).toContain('offers 9 choices but selects 3 items')
  })

  it('rejects a description asking about a face every item answers the same way', () => {
    const lesson = structuredClone(base())
    for (const item of lesson.items) item.tags = { ...item.tags, habitat: 'farm' }
    const result = validateLesson({ ...lesson, blocks: [...lesson.blocks, describe_] })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors.join('\n')).toContain('a question with one answer is not a question')
  })

  it('rejects a description asking the same thing twice', () => {
    const twice = {
      ...describe_,
      questions: [
        { label: 'What is it?', face: 'en' },
        { label: 'Again?', face: 'en' },
      ],
      sentence: '{en}',
    }
    expect(errorsOf(twice)).toContain('asks the same thing twice')
  })

  it('rejects a description with other than two questions', () => {
    expect(errorsOf({ ...describe_, questions: [describe_.questions[0]] })).toContain('questions')
    expect(
      errorsOf({ ...describe_, questions: [...describe_.questions, { label: 'And?', face: 'emoji' }] }),
    ).toContain('questions')
  })

  it('rejects a sentence naming a tag an item does not carry', () => {
    expect(errorsOf({ ...describe_, sentence: 'The {en} says {tag:move}.' })).toContain('"dog"')
  })
})

describe('the three exercises added for the body diagram', () => {
  function withBlock(block: unknown): unknown {
    const lesson = structuredClone(base()) as unknown as { blocks: unknown[] }
    lesson.blocks.push(block)
    return lesson
  }

  function errorsOf(block: unknown): string {
    const result = validateLesson(withBlock(block))
    expect(result.ok).toBe(false)
    return result.ok ? '' : result.errors.join('\n')
  }

  function accepts(block: unknown): boolean {
    return validateLesson(withBlock(block)).ok
  }

  /** Three places on the body scene, far enough apart to be told apart under a finger. */
  const hotspot = {
    id: 'label', type: 'hotspot', title: 'Label it', items: { select: 'all' },
    scene: 'body',
    spots: {
      dog: [0.10, 0.05, 0.20, 0.10],
      cat: [0.42, 0.40, 0.12, 0.14],
      lion: [0.75, 0.80, 0.16, 0.12],
    },
  }
  const memory = {
    id: 'faces', type: 'memory', title: 'Find the pairs', items: { select: 'all' },
    left: 'emoji', right: 'en',
  }
  const scramble = {
    id: 'build', type: 'scramble', title: 'Build it', items: { select: 'all' },
    template: '{this} {be} {article} {en}.',
  }

  it('accepts all three when they are well formed', () => {
    expect(accepts(hotspot)).toBe(true)
    expect(accepts(memory)).toBe(true)
    expect(accepts(scramble)).toBe(true)
  })

  // ── hotspot ────────────────────────────────────────────────────────────────

  it('rejects a scene the app does not carry', () => {
    const errors = errorsOf({ ...hotspot, scene: 'kitchen' })
    expect(errors).toContain('scene')
  })

  it('rejects a selected item with no place on the drawing', () => {
    const { lion: _lion, ...rest } = hotspot.spots
    const errors = errorsOf({ ...hotspot, spots: rest })
    expect(errors).toContain('"label"')
    expect(errors).toContain('"lion"')
  })

  it('rejects a place that falls outside the drawing', () => {
    const errors = errorsOf({
      ...hotspot,
      spots: { ...hotspot.spots, lion: [0.9, 0.8, 0.2, 0.12] },
    })
    expect(errors).toContain('"label"')
    expect(errors).toContain('outside the drawing')
    expect(errors).toContain('"lion"')
  })

  it('rejects a place with no width or height', () => {
    const errors = errorsOf({
      ...hotspot,
      spots: { ...hotspot.spots, cat: [0.42, 0.40, 0, 0.14] },
    })
    expect(errors).toContain('no width or height')
  })

  it('rejects two words given the same place, which one could never be placed', () => {
    const errors = errorsOf({
      ...hotspot,
      spots: { ...hotspot.spots, cat: [0.10, 0.05, 0.20, 0.10] },
    })
    expect(errors).toContain('"label"')
    expect(errors).toContain('same place')
    expect(errors).toContain('"cat"')
  })

  it('rejects a placement line naming a tag an item does not carry', () => {
    expect(errorsOf({ ...hotspot, speak: 'This is my {tag:move}.' })).toContain('"dog"')
  })

  // ── memory ─────────────────────────────────────────────────────────────────

  it('rejects a memory face a selected item cannot render', () => {
    const errors = errorsOf({ ...memory, right: 'example' })
    expect(errors).toContain('"faces"')
    expect(errors).toContain('"dog"')
  })

  it('rejects more pairs than there are words', () => {
    expect(errorsOf({ ...memory, count: 4 })).toContain('asks for 4 pairs')
  })

  it('rejects a pair line naming a tag an item does not carry', () => {
    expect(errorsOf({ ...memory, speak: 'The {en} says {tag:move}!' })).toContain('"dog"')
  })

  // ── scramble ───────────────────────────────────────────────────────────────

  it('rejects a template naming a tag an item does not carry', () => {
    expect(errorsOf({ ...scramble, template: 'The {en} says {tag:move}.' })).toContain('"dog"')
  })

  it('rejects a template that renders to one word, which is nothing to assemble', () => {
    const errors = errorsOf({ ...scramble, template: '{en}' })
    expect(errors).toContain('"build"')
    expect(errors).toContain('nothing to assemble')
  })
})

describe('the two exercises added for the sentence lessons', () => {
  const yesno = {
    id: 'like', type: 'yesno' as const, title: 'Do you like…?', items: { select: 'all' as const },
    question: 'Do you like {en}s?', yes: 'Yes, I do.', no: "No, I don't.",
  }
  const secret = {
    id: 'hide', type: 'secret' as const, title: 'Guess my secret', items: { select: 'all' as const },
    rounds: 2, guess: 'Is it a {en}? No, it isn\'t.', found: 'Yes, it is! It is a {en}.',
  }

  function errorsOf(block: Lesson['blocks'][number], mutate?: (l: Lesson) => void): string {
    const lesson = broken((l) => {
      l.blocks.push(block)
      mutate?.(l)
    })
    const result = validateLesson(lesson)
    expect(result.ok).toBe(false)
    return result.ok ? '' : result.errors.join('\n')
  }

  it('accepts both when they are well formed', () => {
    const result = validateLesson(broken((l) => l.blocks.push(yesno, { ...yesno, id: 'is', check: true }, secret)))
    if (!result.ok) throw new Error(result.errors.join('\n'))
  })

  // ── yesno ──────────────────────────────────────────────────────────────────

  it('rejects an empty question or reply', () => {
    expect(validateLesson(broken((l) => l.blocks.push({ ...yesno, question: '' }))).ok).toBe(false)
    expect(validateLesson(broken((l) => l.blocks.push({ ...yesno, no: '' }))).ok).toBe(false)
  })

  it('rejects a reply naming a tag an item does not carry, naming the item and the tag', () => {
    const errors = errorsOf({ ...yesno, yes: 'Yes! It says {tag:move}.' })
    expect(errors).toContain('blocks.1.yes:')
    expect(errors).toContain('"move"')
    expect(errors).toContain('"dog"')
  })

  it('rejects a check over one item, since no question could be false', () => {
    const errors = errorsOf({ ...yesno, check: true, items: { select: 'ids', ids: ['dog'] } })
    expect(errors).toContain('"like"')
    expect(errors).toContain('no question can be false')
  })

  it('accepts an opinion over one item', () => {
    const lesson = broken((l) => l.blocks.push({ ...yesno, items: { select: 'ids', ids: ['dog'] } }))
    expect(validateLesson(lesson).ok).toBe(true)
  })

  it('rejects an item whose id is the name of an answer', () => {
    const errors = errorsOf(yesno, (l) => {
      l.items[0]!.id = 'yes'
      ;(l.blocks[0] as { items: unknown }).items = { select: 'all' }
    })
    expect(errors).toContain('the name of an answer')
  })

  it('names the size a check fails at', () => {
    const lesson = topic()
    lesson.blocks.push({ ...yesno, check: true, items: { select: 'new' } })
    const result = validateLesson(lesson)
    expect(result.ok).toBe(false)
    if (result.ok) return
    const message = result.errors.join('\n')
    expect(message).toContain('size "wild"')
    expect(message).toContain('no question can be false')
    expect(message).not.toContain('size "farm"')
  })

  // ── secret ─────────────────────────────────────────────────────────────────

  it('rejects more rounds than items, since each round hides a different one', () => {
    const errors = errorsOf({ ...secret, rounds: 4 })
    expect(errors).toContain('"hide"')
    expect(errors).toContain('plays 4 rounds but selects 3 items')
  })

  it('rejects no rounds at all', () => {
    expect(validateLesson(broken((l) => l.blocks.push({ ...secret, rounds: 0 }))).ok).toBe(false)
  })

  it('rejects a game with one tile', () => {
    const errors = errorsOf({ ...secret, rounds: 1, items: { select: 'ids', ids: ['dog'] } })
    expect(errors).toContain('nothing to guess')
  })

  it('rejects a found line naming a tag an item does not carry', () => {
    expect(errorsOf({ ...secret, found: 'It says {tag:move}!' })).toContain('blocks.1.found:')
  })

  it('names the size a secret game has too many rounds for', () => {
    const lesson = topic()
    lesson.blocks.push({ ...secret, rounds: 3 })
    const result = validateLesson(lesson)
    expect(result.ok).toBe(false)
    if (result.ok) return
    const message = result.errors.join('\n')
    expect(message).toContain('size "farm"')
    expect(message).toContain('plays 3 rounds but selects 2 items')
  })
})

describe('a block for the whole topic only', () => {
  it('accepts `all` in a topic with parts, alone or beside a part', () => {
    const lesson = topic()
    ;(lesson.blocks[1] as { only: string[] }).only = ['all']
    expect(validateLesson(lesson).ok).toBe(true)
    ;(lesson.blocks[1] as { only: string[] }).only = ['wild', 'all']
    expect(validateLesson(lesson).ok).toBe(true)
  })

  it('refuses a part named like the whole topic', () => {
    const lesson = topic()
    lesson.parts![1]!.id = 'all'
    ;(lesson.blocks[1] as { only: string[] }).only = ['farm']
    const result = validateLesson(lesson)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors.join('\n')).toContain('named like the whole topic')
  })

  it('refuses `all` in a topic with no parts, as any other part name', () => {
    const lesson = broken((l) => {
      ;(l.blocks[0] as { only?: string[] }).only = ['all']
    })
    const result = validateLesson(lesson)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors.join('\n')).toContain('"all"')
  })
})

describe('the five conversation exercises', () => {
  const reveal = {
    id: 'peek', type: 'reveal' as const, title: 'Guess & Say', items: { select: 'all' as const },
    speak: 'It is a {en}.',
  }
  const dialogue = {
    id: 'shop', type: 'dialogue' as const, title: 'The shop', items: { select: 'all' as const },
    roles: ['Shopkeeper', 'Customer'] as [string, string],
    lines: [{ role: 0 as const, text: 'What do you like?' }, { role: 1 as const, text: 'I like the {en}.' }],
  }
  const talk = {
    id: 'chat', type: 'talk' as const, title: 'Talk time',
    levels: [{ label: 'Easy', lines: ['Do you like animals?'] }, { label: 'Harder', lines: ['Why?'] }],
  }
  const prefer = {
    id: 'pick', type: 'prefer' as const, title: 'This or that', items: { select: 'all' as const },
    sentence: 'I prefer the {en} to the {other}.', rounds: 3,
  }
  const combine = {
    id: 'more', type: 'combine' as const, title: 'Say more', items: { select: 'all' as const },
    rows: [
      { id: 'feel', label: 'How do you feel?', options: [{ text: 'I like', mood: 'good' as const }, { text: "I don't like", mood: 'bad' as const }] },
      { items: true as const, label: 'Which?' },
      { id: 'why', label: 'Why?', options: [{ text: 'it is cute', mood: 'good' as const }, { text: 'it is scary', mood: 'bad' as const }] },
    ],
    template: '{row:feel} the {en} because {row:why}.',
  }

  function errorsOf(block: Lesson['blocks'][number]): string {
    const result = validateLesson(broken((l) => l.blocks.push(block)))
    expect(result.ok).toBe(false)
    return result.ok ? '' : result.errors.join('\n')
  }

  it('accepts all five when they are well formed', () => {
    const result = validateLesson(broken((l) => l.blocks.push(reveal, dialogue, talk, prefer, combine)))
    if (!result.ok) throw new Error(result.errors.join('\n'))
  })

  it('rejects a reveal line naming a tag an item does not carry', () => {
    const errors = errorsOf({ ...reveal, speak: 'It says {tag:move}.' })
    expect(errors).toContain('blocks.1.speak:')
    expect(errors).toContain('"dog"')
  })

  it('rejects a role-play line said by a third role', () => {
    const lines = [...dialogue.lines, { role: 2, text: 'Hello!' }] as unknown as typeof dialogue.lines
    expect(validateLesson(broken((l) => l.blocks.push({ ...dialogue, lines }))).ok).toBe(false)
  })

  it('rejects a role-play with one line, or a line naming a missing tag', () => {
    expect(validateLesson(broken((l) => l.blocks.push({ ...dialogue, lines: [dialogue.lines[0]!] }))).ok).toBe(false)
    expect(errorsOf({ ...dialogue, lines: [...dialogue.lines, { role: 0, text: '{tag:move}!' }] })).toContain('lines.2.text:')
  })

  it('rejects talk with a single level', () => {
    expect(validateLesson(broken((l) => l.blocks.push({ ...talk, levels: [talk.levels[0]!] }))).ok).toBe(false)
  })

  it('rejects {other} anywhere but a preference', () => {
    const errors = errorsOf({ ...reveal, speak: 'Not the {other}.' })
    expect(errors).toContain('uses {other}')
    expect(errors).toContain('"peek"')
  })

  it('rejects more preference rounds than the selection has pairs', () => {
    const errors = errorsOf({ ...prefer, items: { select: 'ids', ids: ['dog', 'cat'] }, rounds: 2 })
    expect(errors).toContain('only 1 different pairs')
  })

  it('rejects a preference over one item', () => {
    expect(errorsOf({ ...prefer, items: { select: 'ids', ids: ['dog'] }, rounds: 1 })).toContain('a choice needs two')
  })

  it('rejects a row the template forgets, and a row it names but nobody declared', () => {
    expect(errorsOf({ ...combine, template: '{row:feel} the {en}.' })).toContain('declares row "why", which its template never names')
    expect(errorsOf({ ...combine, template: '{row:feel} the {en} because {row:why} {row:who}.' })).toContain('names row "who"')
  })

  it('rejects a combiner with no row of items, or two', () => {
    const noItems = { ...combine, rows: combine.rows.filter((r) => !('items' in r)) }
    expect(errorsOf(noItems)).toContain('0 rows of items')
    const twoItems = { ...combine, rows: [...combine.rows, { items: true as const, label: 'Again' }] }
    expect(errorsOf(twoItems)).toContain('2 rows of items')
  })

  it('rejects an option belonging to an item the block does not select', () => {
    const rows = [combine.rows[0]!, combine.rows[1]!, { id: 'why', label: 'Why?', options: [{ text: 'it purrs', for: ['tiger'] }, { text: 'it is cute' }] }]
    expect(errorsOf({ ...combine, rows })).toContain('belongs to "tiger"')
  })

  it('names the item a row offers nothing for', () => {
    const rows = [combine.rows[0]!, combine.rows[1]!, { id: 'why', label: 'Why?', options: [{ text: 'it purrs', for: ['cat'] }] }]
    const errors = errorsOf({ ...combine, rows })
    expect(errors).toContain('row "why" offers nothing for "dog"')
  })

  it('rejects a combiner whose moods can never agree for an item', () => {
    const rows = [
      { id: 'feel', label: 'Feel', options: [{ text: 'I love', mood: 'good' as const }] },
      combine.rows[1]!,
      { id: 'why', label: 'Why', options: [{ text: 'it is scary', mood: 'bad' as const }] },
    ]
    expect(errorsOf({ ...combine, rows })).toContain('whose moods agree')
  })
})
