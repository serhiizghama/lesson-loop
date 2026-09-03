import type { BlockLogic } from './contract'

/** The closing screen. It is a slide, not an exercise: it never gates progress. */
export const finishLogic: BlockLogic<'finish'> = {
  scored: false,
  init() {
    return { seen: false }
  },

  reduce(_lesson, _block, state, action) {
    if (action.t !== 'tap' || state.seen) return state
    return { seen: true }
  },

  isComplete() {
    return true
  },
}
