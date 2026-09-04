import { describe, expect, it } from 'vitest'
import { speakableLines } from './speakable'
import { blockLogic } from './index'
import { testLesson } from '../__fixtures__/lesson'
import type { Block, BlockType, Lesson } from '../types'

const lesson = testLesson()
const lines = speakableLines(lesson)

describe('every line a lesson can speak', () => {
  it('includes the plain word a picture names', () => {
    expect(lines).toContain('dog')
  })

  it('includes a line composed from a template and an item', () => {
    // The claim that made recordings possible at all: nothing waits until runtime.
    expect(lines).toContain('This is a dog.')
    expect(lines).toContain('It is a dog.')
  })

  it('respects a template that inflects for a plural item', () => {
    expect(lines).toContain('These are eyes.')
  })

  it('includes the sentence a completed pair speaks', () => {
    // testLesson()'s match block declares no `speak`, so a themed one stands in — the
    // shape animals.json's "Sound Match" uses.
    const themed: Block = {
      id: 'soundmatch', type: 'match', title: 'Sound Match', items: { select: 'all' },
      left: 'emoji', right: 'tag:sound', speak: 'The {en} says {tag:sound}!',
    }
    expect(speakableLines({ ...lesson, blocks: [themed] })).toContain('The dog says Woof!')
  })

  it('includes both faces of a match, and no line for a gloss face', () => {
    const glossed: Block = {
      id: 'pairs', type: 'match', title: 'Pairs', items: { select: 'all' },
      left: 'emoji', right: 'l1',
    }
    const got = speakableLines({ ...lesson, blocks: [glossed] })
    // A picture face is spoken as the English word; the Japanese gloss is not spoken.
    expect(got).toContain('dog')
    expect(got).not.toContain('犬')
  })

  it('includes a physical-response instruction', () => {
    expect(lines).toContain('Run like a dog!')
  })

  it('says nothing for the closing slide', () => {
    const only: Lesson = { ...lesson, blocks: lesson.blocks.filter((b) => b.type === 'finish') }
    expect(speakableLines(only)).toEqual([])
  })

  it('never returns a blank line', () => {
    expect(lines.every((l) => l.trim().length > 0)).toBe(true)
  })

  it('lists each distinct line once, however many blocks speak it', () => {
    // 'dog' is spoken by the cards, match, listen and sort blocks alike.
    expect(lines.filter((l) => l === 'dog')).toHaveLength(1)
    expect(new Set(lines).size).toBe(lines.length)
  })

  it('is derived from data alone — the same lesson always yields the same set', () => {
    expect(speakableLines(testLesson())).toEqual(lines)
  })
})

describe('no block type is left silently unspoken', () => {
  /**
   * A new block type that speaks something would otherwise ship with no recordings and
   * nobody would notice, because the fallback would quietly cover it.
   */
  const types = Object.keys(blockLogic) as BlockType[]

  it('covers every member of BlockType', () => {
    for (const type of types) {
      const block = lesson.blocks.find((b) => b.type === type)
      expect(block, `testLesson() has no ${type} block to check against`).toBeDefined()
      expect(() => speakableLines({ ...lesson, blocks: [block as Block] })).not.toThrow()
    }
  })

  it('produces lines for every type that speaks', () => {
    // `finish` is the only type with nothing to say; every other type must yield lines.
    for (const type of types.filter((t) => t !== 'finish')) {
      const block = lesson.blocks.find((b) => b.type === type) as Block
      expect(speakableLines({ ...lesson, blocks: [block] }).length, type).toBeGreaterThan(0)
    }
  })
})
