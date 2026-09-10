import { describe, expect, it } from 'vitest'
import { WHOLE, choicesOf, lessonIdOf, narrow, offersChoice, topicOf } from './narrow'
import { validateLesson } from './validate'
import type { Block, Lesson } from './types'

/**
 * A ten-word topic in two halves, arranged the way a real one is: the second part's words
 * are declared first, teaching blocks select what the sitting teaches, and the revision
 * blocks belong to the second part alone.
 */
function topic(): Lesson {
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
      item('bird', 'jungle'), item('lion', 'jungle'),
      item('dog', 'farm'), item('cat', 'farm'), item('fish', 'ocean'),
    ],
    parts: [
      { id: 'known', title: 'You Know These', emoji: '🐶', items: ['dog', 'cat', 'fish'] },
      { id: 'wild', title: 'Wild Animals', emoji: '🦁', items: ['bird', 'lion'] },
    ],
    blocks: [
      { id: 'vocab', type: 'cards', title: 'What is it?', items: { select: 'new' }, front: 'emoji', back: ['en'] },
      { id: 'talk', type: 'phrases', title: 'Say it', only: ['known'], lines: ['It is a dog.'] },
      { id: 'talk-wild', type: 'phrases', title: 'Say it', only: ['wild'], lines: ['It is a lion.'] },
      {
        id: 'homes', type: 'sort', title: 'Where do they live?', only: ['wild'],
        items: { select: 'all' }, by: 'habitat',
        buckets: [
          { key: 'farm', label: 'Farm', emoji: '🏡' },
          { key: 'jungle', label: 'Jungle', emoji: '🌴' },
          { key: 'ocean', label: 'Water', emoji: '🌊' },
        ],
      },
      { id: 'done', type: 'finish', title: 'Great job!', message: 'You did it!' },
    ],
  }
}

/** The same topic with its parts taken away — the four un-parted files, in miniature. */
function unparted(): Lesson {
  const { parts: _parts, ...rest } = topic()
  return rest
}

const ids = (lesson: Lesson) => lesson.items.map((i) => i.id)
const blockIds = (lesson: Lesson) => lesson.blocks.map((b) => b.id)
const itemsOf = (lesson: Lesson, id: string) => {
  const block = lesson.blocks.find((b) => b.id === id) as Block & { items: unknown }
  return block.items
}

describe('narrow', () => {
  it('gives the first part its own words and nothing more', () => {
    expect(ids(narrow(topic(), 'known'))).toEqual(['dog', 'cat', 'fish'])
  })

  it('gives a later part the words of the parts before it, in the file’s order', () => {
    // The file declares the wild animals first; the cumulative lesson keeps that order
    // rather than stacking part after part.
    expect(ids(narrow(topic(), 'wild'))).toEqual(['bird', 'lion', 'dog', 'cat', 'fish'])
  })

  it('gives the whole topic every word', () => {
    expect(ids(narrow(topic(), WHOLE))).toEqual(['bird', 'lion', 'dog', 'cat', 'fish'])
    expect(ids(narrow(topic()))).toEqual(['bird', 'lion', 'dog', 'cat', 'fish'])
  })

  it('carries the blocks of the chosen part and those that name none, in file order', () => {
    expect(blockIds(narrow(topic(), 'known'))).toEqual(['vocab', 'talk', 'done'])
    expect(blockIds(narrow(topic(), 'wild'))).toEqual(['vocab', 'talk-wild', 'homes', 'done'])
  })

  it('carries every block for the whole topic, whatever part it names', () => {
    expect(blockIds(narrow(topic(), WHOLE))).toEqual([
      'vocab', 'talk', 'talk-wild', 'homes', 'done',
    ])
  })

  it('keeps a revision exercise out of the sitting with nothing to revise', () => {
    expect(blockIds(narrow(topic(), 'known'))).not.toContain('homes')
  })

  it('resolves what the sitting teaches to the part’s own words', () => {
    expect(itemsOf(narrow(topic(), 'known'), 'vocab')).toEqual({
      select: 'ids', ids: ['dog', 'cat', 'fish'],
    })
    expect(itemsOf(narrow(topic(), 'wild'), 'vocab')).toEqual({
      select: 'ids', ids: ['bird', 'lion'],
    })
  })

  it('resolves what the sitting teaches to every word for the whole topic', () => {
    expect(itemsOf(narrow(topic(), WHOLE), 'vocab')).toEqual({
      select: 'ids', ids: ['bird', 'lion', 'dog', 'cat', 'fish'],
    })
  })

  it('leaves the other selectors alone — `all` still means everything carried', () => {
    expect(itemsOf(narrow(topic(), 'wild'), 'homes')).toEqual({ select: 'all' })
  })

  it('takes the title and the mark from the chosen part', () => {
    const known = narrow(topic(), 'known')
    expect([known.title, known.emoji]).toEqual(['You Know These', '🐶'])
    const whole = narrow(topic(), WHOLE)
    expect([whole.title, whole.emoji]).toEqual(['Animals', '🐾'])
  })

  it('erases every trace of the topic, which is what makes the result an ordinary lesson', () => {
    for (const choice of ['known', 'wild', WHOLE]) {
      const lesson = narrow(topic(), choice)
      expect(lesson.parts).toBeUndefined()
      expect('parts' in lesson).toBe(false)
      for (const block of lesson.blocks) {
        expect(block.only).toBeUndefined()
        expect('only' in block).toBe(false)
        if ('items' in block) expect(block.items.select).not.toBe('new')
      }
    }
  })

  it('leaves an un-parted lesson as it is, bar the selector', () => {
    const plain = unparted()
    const built = narrow(plain)
    expect(ids(built)).toEqual(ids(plain))
    expect(blockIds(built)).toEqual(blockIds(plain))
    expect(built.title).toBe('Animals')
  })

  it('refuses a size the topic does not offer', () => {
    expect(() => narrow(topic(), 'nope')).toThrow(/no part "nope"/)
  })

  it('names the lesson it built after the size, so a room can find it again', () => {
    expect(narrow(topic(), 'known').id).toBe('animals/known')
    expect(narrow(topic(), WHOLE).id).toBe('animals/all')
    expect(narrow(unparted()).id).toBe('animals')
    expect(lessonIdOf(topic(), 'wild')).toBe('animals/wild')
    expect(topicOf('animals/wild')).toBe('animals')
    expect(topicOf('animals')).toBe('animals')
  })

  /**
   * A built lesson crosses the wire when a room's lesson is switched, and the room runs
   * the same validation over it as over a file. If a size could not pass that, the room
   * would refuse the switch — silently, since a refusal is not an error a teacher sees.
   */
  it('builds a lesson that validates like any other', () => {
    for (const choice of ['known', 'wild', WHOLE]) {
      const result = validateLesson(narrow(topic(), choice))
      if (!result.ok) throw new Error(`${choice}: ${result.errors.join(', ')}`)
    }
  })
})

describe('choicesOf', () => {
  it('offers each part and then the whole topic', () => {
    expect(choicesOf(topic())).toEqual([
      { id: 'known', title: 'You Know These', emoji: '🐶', teaches: 3, carries: 3 },
      { id: 'wild', title: 'Wild Animals', emoji: '🦁', teaches: 2, carries: 5 },
      { id: WHOLE, title: 'Animals', emoji: '🐾', teaches: 5, carries: 5 },
    ])
  })

  it('says a later part teaches its own words but carries the ones before them', () => {
    const wild = choicesOf(topic()).find((c) => c.id === 'wild')
    expect([wild?.teaches, wild?.carries]).toEqual([2, 5])
  })

  it('offers nothing to choose for a topic that declares no parts', () => {
    expect(choicesOf(unparted())).toEqual([])
  })
})

describe('offersChoice', () => {
  it('knows the sizes a topic has', () => {
    expect(offersChoice(topic(), 'known')).toBe(true)
    expect(offersChoice(topic(), WHOLE)).toBe(true)
    expect(offersChoice(topic(), 'nope')).toBe(false)
  })

  it('offers the whole of an un-parted topic and nothing else', () => {
    expect(offersChoice(unparted(), WHOLE)).toBe(true)
    expect(offersChoice(unparted(), 'known')).toBe(false)
  })
})
