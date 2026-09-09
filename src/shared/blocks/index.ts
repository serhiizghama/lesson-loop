import type { BlockLogic } from './contract'
import type { BlockType } from '../types'
import { cardsLogic } from './cards'
import { matchLogic } from './match'
import { sentenceLogic } from './sentence'
import { sortLogic } from './sort'
import { listenLogic } from './listen'
import { tprLogic } from './tpr'
import { phrasesLogic } from './phrases'
import { quizLogic } from './quiz'
import { describeLogic } from './describe'
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
  phrases: phrasesLogic,
  quiz: quizLogic,
  describe: describeLogic,
  finish: finishLogic,
}

export type { AnswerKey, AnswerKeyRow, BlockLogic } from './contract'
export { cardsSpeech } from './cards'
export { matchPairSpeech } from './match'
export { listenChoices, listenTarget, DEFAULT_CHOICES } from './listen'
export { tprCurrent } from './tpr'
export { phraseAt } from './phrases'
export { quizChoices, quizSpeech, quizTarget, DEFAULT_QUIZ_CHOICES } from './quiz'
export { currentItem, describeChoices, describeSentence } from './describe'
export { speakableLines } from './speakable'
