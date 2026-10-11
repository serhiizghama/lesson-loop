import type { BlockOf, Item, Lesson, SecretState } from '../types'
import { shuffleWithSeed } from '../rng'
import { itemById, renderTemplate } from '../text'
import { resolveItems } from '../validate'
import type { BlockLogic } from './contract'

/**
 * One item hidden behind a gift, every item offered as a tile; the learner asks the frame's
 * question of one tile after another until the secret is found.
 *
 * The whole sequence of secrets is drawn in `init` and kept in the state — `reduce` has no
 * seed to draw it from (design D147).
 */
export const secretLogic: BlockLogic<'secret'> = {
  scored: true,

  init(lesson, block, seed): SecretState {
    const order = shuffleWithSeed(resolveItems(lesson, block.items).map((i) => i.id), seed)
    return { order, round: 0, tried: [], found: false }
  },

  reduce(_lesson, block, state, action) {
    if (action.t !== 'tap') return state
    const secret = state.order[state.round]
    if (secret === undefined || !state.order.includes(action.target)) return state

    if (state.found) {
      // Moving on names the secret being left behind, so a second tap cannot skip a round.
      if (action.target !== secret || state.round >= block.rounds - 1) return state
      return { ...state, round: state.round + 1, tried: [], found: false }
    }
    if (action.target === secret) return { ...state, found: true }
    if (state.tried.includes(action.target)) return state
    return { ...state, tried: [...state.tried, action.target] }
  },

  /** What each round hides (spec: the key for a secret game). */
  answerKey(lesson, block, state) {
    return {
      title: 'Secrets',
      rows: state.order.slice(0, block.rounds).flatMap((id, round) => {
        const item = itemById(lesson, id)
        if (item === undefined) return []
        const done = round < state.round || (round === state.round && state.found)
        return [{
          id,
          label: `Round ${round + 1}`,
          value: item.en,
          mark: done ? ('done' as const) : round === state.round ? ('current' as const) : ('open' as const),
        }]
      }),
    }
  },

  isComplete(_lesson, block, state) {
    return state.round === block.rounds - 1 && state.found
  },
}

/** The item hidden this round. */
export function secretTarget(lesson: Lesson, state: SecretState): Item | null {
  return itemById(lesson, state.order[state.round] ?? '') ?? null
}

/**
 * The tiles, in the lesson's own order and never in the order the secrets were drawn:
 * that order would put this round's secret first, on the student's screen (design D147).
 */
export function secretTiles(lesson: Lesson, block: BlockOf<'secret'>): Item[] {
  return resolveItems(lesson, block.items)
}

export function secretGuessLine(block: BlockOf<'secret'>, item: Item): string {
  return renderTemplate(block.guess, item)
}

export function secretFoundLine(block: BlockOf<'secret'>, item: Item): string {
  return renderTemplate(block.found, item)
}
