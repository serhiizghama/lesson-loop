import type { BlockOf, Item, ListenState, Lesson } from '../types'
import { seedFor, shuffleWithSeed } from '../rng'
import { resolveItems } from '../validate'
import type { BlockLogic } from './contract'

export const DEFAULT_CHOICES = 4

export const listenLogic: BlockLogic<'listen'> = {
  scored: true,
  init(lesson, block, seed) {
    return {
      order: shuffleWithSeed(
        resolveItems(lesson, block.items).map((i) => i.id),
        seed,
      ),
      index: 0,
      answered: [],
      wrong: null,
    }
  },

  reduce(_lesson, _block, state, action) {
    if (action.t !== 'tap') return state
    if (state.index >= state.order.length) return state
    if (!state.order.includes(action.target)) return state

    const target = state.order[state.index] as string
    if (action.target !== target) {
      if (state.wrong === action.target) return state
      return { ...state, wrong: action.target }
    }
    return { ...state, index: state.index + 1, answered: [...state.answered, target], wrong: null }
  },

  /** Which picture the word being spoken names (spec: the key for a listening exercise). */
  answerKey(lesson, block, state) {
    const items = new Map(resolveItems(lesson, block.items).map((i) => [i.id, i]))
    const target = listenTarget(state)
    return {
      title: 'Words in order',
      rows: state.order.flatMap((id) => {
        const item = items.get(id)
        if (item === undefined) return []
        return [{
          id,
          label: item.en,
          value: item.emoji,
          mark: state.answered.includes(id)
            ? ('done' as const)
            : id === target ? ('current' as const) : ('open' as const),
        }]
      }),
    }
  },

  isComplete(_lesson, _block, state: ListenState) {
    return state.order.length > 0 && state.answered.length === state.order.length
  },
}

/** The word being asked for right now, or null when the exercise is finished. */
export function listenTarget(state: ListenState): string | null {
  return state.order[state.index] ?? null
}

/**
 * The pictures offered for the current target: the answer plus distractors drawn from
 * the block's own selection. Derived from the seed, so both screens offer the same set
 * in the same places.
 */
export function listenChoices(
  lesson: Lesson,
  block: BlockOf<'listen'>,
  state: ListenState,
  seed: number,
): Item[] {
  const target = listenTarget(state)
  if (target === null) return []
  const pool = resolveItems(lesson, block.items)
  const wanted = Math.min(block.choices ?? DEFAULT_CHOICES, pool.length)
  const distractors = shuffleWithSeed(
    pool.filter((i) => i.id !== target).map((i) => i.id),
    seedFor(seed, 'distractors', state.index),
  ).slice(0, wanted - 1)
  const ids = shuffleWithSeed([target, ...distractors], seedFor(seed, 'choices', state.index))
  const byId = new Map(pool.map((i) => [i.id, i]))
  return ids.flatMap((id) => {
    const item = byId.get(id)
    return item ? [item] : []
  })
}
