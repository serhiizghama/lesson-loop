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

describe('resolveItems', () => {
  const lesson = base()

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
