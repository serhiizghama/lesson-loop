import type { SentenceState } from '../types'
import { renderTemplate } from '../text'
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

  /** The sentence the level on screen renders for each item, the chosen one marked. */
  answerKey(lesson, block, state) {
    const level = block.levels[state.level] ?? block.levels[0]
    if (level === undefined) return null
    return {
      title: `Sentence · ${level.label}`,
      rows: resolveItems(lesson, block.items).map((item) => ({
        id: item.id,
        label: `${item.emoji} ${item.en}`,
        value: renderTemplate(level.template, item),
        mark: state.item === item.id ? ('current' as const) : ('open' as const),
      })),
    }
  },

  isComplete(_lesson, block, state: SentenceState) {
    return state.item !== null && state.maxLevel >= block.levels.length - 1
  },
}
