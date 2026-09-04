import type { BlockOf, CardsState, Item } from '../types'
import { shuffleWithSeed } from '../rng'
import { faceValue, renderTemplate } from '../text'
import { resolveItems } from '../validate'
import type { BlockLogic } from './contract'

/** What a card says when it is tapped: the block's template, or the English word. */
export function cardsSpeech(block: BlockOf<'cards'>, item: Item): string {
  return renderTemplate(block.speak ?? '{en}', item)
}

export const cardsLogic: BlockLogic<'cards'> = {
  scored: true,
  init(lesson, block, seed) {
    return {
      order: shuffleWithSeed(
        resolveItems(lesson, block.items).map((i) => i.id),
        seed,
      ),
      flipped: [],
    }
  },

  reduce(_lesson, _block, state, action) {
    if (action.t !== 'tap') return state
    if (!state.order.includes(action.target)) return state
    // Revealing an already-revealed card changes nothing; the view still speaks it.
    if (state.flipped.includes(action.target)) return state
    return { ...state, flipped: [...state.flipped, action.target] }
  },

  /** What is behind each card, so the teacher can prompt without turning it over. */
  answerKey(lesson, block, state) {
    const items = new Map(resolveItems(lesson, block.items).map((i) => [i.id, i]))
    return {
      title: 'Behind the cards',
      rows: state.order.flatMap((id) => {
        const item = items.get(id)
        if (item === undefined) return []
        const back = block.back.map((face) => faceValue(item, face)).filter((v) => v !== null)
        return [{
          id,
          label: faceValue(item, block.front) ?? item.en,
          value: back.join(' · '),
          mark: state.flipped.includes(id) ? ('done' as const) : ('open' as const),
        }]
      }),
    }
  },

  isComplete(_lesson, _block, state: CardsState) {
    return state.order.length > 0 && state.flipped.length === state.order.length
  },
}
