import type { BlockOf, Item, Lesson, YesNoState } from '../types'
import { mulberry32, seedFor, shuffleWithSeed } from '../rng'
import { itemById, renderTemplate } from '../text'
import { resolveItems } from '../validate'
import type { BlockLogic } from './contract'

export type YesNoAnswer = 'yes' | 'no'

/**
 * A picture with a question about it, answered Yes or No.
 *
 * Which item each question names is decided here, in `init`, and kept in the state:
 * `reduce` has no seed, and both screens — and the answer key — must agree on whether
 * "Is this your sister?" is being asked over a picture of mom (design D145).
 */
export const yesnoLogic: BlockLogic<'yesno'> = {
  scored: true,

  init(lesson, block, seed): YesNoState {
    const ids = resolveItems(lesson, block.items).map((i) => i.id)
    const order = shuffleWithSeed(ids, seed)
    const coin = mulberry32(seedFor(seed, 'asked', 0))
    const asked = order.map((shown, at) => {
      if (block.check !== true) return shown
      if (coin() < 0.5) return shown
      const others = ids.filter((id) => id !== shown)
      return shuffleWithSeed(others, seedFor(seed, 'other', at))[0] ?? shown
    })
    return { order, asked, index: 0, answer: null, wrong: null }
  },

  reduce(_lesson, block, state, action) {
    if (action.t !== 'tap') return state
    const shown = state.order[state.index]
    if (shown === undefined) return state

    if (action.target === 'yes' || action.target === 'no') {
      if (state.answer !== null) return state
      const right = trueAnswer(state)
      if (block.check === true && action.target !== right) {
        if (state.wrong === action.target) return state
        return { ...state, wrong: action.target }
      }
      return { ...state, answer: action.target, wrong: null }
    }

    // Moving on names the item being left behind, so a second tap cannot skip the next
    // one — scramble's rule (design D146).
    if (action.target !== shown || state.answer === null) return state
    if (state.index >= state.order.length - 1) return state
    return { ...state, index: state.index + 1, answer: null, wrong: null }
  },

  /** Each question, and for a check its true answer and reply (spec: the key for a yes/no question). */
  answerKey(lesson, block, state) {
    return {
      title: block.check === true ? 'Questions and true answers' : 'Questions',
      rows: state.order.flatMap((id, at) => {
        const shown = itemById(lesson, id)
        const asked = itemById(lesson, state.asked[at] ?? id)
        if (shown === undefined || asked === undefined) return []
        const answer: YesNoAnswer = asked.id === shown.id ? 'yes' : 'no'
        const done = at < state.index || (at === state.index && state.answer !== null)
        return [{
          id,
          label: renderTemplate(block.question, asked),
          value: block.check === true
            ? `${answer === 'yes' ? 'Yes' : 'No'} — ${yesnoReply(block, shown, answer)}`
            : shown.en,
          mark: done ? ('done' as const) : at === state.index ? ('current' as const) : ('open' as const),
        }]
      }),
    }
  },

  /** Complete once the last item is answered — no tap after the final reply is required (spec). */
  isComplete(_lesson, _block, state) {
    return state.order.length > 0 && state.index === state.order.length - 1 && state.answer !== null
  },
}

/** The answer that is true of the item on screen: whether the question names it. */
export function trueAnswer(state: YesNoState): YesNoAnswer {
  const shown = state.order[state.index]
  return state.asked[state.index] === shown ? 'yes' : 'no'
}

/** The item on screen, and the item its question names. */
export function yesnoCurrent(lesson: Lesson, state: YesNoState): { shown: Item; asked: Item } | null {
  const shown = itemById(lesson, state.order[state.index] ?? '')
  const asked = itemById(lesson, state.asked[state.index] ?? '')
  if (shown === undefined || asked === undefined) return null
  return { shown, asked }
}

/** The question, rendered for the item it names. */
export function yesnoQuestion(block: BlockOf<'yesno'>, asked: Item): string {
  return renderTemplate(block.question, asked)
}

/** The reply to an answer, rendered for the item shown — never for the one asked about. */
export function yesnoReply(block: BlockOf<'yesno'>, shown: Item, answer: YesNoAnswer): string {
  return renderTemplate(answer === 'yes' ? block.yes : block.no, shown)
}
