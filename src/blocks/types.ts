import type { ReactElement } from 'react'
import type { Action, BlockOf, BlockStateMap, BlockType, Lesson } from '@/shared/types'
import type { Speech } from '@/speech/speech'

export type BlockViewProps<T extends BlockType> = {
  lesson: Lesson
  block: BlockOf<T>
  state: BlockStateMap[T]
  /** Already mixed with the block id and its reset generation. */
  seed: number
  dispatch: (action: Action) => void
  speech: Speech
}

export type BlockView<T extends BlockType> = (props: BlockViewProps<T>) => ReactElement
