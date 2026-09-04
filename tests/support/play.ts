import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { validateLesson, resolveItems } from '../../src/shared/validate'
import { applyAction, blockStateOf } from '../../src/shared/reducer'
import type { Action, Block, Lesson, LessonState } from '../../src/shared/types'
import type { CardsState, ListenState, MatchState, SortState, TprState } from '../../src/shared/types'

const dir = join(process.cwd(), 'lessons')

export const lessonFiles: string[] = readdirSync(dir).filter((f) => f.endsWith('.json'))

export function loadLesson(file: string): Lesson {
  const result = validateLesson(JSON.parse(readFileSync(join(dir, file), 'utf8')))
  if (!result.ok) throw new Error(result.errors.join('\n'))
  return result.lesson
}

/**
 * Plays a block the way a learner who never guesses wrong would. Keyed by block type
 * rather than by lesson, so a new lesson needs nothing added here.
 */
export function complete(lesson: Lesson, state: LessonState, block: Block): LessonState {
  const act = (action: Action) => {
    state = applyAction(lesson, state, action)
  }
  const current = <T>() => blockStateOf(lesson, state, block) as T

  switch (block.type) {
    case 'cards':
      for (const id of current<CardsState>().order) act({ t: 'tap', block: block.id, target: id })
      break
    case 'match':
      for (const id of current<MatchState>().orderA) {
        act({ t: 'pick', block: block.id, side: 'a', target: id })
        act({ t: 'pick', block: block.id, side: 'b', target: id })
      }
      break
    case 'sentence': {
      const first = resolveItems(lesson, block.items)[0]
      if (first) act({ t: 'tap', block: block.id, target: first.id })
      act({ t: 'level', block: block.id, level: block.levels.length - 1 })
      break
    }
    case 'sort':
      for (const id of current<SortState>().order) {
        const bucket = lesson.items.find((i) => i.id === id)?.tags?.[block.by]
        act({ t: 'pick', block: block.id, side: 'a', target: id })
        if (bucket !== undefined) act({ t: 'pick', block: block.id, side: 'b', target: bucket })
      }
      break
    case 'listen':
      for (let i = 0; i < current<ListenState>().order.length; i++) {
        const listen = current<ListenState>()
        const target = listen.order[listen.index]
        if (target !== undefined) act({ t: 'tap', block: block.id, target })
      }
      break
    case 'tpr': {
      const order = current<TprState>().order
      for (let i = 0; i <= order.length; i++) {
        const tpr = current<TprState>()
        const target = tpr.started ? tpr.order[tpr.index] : tpr.order[0]
        if (target !== undefined) act({ t: 'tap', block: block.id, target })
      }
      break
    }
    case 'finish':
      act({ t: 'tap', block: block.id, target: block.id })
      break
  }
  return state
}

/** Every block played to completion, in order — the largest a lesson's state ever gets. */
export function playToTheEnd(lesson: Lesson, state: LessonState): LessonState {
  for (const [index, block] of lesson.blocks.entries()) {
    state = applyAction(lesson, state, { t: 'nav', slide: index })
    state = complete(lesson, state, block)
  }
  return state
}
