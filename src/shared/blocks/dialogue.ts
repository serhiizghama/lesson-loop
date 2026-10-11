import type { BlockOf, DialogueState, Item } from '../types'
import { shuffleWithSeed } from '../rng'
import { itemById, renderTemplate } from '../text'
import { resolveItems } from '../validate'
import type { BlockLogic } from './contract'

/**
 * A role-play: per item, an ordered dialogue between two named roles, one line per tap.
 *
 * The swap relabels who plays which role and does nothing else. An action carries no
 * sender, so a rule about who may tap would be one the app draws and cannot enforce —
 * the same reason memory has no turns (design D152, D-41).
 */
export const dialogueLogic: BlockLogic<'dialogue'> = {
  scored: true,

  init(lesson, block, seed): DialogueState {
    const order = shuffleWithSeed(resolveItems(lesson, block.items).map((i) => i.id), seed)
    return { order, index: 0, shown: 0, swapped: false }
  },

  reduce(_lesson, block, state, action) {
    if (action.t !== 'tap') return state
    if (action.target === 'swap') return { ...state, swapped: !state.swapped }
    const current = state.order[state.index]
    if (current === undefined) return state
    if (action.target === 'line') {
      return state.shown < block.lines.length ? { ...state, shown: state.shown + 1 } : state
    }
    const whole = state.shown === block.lines.length
    if (action.target !== current || !whole || state.index >= state.order.length - 1) return state
    return { ...state, index: state.index + 1, shown: 0 }
  },

  /** The current item's whole dialogue, the next line marked (spec: the key for a role-play). */
  answerKey(lesson, block, state) {
    const item = itemById(lesson, state.order[state.index] ?? '')
    if (item === undefined) return { title: 'Dialogue', rows: [] }
    return {
      title: `Dialogue — ${item.en}`,
      rows: block.lines.map((line, at) => ({
        id: String(at),
        label: block.roles[line.role],
        value: dialogueLine(block, item, at),
        mark: at < state.shown ? ('done' as const) : at === state.shown ? ('current' as const) : ('open' as const),
      })),
    }
  },

  isComplete(_lesson, block, state) {
    return state.order.length > 0 && state.index === state.order.length - 1 && state.shown === block.lines.length
  },
}

export function dialogueLine(block: BlockOf<'dialogue'>, item: Item, at: number): string {
  const line = block.lines[at]
  return line === undefined ? '' : renderTemplate(line.text, item)
}

/** Who plays a role right now: unswapped, the teacher asks first, as on her pages. */
export function roleHolder(state: DialogueState, role: 0 | 1): 'Teacher' | 'Student' {
  return (role === 0) !== state.swapped ? 'Teacher' : 'Student'
}
