import type { Item, Lesson, SpellState } from '../types'
import { seedFor, shuffleWithSeed } from '../rng'
import { itemById } from '../text'
import { resolveItems } from '../validate'
import type { BlockLogic } from './contract'
import { scrambleUsed } from './scramble'

export const spellLogic: BlockLogic<'spell'> = {
  scored: true,
  init(lesson, block, seed) {
    return {
      order: shuffleWithSeed(
        resolveItems(lesson, block.items).map((i) => i.id),
        seed,
      ),
      index: 0,
      placed: 0,
      wrong: null,
    }
  },

  reduce(lesson, _block, state, action) {
    const target = spellTarget(state)
    if (target === null) return state
    const item = itemById(lesson, target)
    if (item === undefined) return state
    const letters = spellWord(item)

    // The action names the word being left behind, so a second tap on a word already
    // finished cannot skip past the next one.
    if (action.t === 'tap') {
      if (action.target !== target) return state
      if (state.placed < letters.length) return state
      return { ...state, index: state.index + 1, placed: 0, wrong: null }
    }

    if (action.t !== 'pick' || action.side !== 'a') return state

    const next = letters[state.placed]
    if (next === undefined) return state

    // Matched by text, not by which tile was tapped, so any "s" of "scissors" will do. A
    // wrong letter costs nothing: what is down stays down (design D166).
    if (action.target !== next) {
      if (state.wrong === action.target) return state
      return { ...state, wrong: action.target }
    }
    return { ...state, placed: state.placed + 1, wrong: null }
  },

  /** Each word and its letters, written out for reading aloud (design D170). */
  answerKey(lesson, _block, state) {
    const target = spellTarget(state)
    return {
      title: 'Spelling',
      rows: state.order.flatMap((id, at) => {
        const item = itemById(lesson, id)
        if (item === undefined) return []
        return [{
          id,
          label: item.en,
          value: spellWord(item).join(' '),
          mark: at < state.index
            ? ('done' as const)
            : id === target ? ('current' as const) : ('open' as const),
        }]
      }),
    }
  },

  /**
   * Complete when the last word is whole — not when the learner acts on it. A finished word
   * waits to be read and repeated, so the exercise must not depend on a tap nobody is
   * required to make.
   */
  isComplete(lesson, _block, state: SpellState) {
    if (state.order.length === 0) return false
    if (state.index >= state.order.length) return true
    if (state.index < state.order.length - 1) return false
    const item = itemById(lesson, state.order[state.index] as string)
    return item !== undefined && state.placed >= spellWord(item).length
  },
}

/** The item whose word is being spelled, or null when every one is done. */
export function spellTarget(state: SpellState): string | null {
  return state.order[state.index] ?? null
}

/** A word as the letters to place, in order, each in the case the lesson writes it. */
export function spellWord(item: Item): string[] {
  return Array.from(item.en)
}

/** The letters already down, in order — always a prefix of the word. */
export function spellPlaced(lesson: Lesson, state: SpellState): string[] {
  const target = spellTarget(state)
  const item = target === null ? undefined : itemById(lesson, target)
  return item === undefined ? [] : spellWord(item).slice(0, state.placed)
}

/**
 * The letters offered for the current word, shuffled — derived rather than stored, because
 * `reduce` has no seed and both screens must agree (design D131, D167).
 *
 * A shuffle that happens to spell the word is rotated by one, which changes the order of any
 * word with two different letters. Without it, "TV" would arrive already spelled about half
 * the time.
 */
export function spellLetters(lesson: Lesson, state: SpellState, seed: number): string[] {
  const target = spellTarget(state)
  const item = target === null ? undefined : itemById(lesson, target)
  if (item === undefined) return []
  const word = spellWord(item)
  const shuffled = shuffleWithSeed(word, seedFor(seed, 'letters', state.index))
  if (shuffled.join('') !== word.join('')) return shuffled
  return [...shuffled.slice(1), ...shuffled.slice(0, 1)]
}

/** For each tile as shown, whether it has been used. The same rule as a sentence's chips. */
export function spellUsed(letters: string[], placed: string[]): boolean[] {
  return scrambleUsed(letters, placed)
}
