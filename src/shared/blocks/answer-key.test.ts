import { describe, expect, it } from 'vitest'
import { answerKeyFor, applyAction, blockById } from '../reducer'
import { testLesson, testState } from '../__fixtures__/lesson'
import type { Action, Block, LessonState } from '../types'
import type { AnswerKey } from './contract'

/**
 * The teacher's key is derived from the lesson's own data (design D15), so every
 * expectation here is written by hand from the fixture rather than from the code.
 */
const lesson = testLesson()

function block(id: string): Block {
  const found = blockById(lesson, id)
  if (found === undefined) throw new Error(`no block "${id}"`)
  return found
}

function keyOf(id: string, state: LessonState = testState()): AnswerKey {
  const key = answerKeyFor(lesson, state, block(id))
  if (key === null) throw new Error(`block "${id}" has no key`)
  return key
}

function after(actions: Action[]): LessonState {
  let state: LessonState = testState()
  for (const action of actions) state = applyAction(lesson, state, action)
  return state
}

/** Rows come out in presentation order, which is shuffled; compare as a set. */
function pairsOf(key: AnswerKey): Record<string, string> {
  return Object.fromEntries(key.rows.map((r) => [r.label, r.value]))
}

describe('cards', () => {
  it('gives what is behind each card', () => {
    expect(pairsOf(keyOf('vocab'))).toEqual({
      '🐶': 'dog · 犬',
      '🐱': 'cat · 猫',
      '🦁': 'lion · ライオン',
      '🐘': 'elephant · 象',
      '👁️': 'eyes · 目',
    })
  })

  it('marks a card the learner has already turned over', () => {
    const key = keyOf('vocab', after([{ t: 'tap', block: 'vocab', target: 'lion' }]))
    expect(key.rows.find((r) => r.label === '🦁')?.mark).toBe('done')
    expect(key.rows.find((r) => r.label === '🐶')?.mark).toBe('open')
  })
})

describe('match', () => {
  it('gives which picture belongs with which word', () => {
    const key = keyOf('pairs')
    // The block draws 3 of the 5 items, so the key covers exactly what is on screen.
    expect(key.rows).toHaveLength(3)
    expect(key.title).toBe('Pairs')
    for (const row of key.rows) {
      const item = lesson.items.find((i) => i.emoji === row.label)
      expect(item?.en).toBe(row.value)
    }
  })

  it('marks a pair once it is made and the half being held', () => {
    const state = after([{ t: 'pick', block: 'pairs', side: 'a', target: 'dog' }])
    const first = keyOf('pairs', state)
    const held = first.rows.find((r) => r.value === 'dog')
    // 'dog' may not be among the three drawn; when it is, holding it shows as current.
    if (held !== undefined) expect(held.mark).toBe('current')

    const drawn = first.rows[0]!.value
    const id = lesson.items.find((i) => i.en === drawn)!.id
    const paired = after([
      { t: 'pick', block: 'pairs', side: 'a', target: id },
      { t: 'pick', block: 'pairs', side: 'b', target: id },
    ])
    expect(keyOf('pairs', paired).rows.find((r) => r.value === drawn)?.mark).toBe('done')
  })
})

describe('sentence', () => {
  it('gives the sentence the level on screen renders for each item', () => {
    expect(keyOf('say')).toEqual({
      title: 'Sentence · One word',
      rows: [
        { id: 'dog', label: '🐶 dog', value: 'dog', mark: 'open' },
        { id: 'cat', label: '🐱 cat', value: 'cat', mark: 'open' },
        { id: 'lion', label: '🦁 lion', value: 'lion', mark: 'open' },
        { id: 'elephant', label: '🐘 elephant', value: 'elephant', mark: 'open' },
        { id: 'eyes', label: '👁️ eyes', value: 'eyes', mark: 'open' },
      ],
    })
  })

  it('follows the level up and marks the item the learner chose', () => {
    const key = keyOf(
      'say',
      after([
        { t: 'tap', block: 'say', target: 'elephant' },
        { t: 'level', block: 'say', level: 2 },
      ]),
    )
    expect(key.title).toBe('Sentence · This is a…')
    expect(key.rows).toContainEqual({
      id: 'elephant', label: '🐘 elephant', value: 'This is an elephant.', mark: 'current',
    })
    // Declared grammar, not guessed: the plural item takes "These are eyes."
    expect(key.rows).toContainEqual({
      id: 'eyes', label: '👁️ eyes', value: 'These are eyes.', mark: 'open',
    })
  })
})

describe('sort', () => {
  it('gives the bucket each item belongs in', () => {
    const key = keyOf('homes')
    expect(key.title).toBe('Sorted by habitat')
    expect(pairsOf(key)).toEqual({
      '🐶 dog': '🏡 Farm',
      '🐱 cat': '🏡 Farm',
      '👁️ eyes': '🏡 Farm',
      '🦁 lion': '🌴 Jungle',
      '🐘 elephant': '🌴 Jungle',
    })
  })

  it('marks an item once it is placed', () => {
    const state = after([
      { t: 'pick', block: 'homes', side: 'a', target: 'lion' },
      { t: 'pick', block: 'homes', side: 'b', target: 'jungle' },
    ])
    expect(keyOf('homes', state).rows.find((r) => r.id === 'lion')?.mark).toBe('done')
  })
})

describe('listen', () => {
  it('names the picture the word being asked belongs to', () => {
    const key = keyOf('ears')
    const current = key.rows.filter((r) => r.mark === 'current')
    expect(current).toHaveLength(1)

    const asked = current[0]!
    const item = lesson.items.find((i) => i.id === asked.id)
    expect(asked.label).toBe(item?.en)
    expect(asked.value).toBe(item?.emoji)
  })

  it('moves the mark along as the learner answers', () => {
    const first = keyOf('ears').rows.find((r) => r.mark === 'current')!
    const key = keyOf('ears', after([{ t: 'tap', block: 'ears', target: first.id }]))

    expect(key.rows.find((r) => r.id === first.id)?.mark).toBe('done')
    expect(key.rows.filter((r) => r.mark === 'current')).toHaveLength(1)
  })
})

describe('blocks that score nothing have no key (teacher-view: an exercise with no answer)', () => {
  it('returns null for a physical-response exercise', () => {
    expect(answerKeyFor(lesson, testState(), block('move'))).toBeNull()
  })

  it('returns null for the closing screen', () => {
    expect(answerKeyFor(lesson, testState(), block('done'))).toBeNull()
  })
})
