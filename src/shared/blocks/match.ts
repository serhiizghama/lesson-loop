import type { MatchState } from '../types'
import { seedFor, shuffleWithSeed } from '../rng'
import { resolveItems } from '../validate'
import type { BlockLogic } from './contract'

export const matchLogic: BlockLogic<'match'> = {
  scored: true,
  init(lesson, block, seed) {
    const all = resolveItems(lesson, block.items).map((i) => i.id)
    const count = Math.min(block.count ?? all.length, all.length)
    const chosen = shuffleWithSeed(all, seedFor(seed, 'pick', 0)).slice(0, count)
    return {
      orderA: shuffleWithSeed(chosen, seedFor(seed, 'left', 0)),
      orderB: shuffleWithSeed(chosen, seedFor(seed, 'right', 0)),
      selected: null,
      paired: [],
      wrong: null,
    }
  },

  reduce(_lesson, _block, state, action) {
    if (action.t !== 'pick') return state
    const column = action.side === 'a' ? state.orderA : state.orderB
    if (!column.includes(action.target)) return state
    if (state.paired.includes(action.target)) return state

    // Nothing selected yet, or the learner changed their mind on the same side.
    if (state.selected === null || state.selected.side === action.side) {
      if (state.selected?.id === action.target && state.wrong === null) return state
      return { ...state, selected: { side: action.side, id: action.target }, wrong: null }
    }

    const a = state.selected.side === 'a' ? state.selected.id : action.target
    const b = state.selected.side === 'a' ? action.target : state.selected.id
    if (a === b) {
      return { ...state, paired: [...state.paired, a], selected: null, wrong: null }
    }
    return { ...state, selected: null, wrong: { a, b } }
  },

  isComplete(_lesson, _block, state: MatchState) {
    return state.orderA.length > 0 && state.paired.length === state.orderA.length
  },
}
