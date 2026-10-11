import type { BlockOf, Item, Lesson, PreferState } from '../types'
import { shuffleWithSeed } from '../rng'
import { itemById, renderTemplate } from '../text'
import { resolveItems } from '../validate'
import type { BlockLogic } from './contract'

/**
 * Two items a round; the learner taps the one they prefer, and the sentence is rendered
 * for it against the other. The pairs are drawn in `init`, every one different (design D154).
 */
export const preferLogic: BlockLogic<'prefer'> = {
  scored: true,

  init(lesson, block, seed): PreferState {
    const ids = resolveItems(lesson, block.items).map((i) => i.id)
    const all: Array<[string, string]> = []
    for (const [a, first] of ids.entries()) for (const second of ids.slice(a + 1)) all.push([first, second])
    const pairs = shuffleWithSeed(all, seed)
      .slice(0, block.rounds)
      .map((pair, at): [string, string] => (at % 2 === 0 ? pair : [pair[1], pair[0]]))
    return { pairs, index: 0, chosen: null }
  },

  reduce(_lesson, block, state, action) {
    if (action.t !== 'tap') return state
    const pair = state.pairs[state.index]
    if (pair === undefined || !pair.includes(action.target)) return state
    if (state.chosen === null) return { ...state, chosen: action.target }
    if (action.target !== state.chosen || state.index >= block.rounds - 1) return state
    return { ...state, index: state.index + 1, chosen: null }
  },

  /** The pair each round offers, and what was chosen (spec: the keys with no right answer). */
  answerKey(lesson, _block, state) {
    return {
      title: 'Pairs',
      rows: state.pairs.flatMap(([a, b], at) => {
        const one = itemById(lesson, a)
        const two = itemById(lesson, b)
        if (one === undefined || two === undefined) return []
        const done = at < state.index || (at === state.index && state.chosen !== null)
        const chosen = at === state.index ? state.chosen : null
        return [{
          id: `${a}-${b}`,
          label: `${one.en} or ${two.en}`,
          value: chosen === null ? '—' : (itemById(lesson, chosen)?.en ?? '—'),
          mark: done ? ('done' as const) : at === state.index ? ('current' as const) : ('open' as const),
        }]
      }),
    }
  },

  isComplete(_lesson, block, state) {
    return state.index === block.rounds - 1 && state.chosen !== null
  },
}

/** The sentence for an item chosen against the other. */
export function preferSentence(block: BlockOf<'prefer'>, chosen: Item, other: Item): string {
  return renderTemplate(block.sentence, chosen, other)
}

/** The two items of the round on screen. */
export function preferPair(lesson: Lesson, state: PreferState): [Item, Item] | null {
  const pair = state.pairs[state.index]
  if (pair === undefined) return null
  const a = itemById(lesson, pair[0])
  const b = itemById(lesson, pair[1])
  return a === undefined || b === undefined ? null : [a, b]
}
