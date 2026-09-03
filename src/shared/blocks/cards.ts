import type { CardsState } from '../types'
import { shuffleWithSeed } from '../rng'
import { resolveItems } from '../validate'
import type { BlockLogic } from './contract'

export const cardsLogic: BlockLogic<'cards'> = {
  scored: true,
  init(lesson, block, seed) {
    return {
      order: shuffleWithSeed(
        resolveItems(lesson, block.items).map((i) => i.id),
        seed,
      ),
      flipped: [],
    }
  },

  reduce(_lesson, _block, state, action) {
    if (action.t !== 'tap') return state
    if (!state.order.includes(action.target)) return state
    // Revealing an already-revealed card changes nothing; the view still speaks it.
    if (state.flipped.includes(action.target)) return state
    return { ...state, flipped: [...state.flipped, action.target] }
  },

  isComplete(_lesson, _block, state: CardsState) {
    return state.order.length > 0 && state.flipped.length === state.order.length
  },
}
