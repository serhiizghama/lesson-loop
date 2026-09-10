import type { BlockOf, HotspotState, Item, Spot } from '../types'
import { shuffleWithSeed } from '../rng'
import { resolveItems } from '../validate'
import { itemById, renderTemplate } from '../text'
import type { BlockLogic } from './contract'

/**
 * What a correct placement says, or null when the block declares nothing — the same rule
 * `match` follows for a closed pair: the sentence belongs to the moment the word lands on
 * the thing it names, not to the tap that picked it up.
 */
export function hotspotSpeech(block: BlockOf<'hotspot'>, item: Item): string | null {
  return block.speak === undefined ? null : renderTemplate(block.speak, item)
}

export const hotspotLogic: BlockLogic<'hotspot'> = {
  scored: true,
  init(lesson, block, seed) {
    return {
      order: shuffleWithSeed(
        resolveItems(lesson, block.items).map((i) => i.id),
        seed,
      ),
      selected: null,
      placed: [],
      wrong: null,
    }
  },

  reduce(_lesson, block, state, action) {
    if (action.t !== 'pick') return state

    // Side a is a word from the bank.
    if (action.side === 'a') {
      if (!state.order.includes(action.target)) return state
      if (state.placed.includes(action.target)) return state
      if (state.selected === action.target && state.wrong === null) return state
      return { ...state, selected: action.target, wrong: null }
    }

    // Side b is a place on the drawing. Tapping one with nothing in hand is a no-op and
    // not a mistake: a child exploring the picture has not answered anything yet.
    if (state.selected === null) return state
    if (block.spots[action.target] === undefined) return state
    if (state.placed.includes(action.target)) return state

    if (action.target === state.selected) {
      return {
        ...state,
        placed: [...state.placed, state.selected],
        selected: null,
        wrong: null,
      }
    }
    return { ...state, wrong: { item: state.selected, spot: action.target } }
  },

  /** Where each word belongs, said in words (spec: the key for a diagram-labelling exercise). */
  answerKey(lesson, block, state) {
    return {
      title: 'Where each word goes',
      rows: state.order.flatMap((id) => {
        const item = itemById(lesson, id)
        const spot = block.spots[id]
        if (item === undefined || spot === undefined) return []
        return [{
          id,
          label: item.en,
          value: spotInWords(spot),
          mark: state.placed.includes(id)
            ? ('done' as const)
            : state.selected === id ? ('current' as const) : ('open' as const),
        }]
      }),
    }
  },

  isComplete(_lesson, _block, state: HotspotState) {
    return state.order.length > 0 && state.placed.length === state.order.length
  },
}

const ROWS = ['top', 'upper', 'middle', 'lower', 'bottom'] as const
const COLUMNS = ['left', 'centre', 'right'] as const

/**
 * A place named the way a teacher can say it out loud over a video call (design D133):
 * "nose — middle · centre", never a pair of coordinates.
 *
 * Fifths down and thirds across, because a scene may stand a head on its own beside a
 * figure (design D128): thirds would put the eyes and the nose in one band and read the
 * same for both, while fifths tell every part of the body scene apart.
 */
export function spotInWords([x, y, width, height]: Spot): string {
  const row = ROWS[band(y + height / 2, ROWS.length)] ?? 'middle'
  const column = COLUMNS[band(x + width / 2, COLUMNS.length)] ?? 'centre'
  return `${row} · ${column}`
}

function band(fraction: number, bands: number): number {
  return Math.min(bands - 1, Math.max(0, Math.floor(fraction * bands)))
}
