import { describe, expect, it } from 'vitest'
import { testLesson, testState } from '../__fixtures__/lesson'
import { answerKeyFor, applyAction, blockById, blockStateOf, isBlockComplete } from '../reducer'
import {
  scrambleChips, scramblePlaced, scrambleTarget, scrambleUsed, sentenceWords,
} from './scramble'
import { seedFor } from '../rng'
import { itemById } from '../text'
import type { Action, BlockOf, Lesson, LessonState, ScrambleState } from '../types'

const lesson = testLesson()
const block = blockById(lesson, 'build') as BlockOf<'scramble'>
const SEED = seedFor(4242, 'build', 0)

function run(actions: Action[], from: LessonState = testState()): LessonState {
  return actions.reduce((state, action) => applyAction(lesson, state, action), from)
}

const stateOf = (state: LessonState) => blockStateOf(lesson, state, block) as ScrambleState
const word = (target: string): Action => ({ t: 'pick', block: 'build', side: 'a', target })
const next = (target: string): Action => ({ t: 'tap', block: 'build', target })

/** The sentence the block asks for, for whichever item is on screen. */
function wordsOf(state: ScrambleState): string[] {
  const item = itemById(lesson, scrambleTarget(state) as string)
  return sentenceWords(block, item!)
}

/** Every word of the current sentence, placed in order. */
function buildOne(from: LessonState): LessonState {
  const words = wordsOf(stateOf(from))
  return run(words.map(word), from)
}

describe('scramble', () => {
  const initial = stateOf(testState())

  it('works through the selected items one at a time', () => {
    expect(initial.order).toHaveLength(lesson.items.length)
    expect(initial.index).toBe(0)
    expect(initial.placed).toBe(0)
  })

  it('places the word that comes next', () => {
    const words = wordsOf(initial)
    const after = stateOf(run([word(words[0] as string)]))
    expect(after.placed).toBe(1)
    expect(after.wrong).toBeNull()
  })

  it('refuses a word out of order and keeps every word already placed', () => {
    const words = wordsOf(initial)
    const after = stateOf(run([word(words[0] as string), word(words[3] as string)]))
    expect(after.placed).toBe(1)
    expect(after.wrong).toBe(words[3])
  })

  it('does nothing when the same wrong word is tapped twice', () => {
    const words = wordsOf(initial)
    const once = run([word(words[2] as string)])
    expect(applyAction(lesson, once, word(words[2] as string))).toBe(once)
  })

  it('accepts either copy of a word the sentence uses twice', () => {
    // "This is my dog." repeats nothing, so the case is made rather than found.
    const twice: BlockOf<'scramble'> = { ...block, template: 'my {en} and my {en}' }
    const repeated: Lesson = {
      ...lesson,
      blocks: lesson.blocks.map((b) => (b.id === 'build' ? twice : b)),
    }
    const words = sentenceWords(twice, itemById(lesson, 'dog')!)
    expect(words.filter((w) => w === 'my')).toHaveLength(2)

    let state: LessonState = testState()
    const target = (blockStateOf(repeated, state, twice) as ScrambleState).order[0] as string
    const own = sentenceWords(twice, itemById(lesson, target)!)
    for (const w of own.slice(0, 3)) {
      state = applyAction(repeated, state, { t: 'pick', block: 'build', side: 'a', target: w })
    }
    // The fourth word is "my" again: the same text as the first chip, and accepted.
    state = applyAction(repeated, state, { t: 'pick', block: 'build', side: 'a', target: 'my' })
    expect((blockStateOf(repeated, state, twice) as ScrambleState).placed).toBe(4)
  })

  it('offers the same chips for the same seed, every time it is asked', () => {
    const once = scrambleChips(lesson, block, initial, SEED)
    const twice = scrambleChips(lesson, block, initial, SEED)
    expect(once).toEqual(twice)
    expect([...once].sort()).toEqual([...wordsOf(initial)].sort())
  })

  it('reshuffles for the next item, so the same order is not learnt', () => {
    const built = buildOne(testState())
    const moved = run([next(scrambleTarget(stateOf(built)) as string)], built)
    expect(stateOf(moved).index).toBe(1)
    expect(stateOf(moved).placed).toBe(0)
  })

  it('leaves a finished sentence on screen rather than advancing by itself', () => {
    const built = buildOne(testState())
    const after = stateOf(built)
    expect(after.index).toBe(0)
    expect(after.placed).toBe(wordsOf(after).length)
  })

  it('does nothing when a tap names an item that is not on screen', () => {
    const built = buildOne(testState())
    const other = stateOf(built).order[2] as string
    expect(applyAction(lesson, built, next(other))).toBe(built)
  })

  it('does nothing when the way forward is taken before the sentence is whole', () => {
    const state = testState()
    const target = scrambleTarget(stateOf(state)) as string
    expect(applyAction(lesson, state, next(target))).toBe(state)
  })

  it('is complete when the last sentence is whole, before it is acted on', () => {
    let state: LessonState = testState()
    for (let i = 0; i < initial.order.length; i++) {
      state = buildOne(state)
      if (i < initial.order.length - 1) {
        state = run([next(scrambleTarget(stateOf(state)) as string)], state)
      }
    }
    expect(isBlockComplete(lesson, state, block)).toBe(true)
  })

  it('leaves no empty chip where a template renders an article away', () => {
    const eyes = itemById(lesson, 'eyes')
    const words = sentenceWords({ ...block, template: '{it} {be} {article} {en}.' }, eyes!)
    expect(words).not.toContain('')
    expect(words).toEqual(['They', 'are', 'eyes.'])
  })
})

describe('the words already down', () => {
  it('are the sentence so far, in order', () => {
    const words = wordsOf(stateOf(testState()))
    const state = run([word(words[0] as string), word(words[1] as string)])
    expect(scramblePlaced(lesson, block, stateOf(state))).toEqual(words.slice(0, 2))
  })

  it('mark exactly one chip used where a word appears twice', () => {
    expect(scrambleUsed(['my', 'nose.', 'my'], ['my'])).toEqual([true, false, false])
    expect(scrambleUsed(['my', 'nose.', 'my'], ['my', 'my'])).toEqual([true, false, true])
  })
})

describe('the answer key gives the teacher the sentence', () => {
  it('reads the whole sentence for every item', () => {
    const key = answerKeyFor(lesson, testState(), block)
    const dog = key?.rows.find((r) => r.id === 'dog')
    expect(dog?.value).toBe('This is my dog.')
  })

  it('marks the sentence on screen current and the ones behind it done', () => {
    const built = buildOne(testState())
    const moved = run([next(scrambleTarget(stateOf(built)) as string)], built)
    const key = answerKeyFor(lesson, moved, block)
    const order = stateOf(moved).order
    expect(key?.rows.find((r) => r.id === order[0])?.mark).toBe('done')
    expect(key?.rows.find((r) => r.id === order[1])?.mark).toBe('current')
    expect(key?.rows.find((r) => r.id === order[2])?.mark).toBe('open')
  })
})
