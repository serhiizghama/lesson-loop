import type { BlockLogic } from './contract'
import type { BlockType } from '../types'
import { cardsLogic } from './cards'
import { matchLogic } from './match'
import { sentenceLogic } from './sentence'
import { sortLogic } from './sort'
import { listenLogic } from './listen'
import { tprLogic } from './tpr'
import { finishLogic } from './finish'

/**
 * The one place a block type is registered. The mapped type makes the registry
 * exhaustive: adding a member to `Block` without a logic module is a compile error.
 */
export const blockLogic: { [T in BlockType]: BlockLogic<T> } = {
  cards: cardsLogic,
  match: matchLogic,
  sentence: sentenceLogic,
  sort: sortLogic,
  listen: listenLogic,
  tpr: tprLogic,
  finish: finishLogic,
}

export type { BlockLogic } from './contract'
export { listenChoices, listenTarget, DEFAULT_CHOICES } from './listen'
export { tprCurrent } from './tpr'
