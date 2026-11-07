import { describe, expect, it } from 'vitest'
import { testLesson, testState } from '../__fixtures__/lesson'
import { answerKeyFor, applyAction, blockById, blockStateOf, isBlockComplete } from '../reducer'
import { speakableLines } from './speakable'
import { spellLetters, spellLogic, spellPlaced, spellTarget, spellUsed, spellWord } from './spell'
import { seedFor } from '../rng'
import { itemById } from '../text'
import type { Action, BlockOf, Item, Lesson, LessonState, SpellState } from '../types'

const lesson = testLesson()
const block = blockById(lesson, 'letters') as BlockOf<'spell'>

function run(actions: Action[], from: LessonState = testState()): LessonState {
  return actions.reduce((state, action) => applyAction(lesson, state, action), from)
}

const stateOf = (state: LessonState) => blockStateOf(lesson, state, block) as SpellState
const letter = (target: string): Action => ({ t: 'pick', block: 'letters', side: 'a', target })
const next = (target: string): Action => ({ t: 'tap', block: 'letters', target })

function wordOf(state: SpellState): string[] {
  return spellWord(itemById(lesson, spellTarget(state) as string) as Item)
}

/** A letter guaranteed not to come next, because no fixture word uses it. */
const NEVER = 'Z'

function spellOne(from: LessonState): LessonState {
  return run(wordOf(stateOf(from)).map(letter), from)
}

/** A lesson of one spelling block over the given words, for words the fixture lacks. */
function lessonOf(...words: string[]): { lesson: Lesson; block: BlockOf<'spell'> } {
  const made = testLesson()
  made.items = words.map((en) => ({ id: en.toLowerCase(), en, emoji: '🔤' }))
  const spell: BlockOf<'spell'> = {
    id: 'letters', type: 'spell', title: 'Spell it', items: { select: 'all' },
  }
  made.blocks = [spell]
  return { lesson: made, block: spell }
}

describe('spell', () => {
  const initial = stateOf(testState())

  it('works through the selected words one at a time', () => {
    expect(initial.order).toHaveLength(lesson.items.length)
    expect(initial.index).toBe(0)
    expect(initial.placed).toBe(0)
  })

  it('places the letter that comes next', () => {
    const after = stateOf(run([letter(wordOf(initial)[0] as string)]))
    expect(after.placed).toBe(1)
    expect(after.wrong).toBeNull()
  })

  it('refuses a letter out of order and keeps every letter already placed', () => {
    const after = stateOf(run([letter(wordOf(initial)[0] as string), letter(NEVER)]))
    expect(after.placed).toBe(1)
    expect(after.wrong).toBe(NEVER)
  })

  it('clears the mistake when the right letter follows it', () => {
    const after = stateOf(run([letter(NEVER), letter(wordOf(initial)[0] as string)]))
    expect(after.placed).toBe(1)
    expect(after.wrong).toBeNull()
  })

  it('does nothing when the same wrong letter is tapped twice', () => {
    const once = stateOf(run([letter(NEVER)]))
    const twice = spellLogic.reduce(lesson, block, once, letter(NEVER))
    expect(twice).toBe(once)
  })

  it('takes any copy of a repeated letter, and marks exactly one more tile as used', () => {
    const { lesson: words, block: spell } = lessonOf('scissors')
    let state = spellLogic.init(words, spell, 7)
    const tiles = spellLetters(words, state, 7)
    const s = tiles.filter((t) => t === 's').length
    expect(s).toBe(4)

    state = spellLogic.reduce(words, spell, state, letter('s'))
    expect(state.placed).toBe(1)
    expect(spellUsed(tiles, spellPlaced(words, state)).filter(Boolean)).toHaveLength(1)

    state = spellLogic.reduce(words, spell, state, letter('c'))
    state = spellLogic.reduce(words, spell, state, letter('i'))
    state = spellLogic.reduce(words, spell, state, letter('s'))
    const used = spellUsed(tiles, spellPlaced(words, state))
    expect(state.placed).toBe(4)
    // The same ones on both screens: always the leftmost copies, whichever was tapped.
    const copies = tiles.flatMap((t, at) => (t === 's' ? [at] : []))
    expect(copies.map((at) => used[at])).toEqual([true, true, false, false])
  })

  it('keeps a letter in the case the lesson writes it', () => {
    const { lesson: words, block: spell } = lessonOf('TV')
    const state = spellLogic.init(words, spell, 7)
    expect(spellLetters(words, state, 7).sort()).toEqual(['T', 'V'])
    expect(spellLogic.reduce(words, spell, state, letter('t'))).toEqual({ ...state, wrong: 't' })
    expect(spellLogic.reduce(words, spell, state, letter('T')).placed).toBe(1)
  })

  it('does not move on from an unfinished word', () => {
    const state = run([letter(wordOf(initial)[0] as string)])
    const after = applyAction(lesson, state, next(spellTarget(stateOf(state)) as string))
    expect(stateOf(after).index).toBe(0)
  })

  it('cannot be skipped past the next word by a second tap on a finished one', () => {
    const first = spellTarget(initial) as string
    const moved = run([next(first)], spellOne(testState()))
    const again = run([next(first)], moved)
    expect(stateOf(moved).index).toBe(1)
    expect(stateOf(again).index).toBe(1)
  })

  it('carries nothing over to the next word', () => {
    const first = spellTarget(initial) as string
    const after = stateOf(run([letter(NEVER), next(first)], spellOne(testState())))
    expect(after.index).toBe(1)
    expect(after.placed).toBe(0)
    expect(after.wrong).toBeNull()
  })

  it('is complete when the last word is whole, with no tap to move on', () => {
    let state = testState()
    for (let i = 0; i < initial.order.length - 1; i++) {
      state = spellOne(state)
      expect(isBlockComplete(lesson, state, block)).toBe(false)
      state = run([next(spellTarget(stateOf(state)) as string)], state)
    }
    expect(isBlockComplete(lesson, state, block)).toBe(false)
    expect(isBlockComplete(lesson, spellOne(state), block)).toBe(true)
  })
})

describe('the letters offered (design D167)', () => {
  const seeds = Array.from({ length: 1000 }, (_, i) => seedFor(4242, 'letters', i))

  it.each(['TV', 'pen', 'scissors'])('%s is never offered already spelled', (word) => {
    const { lesson: words, block: spell } = lessonOf(word)
    for (const seed of seeds) {
      const state = spellLogic.init(words, spell, seed)
      const offered = spellLetters(words, state, seed)
      expect(offered.join('')).not.toBe(word)
      expect([...offered].sort()).toEqual(Array.from(word).sort())
    }
  })

  it('offers the same order for the same seed, so both screens agree', () => {
    const { lesson: words, block: spell } = lessonOf('umbrella')
    const state = spellLogic.init(words, spell, 99)
    expect(spellLetters(words, state, 99)).toEqual(spellLetters(words, state, 99))
  })
})

describe('the key for a spelling exercise', () => {
  it('shows each word with its letters, and where the learner is', () => {
    const { lesson: words, block: spell } = lessonOf('pen', 'TV', 'hat')
    let state = spellLogic.init(words, spell, 5)
    const [first, second, third] = state.order as [string, string, string]

    const key = spellLogic.answerKey?.(words, spell, state)
    expect(key?.rows.map((r) => r.mark)).toEqual(['current', 'open', 'open'])
    const tv = key?.rows.find((r) => r.id === 'tv')
    expect(tv?.label).toBe('TV')
    expect(tv?.value).toBe('T V')

    state = { ...state, index: 1 }
    const moved = spellLogic.answerKey?.(words, spell, state)
    expect(moved?.rows.find((r) => r.id === first)?.mark).toBe('done')
    expect(moved?.rows.find((r) => r.id === second)?.mark).toBe('current')
    expect(moved?.rows.find((r) => r.id === third)?.mark).toBe('open')
  })

  it('is what the teacher is given', () => {
    const key = answerKeyFor(lesson, testState(), block)
    expect(key?.title).toBe('Spelling')
    expect(key?.rows).toHaveLength(lesson.items.length)
  })
})

describe('what a spelling exercise can say', () => {
  it('is exactly the selected words, one each', () => {
    const { lesson: words } = lessonOf('pen', 'TV')
    expect(speakableLines(words)).toEqual(['pen', 'TV'])
  })
})
