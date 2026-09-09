import type { BlockOf, PhrasesState } from '../types'
import type { BlockLogic } from './contract'

/**
 * The model phrases of a lesson, heard one at a time.
 *
 * The only exercise with nothing to be right about that still scores (design D119): a
 * phrase cannot be tapped wrongly, but hearing all of them is a thing a learner can
 * finish, which is what the star trail counts. `tpr` is scored on the same grounds.
 *
 * Phrases keep the order they are declared in — they are not shuffled. A list that opens
 * with the question and answers it two lines later is written that way on purpose, and a
 * shuffle would take the teaching out of the sequence.
 */
export const phrasesLogic: BlockLogic<'phrases'> = {
  scored: true,

  init(_lesson, _block, _seed): PhrasesState {
    return { played: [] }
  },

  reduce(_lesson, block, state, action) {
    if (action.t !== 'tap') return state
    if (!indexOf(block, action.target)) return state
    if (state.played.includes(action.target)) return state
    return { played: [...state.played, action.target] }
  },

  /**
   * Every phrase the exercise contains, so the teacher can read ahead and model the next
   * one (spec: the key for a phrase list). The label is the phrase's number rather than
   * the phrase, because the phrase is the thing worth reading and belongs in the wider
   * column.
   */
  answerKey(_lesson, block, state) {
    return {
      title: 'Phrases',
      rows: block.lines.map((line, i) => ({
        id: String(i),
        label: `${i + 1}.`,
        value: line,
        mark: state.played.includes(String(i)) ? ('done' as const) : ('open' as const),
      })),
    }
  },

  isComplete(_lesson, block, state) {
    return block.lines.length > 0 && state.played.length === block.lines.length
  },
}

/** Whether `target` names a phrase of this block. Indices travel as strings, like every action target. */
function indexOf(block: BlockOf<'phrases'>, target: string): boolean {
  const index = Number(target)
  return Number.isInteger(index) && index >= 0 && index < block.lines.length
}

/** The phrase at an action target, or null when the target names none. */
export function phraseAt(block: BlockOf<'phrases'>, target: string): string | null {
  return indexOf(block, target) ? (block.lines[Number(target)] ?? null) : null
}
