import type { BlockOf, TalkState } from '../types'
import { seedFor, shuffleWithSeed } from '../rng'
import type { BlockLogic } from './contract'

/**
 * Talk questions in levels. *New question* asks at the first level, *Harder* climbs one.
 * Each level's order is drawn in `init` and walked with a cursor, wrapping once used up, so
 * nothing repeats before its level is exhausted and both screens ask the same (design D153).
 */
export const talkLogic: BlockLogic<'talk'> = {
  scored: true,

  init(_lesson, block, seed): TalkState {
    return {
      orders: block.levels.map((level, at) =>
        shuffleWithSeed(level.lines.map((_line, i) => i), seedFor(seed, 'level', at)),
      ),
      cursors: block.levels.map(() => 0),
      level: 0,
      current: null,
      top: false,
    }
  },

  reduce(_lesson, block, state, action) {
    if (action.t !== 'tap') return state
    let level: number
    if (action.target === 'new') level = 0
    else if (action.target === 'harder') level = state.current === null ? 0 : Math.min(state.level + 1, block.levels.length - 1)
    else return state

    const order = state.orders[level] ?? []
    const cursor = state.cursors[level] ?? 0
    const question = order[cursor % order.length]
    if (question === undefined) return state
    const cursors = state.cursors.map((c, at) => (at === level ? c + 1 : c))
    return {
      ...state,
      cursors,
      level,
      current: `${level}:${question}`,
      top: state.top || level === block.levels.length - 1,
    }
  },

  /** Every level's questions, the asked ones done (spec: the key for talk questions). */
  answerKey(_lesson, block, state) {
    return {
      title: 'Talk questions',
      rows: block.levels.flatMap((level, at) => {
        const order = state.orders[at] ?? []
        const asked = new Set(order.slice(0, Math.min(state.cursors[at] ?? 0, order.length)))
        return level.lines.map((line, i) => {
          const id = `${at}:${i}`
          return {
            id,
            label: level.label,
            value: line,
            mark: id === state.current ? ('current' as const) : asked.has(i) ? ('done' as const) : ('open' as const),
          }
        })
      }),
    }
  },

  isComplete(_lesson, _block, state) {
    return state.top
  },
}

/** The question on screen, or null before the first. */
export function talkQuestion(block: BlockOf<'talk'>, state: TalkState): string | null {
  if (state.current === null) return null
  const [level, index] = state.current.split(':').map(Number)
  return block.levels[level ?? -1]?.lines[index ?? -1] ?? null
}
