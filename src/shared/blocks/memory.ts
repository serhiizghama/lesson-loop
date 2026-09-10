import type { BlockOf, Face, Item, MemoryState, Side } from '../types'
import { seedFor, shuffleWithSeed } from '../rng'
import { faceValue, itemById, renderTemplate } from '../text'
import { resolveItems } from '../validate'
import type { BlockLogic } from './contract'

/**
 * A card is `<itemId>#a` or `<itemId>#b` — the item it shows and which of the block's two
 * faces it shows it by. An id rather than an index because the board is shuffled and both
 * screens must name the same card in an action.
 */
export function cardId(itemId: string, side: Side): string {
  return `${itemId}#${side}`
}

export function cardItem(card: string): string {
  return card.slice(0, card.lastIndexOf('#'))
}

/** Which of the block's two faces a card shows. */
export function cardFace(block: BlockOf<'memory'>, card: string): Face {
  return card.endsWith('#a') ? block.left : block.right
}

/** What a closed pair says, or null when the block declares nothing (design D130). */
export function memoryPairSpeech(block: BlockOf<'memory'>, item: Item): string | null {
  return block.speak === undefined ? null : renderTemplate(block.speak, item)
}

export const memoryLogic: BlockLogic<'memory'> = {
  scored: true,
  init(lesson, block, seed) {
    const all = resolveItems(lesson, block.items).map((i) => i.id)
    const count = Math.min(block.count ?? all.length, all.length)
    const chosen = shuffleWithSeed(all, seedFor(seed, 'pick', 0)).slice(0, count)
    const cards = chosen.flatMap((id) => [cardId(id, 'a'), cardId(id, 'b')])
    return {
      order: shuffleWithSeed(cards, seedFor(seed, 'board', 0)),
      up: [],
      matched: [],
      tries: 0,
    }
  },

  reduce(_lesson, _block, state, action) {
    if (action.t !== 'tap') return state
    if (!state.order.includes(action.target)) return state
    if (state.matched.includes(action.target)) return state
    if (state.up.includes(action.target)) return state

    // A miss is cleared by the next tap rather than by a timer (design D129): the model has
    // no clock, and with two people in the room there is no one timer to own the delay.
    // The tap that clears it is also the first card of the next try, so nothing is spent.
    if (state.up.length === 2) {
      return { ...state, up: [action.target] }
    }

    const first = state.up[0]
    if (first === undefined) return { ...state, up: [action.target] }

    const tries = state.tries + 1
    if (cardItem(first) === cardItem(action.target)) {
      return {
        ...state,
        up: [],
        matched: [...state.matched, first, action.target],
        tries,
      }
    }
    return { ...state, up: [first, action.target], tries }
  },

  /** Where each pair is lying (spec: the key for a memory exercise). */
  answerKey(lesson, block, state) {
    const items = new Map(resolveItems(lesson, block.items).map((i) => [i.id, i]))
    const seen: string[] = []
    for (const card of state.order) {
      const id = cardItem(card)
      if (!seen.includes(id)) seen.push(id)
    }
    return {
      title: 'Pairs',
      rows: seen.flatMap((id) => {
        const item = items.get(id) ?? itemById(lesson, id)
        if (item === undefined) return []
        const at = state.order
          .flatMap((card, index) => (cardItem(card) === id ? [index + 1] : []))
          .join(' & ')
        const cards = [cardId(id, 'a'), cardId(id, 'b')]
        return [{
          id,
          label: faceValue(item, block.left) ?? item.en,
          value: `${faceValue(item, block.right) ?? item.en} · ${at}`,
          mark: cards.every((c) => state.matched.includes(c))
            ? ('done' as const)
            : cards.some((c) => state.up.includes(c)) ? ('current' as const) : ('open' as const),
        }]
      }),
    }
  },

  isComplete(_lesson, _block, state: MemoryState) {
    return state.order.length > 0 && state.matched.length === state.order.length
  },
}
