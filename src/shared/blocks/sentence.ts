import type { SentenceState } from '../types'
import { resolveItems } from '../validate'
import type { BlockLogic } from './contract'

export const sentenceLogic: BlockLogic<'sentence'> = {
  scored: true,
  init() {
    return { item: null, level: 0, maxLevel: 0 }
  },

  reduce(lesson, block, state, action) {
    if (action.t === 'tap') {
      const known = resolveItems(lesson, block.items).some((i) => i.id === action.target)
      if (!known || state.item === action.target) return state
      return { ...state, item: action.target }
    }
    if (action.t === 'level') {
      if (!Number.isInteger(action.level)) return state
      if (action.level < 0 || action.level >= block.levels.length) return state
      if (action.level === state.level) return state
      return { ...state, level: action.level, maxLevel: Math.max(state.maxLevel, action.level) }
    }
    return state
  },

  isComplete(_lesson, block, state: SentenceState) {
    return state.item !== null && state.maxLevel >= block.levels.length - 1
  },
}
