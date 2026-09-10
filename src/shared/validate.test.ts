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
