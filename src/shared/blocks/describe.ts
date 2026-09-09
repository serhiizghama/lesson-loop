import type { BlockOf, DescribeState, Item, Lesson, Side } from '../types'
import { seedFor, shuffleWithSeed } from '../rng'
import { faceValue, renderTemplate } from '../text'
import { resolveItems } from '../validate'
import type { BlockLogic } from './contract'

/** The sentence the two answers add up to, shown — and spoken — when the item is finished. */
export function describeSentence(block: BlockOf<'describe'>, item: Item): string {
  return renderTemplate(block.sentence, item)
}

/**
 * Two questions about one item, answered together.
 *
 * Neither answer advances the exercise on its own, which is the whole point: "red" and
 * "circle" are only useful in the same breath, and asking them as two exercises would
 * never put them there. Exactly two questions, because `pick` carries exactly two sides
 * and a third would be a change to the protocol (design D115).
 */
export const describeLogic: BlockLogic<'describe'> = {
  scored: true,

  init(lesson, block, seed): DescribeState {
    return {
      order: shuffleWithSeed(
        resolveItems(lesson, block.items).map((i) => i.id),
        seed,
      ),
      index: 0,
      given: { a: false, b: false },
      wrong: null,
    }
  },

  reduce(lesson, block, state, action) {
    if (action.t !== 'pick') return state
    if (state.index >= state.order.length) return state

    const item = currentItem(lesson, block, state)
    if (item === null) return state
    // An answered question is closed: neither a repeat of its answer nor a late wrong tap
    // on it changes anything.
    if (state.given[action.side]) return state

    const question = action.side === 'a' ? block.questions[0] : block.questions[1]
    if (action.target !== faceValue(item, question.face)) {
      if (state.wrong === action.side) return state
      return { ...state, wrong: action.side }
    }

    const given = { ...state.given, [action.side]: true }
    if (!given.a || !given.b) return { ...state, given, wrong: null }
    return {
      ...state,
      index: state.index + 1,
      given: { a: false, b: false },
      wrong: null,
    }
  },

  /** Both answers for the item being described (spec: the key for a description). */
  answerKey(lesson, block, state) {
    const item = currentItem(lesson, block, state)
    if (item === null) return { title: 'Now describing', rows: [] }
    return {
      title: 'Now describing',
      rows: block.questions.map((question, i) => {
        const side: Side = i === 0 ? 'a' : 'b'
        return {
          id: side,
          label: question.label,
          value: faceValue(item, question.face) ?? '',
          mark: state.given[side] ? ('done' as const) : ('current' as const),
        }
      }),
    }
  },

  isComplete(_lesson, _block, state) {
    return state.order.length > 0 && state.index >= state.order.length
  },
}

/** The item being described right now, or null when the exercise is finished. */
export function currentItem(
  lesson: Lesson,
  block: BlockOf<'describe'>,
  state: DescribeState,
): Item | null {
  const id = state.order[state.index]
  if (id === undefined) return null
  return resolveItems(lesson, block.items).find((i) => i.id === id) ?? null
}

/**
 * The choices for one of the two questions: the distinct values the selected items carry
 * for its face, in seeded order (design D118). They are the lesson's own vocabulary rather
 * than invented alternatives, and they are stable for the whole exercise — a row that
 * reshuffled under the learner between items would be a different question each time.
 */
export function describeChoices(
  lesson: Lesson,
  block: BlockOf<'describe'>,
  side: Side,
  seed: number,
): string[] {
  const question = side === 'a' ? block.questions[0] : block.questions[1]
  const values = new Set<string>()
  for (const item of resolveItems(lesson, block.items)) {
    const value = faceValue(item, question.face)
    if (value !== null) values.add(value)
  }
  return shuffleWithSeed([...values], seedFor(seed, 'choices', 0, side))
}
