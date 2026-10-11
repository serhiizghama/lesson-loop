import type { BlockOf, CombineState, Item } from '../types'
import { fillRows, itemById, renderTemplate } from '../text'
import { resolveItems } from '../validate'
import { chosenMoods, offeredFor, optionRows } from '../combine-rows'
import type { BlockLogic } from './contract'

export { agreeingPicks, chosenMoods, offeredFor, optionRows } from '../combine-rows'

/**
 * A sentence built from rows of choices, one of them the block's items. Nothing is wrong:
 * parts whose moods disagree are a question to talk about, not an error (design D155).
 *
 * Its sentences are the one line in the app left to the device's voice — they run to
 * hundreds per lesson, and the teacher chose not to record them (spec, speech).
 */
export const combineLogic: BlockLogic<'combine'> = {
  scored: true,

  init(): CombineState {
    return { item: null, picks: {}, heard: [] }
  },

  reduce(lesson, block, state, action) {
    if (action.t !== 'tap') return state
    const selected = resolveItems(lesson, block.items).map((i) => i.id)

    if (selected.includes(action.target)) {
      if (state.item === action.target) return state
      // A pick that no longer belongs to the new item is cleared, not kept invisibly.
      const picks: Record<string, number> = {}
      for (const row of optionRows(block.rows)) {
        const index = state.picks[row.id]
        const option = index === undefined ? undefined : row.options[index]
        if (index !== undefined && option !== undefined && offeredFor(option, action.target)) picks[row.id] = index
      }
      return { ...state, item: action.target, picks }
    }

    if (action.target.startsWith('row:')) {
      const [, rowId, raw] = action.target.split(':')
      const row = optionRows(block.rows).find((r) => r.id === rowId)
      const index = Number(raw)
      const option = row?.options[index]
      if (row === undefined || option === undefined || !offeredFor(option, state.item)) return state
      if (state.picks[row.id] === index) return state
      return { ...state, picks: { ...state.picks, [row.id]: index } }
    }

    if (action.target === 'hear') {
      if (!isBuilt(block, state) || state.item === null) return state
      if (state.heard.includes(state.item)) return state
      return { ...state, heard: [...state.heard, state.item] }
    }
    return state
  },

  /** The sentence the choices make, and the words already heard (spec: the keys with no right answer). */
  answerKey(lesson, block, state) {
    const item = itemById(lesson, state.item ?? '')
    const rows = resolveItems(lesson, block.items).map((it) => ({
      id: it.id,
      label: it.en,
      value: it.id === state.item && item !== undefined ? combineSentence(block, state, item) : '—',
      mark: state.heard.includes(it.id) ? ('done' as const) : it.id === state.item ? ('current' as const) : ('open' as const),
    }))
    return { title: 'Sentences', rows }
  },

  isComplete(lesson, block, state) {
    const selected = resolveItems(lesson, block.items)
    return selected.length > 0 && selected.every((it) => state.heard.includes(it.id))
  },
}

/** Whether every row has a choice, which is when the sentence can be heard. */
export function isBuilt(block: BlockOf<'combine'>, state: CombineState): boolean {
  return state.item !== null && optionRows(block.rows).every((row) => state.picks[row.id] !== undefined)
}

/** The sentence the current choices make; rows not yet chosen are left showing. */
export function combineSentence(block: BlockOf<'combine'>, state: CombineState, item: Item): string {
  const chosen: Record<string, string> = {}
  for (const row of optionRows(block.rows)) {
    const index = state.picks[row.id]
    const text = index === undefined ? undefined : row.options[index]?.text
    if (text !== undefined) chosen[row.id] = text
  }
  return renderTemplate(fillRows(block.template, chosen), item)
}

/** Whether the chosen parts disagree, which is when the screen asks if it makes sense. */
export function combineClashes(block: BlockOf<'combine'>, state: CombineState): boolean {
  return chosenMoods(block.rows, state.picks).length > 1
}
