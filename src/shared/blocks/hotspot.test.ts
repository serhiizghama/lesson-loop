import { describe, expect, it } from 'vitest'
import { testLesson, testState } from '../__fixtures__/lesson'
import { answerKeyFor, applyAction, blockById, blockStateOf, isBlockComplete } from '../reducer'
import { hotspotSpeech, spotInWords } from './hotspot'
import type { Action, BlockOf, HotspotState, LessonState, Spot } from '../types'
import bodyParts from '../../../lessons/body-parts.json'

const lesson = testLesson()
const block = blockById(lesson, 'label') as BlockOf<'hotspot'>

function run(actions: Action[], from: LessonState = testState()): LessonState {
  return actions.reduce((state, action) => applyAction(lesson, state, action), from)
}

const stateOf = (state: LessonState) => blockStateOf(lesson, state, block) as HotspotState

const pick = (side: 'a' | 'b', target: string): Action => ({
  t: 'pick', block: 'label', side, target,
})

describe('hotspot', () => {
  const initial = stateOf(testState())

  it('offers every selected word and places none of them', () => {
    expect([...initial.order].sort()).toEqual(['cat', 'dog', 'eyes'])
    expect(initial.placed).toEqual([])
    expect(initial.selected).toBeNull()
  })

  it('sticks a word placed on the spot it names', () => {
    const after = stateOf(run([pick('a', 'dog'), pick('b', 'dog')]))
    expect(after.placed).toEqual(['dog'])
    expect(after.selected).toBeNull()
    expect(after.wrong).toBeNull()
  })

  it('refuses a word placed somewhere else, and keeps it in the bank', () => {
    const after = stateOf(run([pick('a', 'dog'), pick('b', 'cat')]))
    expect(after.placed).toEqual([])
    expect(after.selected).toBe('dog')
    expect(after.wrong).toEqual({ item: 'dog', spot: 'cat' })
  })

  it('clears the refusal on the next placement', () => {
    const after = stateOf(run([pick('a', 'dog'), pick('b', 'cat'), pick('b', 'dog')]))
    expect(after.placed).toEqual(['dog'])
    expect(after.wrong).toBeNull()
  })

  it('moves the selection when a second word is tapped', () => {
    const after = stateOf(run([pick('a', 'dog'), pick('a', 'cat')]))
    expect(after.selected).toBe('cat')
    expect(after.placed).toEqual([])
  })

  it('does nothing at all when a place is tapped with no word chosen', () => {
    const before = testState()
    expect(applyAction(lesson, before, pick('b', 'dog'))).toBe(before)
  })

  it('does nothing when a word already placed is tapped again', () => {
    const placed = run([pick('a', 'dog'), pick('b', 'dog')])
    expect(applyAction(lesson, placed, pick('a', 'dog'))).toBe(placed)
  })

  it('is complete when the last word is placed', () => {
    const state = run(initial.order.flatMap((id) => [pick('a', id), pick('b', id)]))
    expect(isBlockComplete(lesson, state, block)).toBe(true)
  })

  it('is not complete while one word is still in the bank', () => {
    const state = run([pick('a', 'dog'), pick('b', 'dog')])
    expect(isBlockComplete(lesson, state, block)).toBe(false)
  })
})

describe('what a placement says', () => {
  it('says nothing for a block that declares no line', () => {
    const { speak: _speak, ...silent } = block
    const item = lesson.items[0]
    expect(hotspotSpeech(silent, item!)).toBeNull()
  })

  it('says the block line, filled for the word just placed', () => {
    const dog = lesson.items.find((i) => i.id === 'dog')
    expect(hotspotSpeech(block, dog!)).toBe('This is my dog.')
  })

  it('reads the plural of an item that declares one', () => {
    const eyes = lesson.items.find((i) => i.id === 'eyes')
    expect(hotspotSpeech(block, eyes!)).toBe('These are my eyes.')
  })
})

describe('the answer key names a place in words a teacher can say', () => {
  const marks = (state: LessonState): Record<string, string> => {
    const key = answerKeyFor(lesson, state, block)
    if (key === null) throw new Error('a hotspot must have a key')
    return Object.fromEntries(key.rows.map((row) => [row.id, row.mark]))
  }

  it('reads a place near the top middle as "top · centre"', () => {
    expect(spotInWords([0.45, 0.14, 0.09, 0.05])).toBe('top · centre')
  })

  it('reads a place low and to the right as "bottom · right"', () => {
    expect(spotInWords([0.75, 0.87, 0.1, 0.06])).toBe('bottom · right')
  })

  // Two of them: the first sitting labels a face, the second the whole figure. A place
  // named the same as its neighbour would read as the same answer twice on the key.
  it('names every place of each Body Parts diagram distinctly', () => {
    const labels = bodyParts.blocks.filter((b) => b.type === 'hotspot') as Array<{
      id: string
      spots: Record<string, Spot>
    }>
    expect(labels.map((b) => b.id)).toEqual(['label-face', 'label'])
    for (const block of labels) {
      const said = Object.values(block.spots).map((spot) => spotInWords(spot))
      expect(said.length, block.id).toBeGreaterThan(0)
      expect(new Set(said).size, block.id).toBe(said.length)
    }
    expect(Object.keys(labels[1]?.spots ?? {})).toHaveLength(9)
  })

  it('gives the teacher the word against where it goes', () => {
    const key = answerKeyFor(lesson, testState(), block)
    const row = key?.rows.find((r) => r.id === 'dog')
    expect(row?.label).toBe('dog')
    expect(row?.value).toBe(spotInWords(block.spots['dog'] as Spot))
  })

  it('marks a word done once it is placed, and the held one current', () => {
    const state = run([pick('a', 'dog'), pick('b', 'dog'), pick('a', 'cat')])
    expect(marks(state)).toEqual({ dog: 'done', cat: 'current', eyes: 'open' })
  })
})
