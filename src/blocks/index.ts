import type { BlockType } from '@/shared/types'
import type { BlockView } from './types'
import { CardsView } from './CardsView'
import { MatchView } from './MatchView'
import { SentenceView } from './SentenceView'
import { SortView } from './SortView'
import { ListenView } from './ListenView'
import { TprView } from './TprView'
import { PhrasesView } from './PhrasesView'
import { QuizView } from './QuizView'
import { DescribeView } from './DescribeView'
import { HotspotView } from './HotspotView'
import { MemoryView } from './MemoryView'
import { ScrambleView } from './ScrambleView'
import { FinishView } from './FinishView'

/** Views are registered exactly like the logic: a missing type is a compile error. */
export const blockViews: { [T in BlockType]: BlockView<T> } = {
  cards: CardsView,
  match: MatchView,
  sentence: SentenceView,
  sort: SortView,
  listen: ListenView,
  tpr: TprView,
  phrases: PhrasesView,
  quiz: QuizView,
  describe: DescribeView,
  hotspot: HotspotView,
  memory: MemoryView,
  scramble: ScrambleView,
  finish: FinishView,
}

export type { BlockView, BlockViewProps } from './types'
