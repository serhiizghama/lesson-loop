import type { BlockOf, Item, Lesson, ScrambleState } from '../types'
import { seedFor, shuffleWithSeed } from '../rng'
import { itemById, renderTemplate } from '../text'
import { resolveItems } from '../validate'
import type { BlockLogic } from './contract'

export const scrambleLogic: BlockLogic<'scramble'> = {
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

  reduce(lesson, block, state, action) {
    const target = scrambleTarget(state)
    if (target === null) return state
    const item = itemById(lesson, target)
    if (item === undefined) return state

    // The action names the item being left behind, the way `tpr` does, so a second tap on
    // a sentence already finished cannot skip past the next one.
    if (action.t === 'tap') {
      if (action.target !== target) return state
      if (state.placed < sentenceWords(block, item).length) return state
      return { ...state, index: state.index + 1, placed: 0, wrong: null }
    }

    if (action.t !== 'pick' || action.side !== 'a') return state

    const words = sentenceWords(block, item)
    const next = words[state.placed]
    if (next === undefined) return state

    // Matched by text, not by which chip was tapped: a sentence with "my" in it twice must
    // take either copy, or the child is being asked to read the shuffler's mind (D131).
    if (action.target !== next) {
      if (state.wrong === action.target) return state
      return { ...state, wrong: action.target }
    }
    return { ...state, placed: state.placed + 1, wrong: null }
  },

  /** The sentence being built, and the ones already built (spec: the key for a sentence-assembly exercise). */
  answerKey(lesson, block, state) {
    const target = scrambleTarget(state)
    return {
      title: 'Sentences',
      rows: state.order.flatMap((id, at) => {
        const item = itemById(lesson, id)
        if (item === undefined) return []
        return [{
          id,
          label: item.en,
          value: renderTemplate(block.template, item),
          mark: at < state.index
            ? ('done' as const)
            : id === target ? ('current' as const) : ('open' as const),
        }]
      }),
    }
  },

  /**
   * Complete when the last sentence is whole — not when the learner acts on it. A finished
   * sentence waits to be read and repeated (spec), so the exercise must not depend on a tap
   * nobody is required to make.
   */
  isComplete(lesson, block, state: ScrambleState) {
    if (state.order.length === 0) return false
    if (state.index >= state.order.length) return true
    if (state.index < state.order.length - 1) return false
    const item = itemById(lesson, state.order[state.index] as string)
    return item !== undefined && state.placed >= sentenceWords(block, item).length
  },
}

/** The item whose sentence is being built, or null when every one is done. */
export function scrambleTarget(state: ScrambleState): string | null {
  return state.order[state.index] ?? null
}

/**
 * The sentence for one item, as its words in the order they must be placed.
 *
 * `renderTemplate` collapses whitespace before it returns, so a template whose `{article}`
 * renders empty for a plural item cannot produce an empty word here.
 */
export function sentenceWords(block: BlockOf<'scramble'>, item: Item): string[] {
  return renderTemplate(block.template, item).split(' ').filter((word) => word.length > 0)
}

/** The words already down, in order — always a prefix of the sentence. */
export function scramblePlaced(
  lesson: Lesson,
  block: BlockOf<'scramble'>,
  state: ScrambleState,
): string[] {
  const target = scrambleTarget(state)
  const item = target === null ? undefined : itemById(lesson, target)
  if (item === undefined) return []
  return sentenceWords(block, item).slice(0, state.placed)
}

/**
 * The words offered for the current item, shuffled — derived rather than stored, exactly
 * as `listenChoices` derives its pictures (design D131). Storing them would make this the
 * first block state that cannot be rebuilt from the seed.
 */
export function scrambleChips(
  lesson: Lesson,
  block: BlockOf<'scramble'>,
  state: ScrambleState,
  seed: number,
): string[] {
  const target = scrambleTarget(state)
  const item = target === null ? undefined : itemById(lesson, target)
  if (item === undefined) return []
  const words = sentenceWords(block, item)
  return shuffleWithSeed(words, seedFor(seed, 'chips', state.index))
}

/**
 * For each chip in the order it is shown, whether it has already been placed.
 *
 * Assigned greedily from the left, so that a sentence containing one word twice shows
 * exactly one of its chips used once the first has been placed — and shows the same one on
 * both screens, since the chips are in the same order on both.
 */
export function scrambleUsed(chips: string[], placed: string[]): boolean[] {
  const remaining = new Map<string, number>()
  for (const word of placed) remaining.set(word, (remaining.get(word) ?? 0) + 1)
  return chips.map((chip) => {
    const left = remaining.get(chip) ?? 0
    if (left === 0) return false
    remaining.set(chip, left - 1)
    return true
  })
}
