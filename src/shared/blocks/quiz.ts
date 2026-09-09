import type { BlockOf, Item, Lesson, QuizState } from '../types'
import { seedFor, shuffleWithSeed } from '../rng'
import { faceValue, renderTemplate } from '../text'
import { resolveItems } from '../validate'
import type { BlockLogic } from './contract'

export const DEFAULT_QUIZ_CHOICES = 4

/**
 * What a correctly answered prompt says, which is the plain English word unless the block
 * declares otherwise. Said on the answer rather than on the prompt: a line naming the item
 * would give the answer away while the learner is still choosing, exactly as it would in a
 * themed match.
 */
export function quizSpeech(block: BlockOf<'quiz'>, item: Item): string {
  return renderTemplate(block.speak ?? '{en}', item)
}

/**
 * Something is shown and the learner taps the item it names.
 *
 * The progression is `listen`'s — one target at a time, wrong answers cost nothing,
 * complete when the order runs out — and the state is deliberately the same shape. What
 * differs is where the question comes from: `listen` asks with a spoken word and this asks
 * with something on the screen, which is why the two are separate types (design D116).
 */
export const quizLogic: BlockLogic<'quiz'> = {
  scored: true,

  init(lesson, block, seed): QuizState {
    return {
      order: shuffleWithSeed(
        resolveItems(lesson, block.items).map((i) => i.id),
        seed,
      ),
      index: 0,
      answered: [],
      wrong: null,
    }
  },

  reduce(_lesson, _block, state, action) {
    if (action.t !== 'tap') return state
    if (state.index >= state.order.length) return state
    if (!state.order.includes(action.target)) return state

    const target = state.order[state.index] as string
    if (action.target !== target) {
      if (state.wrong === action.target) return state
      return { ...state, wrong: action.target }
    }
    return { ...state, index: state.index + 1, answered: [...state.answered, target], wrong: null }
  },

  /** The prompt being asked against the choice that answers it (spec: the key for a quiz). */
  answerKey(lesson, block, state) {
    const items = new Map(resolveItems(lesson, block.items).map((i) => [i.id, i]))
    const target = quizTarget(state)
    return {
      title: 'Prompts in order',
      rows: state.order.flatMap((id) => {
        const item = items.get(id)
        if (item === undefined) return []
        return [{
          id,
          label: faceValue(item, block.ask) ?? item.en,
          value: faceValue(item, block.show) ?? item.en,
          mark: state.answered.includes(id)
            ? ('done' as const)
            : id === target ? ('current' as const) : ('open' as const),
        }]
      }),
    }
  },

  isComplete(_lesson, _block, state) {
    return state.order.length > 0 && state.answered.length === state.order.length
  },
}

/** The item being asked about right now, or null when the exercise is finished. */
export function quizTarget(state: QuizState): string | null {
  return state.order[state.index] ?? null
}

/**
 * The choices offered for the current prompt: the answer plus distractors from the
 * block's own selection, derived from the seed so both screens offer the same set in the
 * same places. Clamped to the selection, so a four-item lesson offers four choices rather
 * than four with the answer in twice (design D117).
 */
export function quizChoices(
  lesson: Lesson,
  block: BlockOf<'quiz'>,
  state: QuizState,
  seed: number,
): Item[] {
  const target = quizTarget(state)
  if (target === null) return []
  const pool = resolveItems(lesson, block.items)
  const wanted = Math.min(block.count ?? DEFAULT_QUIZ_CHOICES, pool.length)
  const distractors = shuffleWithSeed(
    pool.filter((i) => i.id !== target).map((i) => i.id),
    seedFor(seed, 'distractors', state.index),
  ).slice(0, wanted - 1)
  const ids = shuffleWithSeed([target, ...distractors], seedFor(seed, 'choices', state.index))
  const byId = new Map(pool.map((i) => [i.id, i]))
  return ids.flatMap((id) => {
    const item = byId.get(id)
    return item ? [item] : []
  })
}
