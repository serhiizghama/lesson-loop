import type { SortState } from '../types'
import { shuffleWithSeed } from '../rng'
import { resolveItems } from '../validate'
import { itemById } from '../text'
import type { BlockLogic } from './contract'

export const sortLogic: BlockLogic<'sort'> = {
  scored: true,
  init(lesson, block, seed) {
    return {
      order: shuffleWithSeed(
        resolveItems(lesson, block.items).map((i) => i.id),
        seed,
      ),
      selected: null,
      placed: {},
      wrong: null,
    }
  },

  reduce(lesson, block, state, action) {
    if (action.t !== 'pick') return state

    if (action.side === 'a') {
      if (!state.order.includes(action.target)) return state
      if (state.placed[action.target] !== undefined) return state
      if (state.selected === action.target && state.wrong === null) return state
      return { ...state, selected: action.target, wrong: null }
    }

    if (state.selected === null) return state
    if (!block.buckets.some((b) => b.key === action.target)) return state

    const item = itemById(lesson, state.selected)
    if (item === undefined) return state
    if (item.tags?.[block.by] === action.target) {
      return {
        ...state,
        placed: { ...state.placed, [state.selected]: action.target },
        selected: null,
        wrong: null,
      }
    }
    return { ...state, selected: null, wrong: { item: state.selected, bucket: action.target } }
  },

  /** The bucket each item belongs in (spec: which bucket each item belongs in). */
  answerKey(lesson, block, state) {
    const labels = new Map(block.buckets.map((b) => [b.key, `${b.emoji} ${b.label}`]))
    return {
      title: `Sorted by ${block.by}`,
      rows: state.order.flatMap((id) => {
        const item = itemById(lesson, id)
        if (item === undefined) return []
        const key = item.tags?.[block.by]
        return [{
          id,
          label: `${item.emoji} ${item.en}`,
          value: (key === undefined ? undefined : labels.get(key)) ?? '—',
          mark: state.placed[id] !== undefined
            ? ('done' as const)
            : state.selected === id ? ('current' as const) : ('open' as const),
        }]
      }),
    }
  },

  isComplete(_lesson, _block, state: SortState) {
    return state.order.length > 0 && Object.keys(state.placed).length === state.order.length
  },
}
