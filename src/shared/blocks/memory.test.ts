import { describe, expect, it } from 'vitest'
import { testLesson, testState } from '../__fixtures__/lesson'
import { answerKeyFor, applyAction, blockById, blockStateOf, isBlockComplete } from '../reducer'
import { cardFace, cardId, cardItem, memoryPairSpeech } from './memory'
import { memoryLogic } from './memory'
import { seedFor } from '../rng'
import type { Action, BlockOf, LessonState, MemoryState } from '../types'

const lesson = testLesson()
const block = blockById(lesson, 'faces') as BlockOf<'memory'>

function run(actions: Action[], from: LessonState = testState()): LessonState {
  return actions.reduce((state, action) => applyAction(lesson, state, action), from)
}

const stateOf = (state: LessonState) => blockStateOf(lesson, state, block) as MemoryState
const tap = (target: string): Action => ({ t: 'tap', block: 'faces', target })

/** Two cards of the board that belong to different items. */
function mismatched(order: string[]): [string, string] {
  const first = order[0] as string
  const other = order.find((card) => cardItem(card) !== cardItem(first)) as string
  return [first, other]
}

describe('memory', () => {
  const initial = stateOf(testState())

  it('lays out each chosen item twice, face down', () => {
    expect(initial.order).toHaveLength((block.count ?? 0) * 2)
    expect(initial.up).toEqual([])
    expect(initial.matched).toEqual([])
    expect(initial.tries).toBe(0)
    const counts = new Map<string, number>()
    for (const card of initial.order) {
      counts.set(cardItem(card), (counts.get(cardItem(card)) ?? 0) + 1)
    }
    expect([...counts.values()]).toEqual([2, 2, 2])
  })

  it('turns a card up when it is tapped', () => {
    const after = stateOf(run([tap(initial.order[0] as string)]))
    expect(after.up).toEqual([initial.order[0]])
    expect(after.tries).toBe(0)
  })

  it('closes a pair and takes it out of play', () => {
    const id = cardItem(initial.order[0] as string)
    const after = stateOf(run([tap(cardId(id, 'a')), tap(cardId(id, 'b'))]))
    expect(after.matched).toEqual([cardId(id, 'a'), cardId(id, 'b')])
    expect(after.up).toEqual([])
    expect(after.tries).toBe(1)
  })

  it('leaves two cards that do not belong together face up', () => {
    const [one, two] = mismatched(initial.order)
    const after = stateOf(run([tap(one), tap(two)]))
    expect(after.up).toEqual([one, two])
    expect(after.matched).toEqual([])
    expect(after.tries).toBe(1)
  })

  it('turns a miss back down on the next tap, and turns that card up', () => {
    const [one, two] = mismatched(initial.order)
    const third = initial.order.find((c) => c !== one && c !== two) as string
    const after = stateOf(run([tap(one), tap(two), tap(third)]))
    expect(after.up).toEqual([third])
    expect(after.tries).toBe(1)
  })

  it('spends no try on clearing a miss — that tap is the next try\'s first card', () => {
    const [one, two] = mismatched(initial.order)
    const third = initial.order.find((c) => c !== one && c !== two) as string
    const fourth = initial.order.find(
      (c) => c !== one && c !== two && c !== third && cardItem(c) !== cardItem(third),
    ) as string
    const after = stateOf(run([tap(one), tap(two), tap(third), tap(fourth)]))
    expect(after.tries).toBe(2)
  })

  it('does nothing when a card already turned up is tapped', () => {
    const once = run([tap(initial.order[0] as string)])
    expect(applyAction(lesson, once, tap(initial.order[0] as string))).toBe(once)
  })

  it('does nothing when a card already paired is tapped', () => {
    const id = cardItem(initial.order[0] as string)
    const paired = run([tap(cardId(id, 'a')), tap(cardId(id, 'b'))])
    expect(applyAction(lesson, paired, tap(cardId(id, 'a')))).toBe(paired)
  })

  it('is complete when the last pair is closed', () => {
    const ids = [...new Set(initial.order.map(cardItem))]
    const state = run(ids.flatMap((id) => [tap(cardId(id, 'a')), tap(cardId(id, 'b'))]))
    expect(isBlockComplete(lesson, state, block)).toBe(true)
  })

  it('builds the same board from the same seed, so both screens agree', () => {
    const seed = seedFor(4242, 'faces', 0)
    const once = memoryLogic.init(lesson, block, seed)
    const twice = memoryLogic.init(lesson, block, seed)
    expect(once.order).toEqual(twice.order)
  })

  it('builds a different board after a reset', () => {
    const first = memoryLogic.init(lesson, block, seedFor(4242, 'faces', 0))
    const second = memoryLogic.init(lesson, block, seedFor(4242, 'faces', 1))
    expect(second.order).not.toEqual(first.order)
  })
})

describe('what a card and a pair say', () => {
  it('reads a card by the face it shows', () => {
    expect(cardFace(block, cardId('dog', 'a'))).toBe(block.left)
    expect(cardFace(block, cardId('dog', 'b'))).toBe(block.right)
  })

  it('says nothing for a pair in a block that declares no line', () => {
    const { speak: _speak, ...silent } = block
    const dog = lesson.items.find((i) => i.id === 'dog')
    expect(memoryPairSpeech(silent, dog!)).toBeNull()
  })

  it('says the block line, naming both halves, when a pair closes', () => {
    const dog = lesson.items.find((i) => i.id === 'dog')
    expect(memoryPairSpeech(block, dog!)).toBe('The dog says Woof!')
  })
})

describe('the answer key says where the two halves are lying', () => {
  it('gives the board positions of each pair, counted from one', () => {
    const state = testState()
    const order = stateOf(state).order
    const key = answerKeyFor(lesson, state, block)
    const row = key?.rows[0]
    const id = row?.id as string
    const at = order.flatMap((card, i) => (cardItem(card) === id ? [i + 1] : []))
    expect(row?.value).toContain(`${at[0]} & ${at[1]}`)
  })

  it('marks a pair done once it is found, and neither before', () => {
    const initial = stateOf(testState())
    const id = cardItem(initial.order[0] as string)
    const state = run([tap(cardId(id, 'a')), tap(cardId(id, 'b'))])
    const key = answerKeyFor(lesson, state, block)
    const done = key?.rows.filter((r) => r.mark === 'done').map((r) => r.id)
    expect(done).toEqual([id])
  })

  it('marks a pair current while one of its cards is up', () => {
    const initial = stateOf(testState())
    const id = cardItem(initial.order[0] as string)
    const state = run([tap(cardId(id, 'a'))])
    const key = answerKeyFor(lesson, state, block)
    expect(key?.rows.find((r) => r.id === id)?.mark).toBe('current')
  })
})
