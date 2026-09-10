import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { validateLesson, resolveItems } from '../../src/shared/validate'
import { applyAction, blockStateOf } from '../../src/shared/reducer'
import type { Action, Block, Lesson, LessonState } from '../../src/shared/types'
import type {
  CardsState, DescribeState, HotspotState, ListenState, MatchState, MemoryState, QuizState,
  ScrambleState, SortState, TprState,
} from '../../src/shared/types'
import { faceValue } from '../../src/shared/text'
import { cardId, cardItem, sentenceWords } from '../../src/shared/blocks'

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
    case 'phrases':
      for (let i = 0; i < block.lines.length; i++) act({ t: 'tap', block: block.id, target: String(i) })
      break
    case 'quiz':
      for (let i = 0; i < current<QuizState>().order.length; i++) {
        const quiz = current<QuizState>()
        const target = quiz.order[quiz.index]
        if (target !== undefined) act({ t: 'tap', block: block.id, target })
      }
      break
    case 'describe': {
      const items = new Map(resolveItems(lesson, block.items).map((i) => [i.id, i]))
      for (let i = 0; i < current<DescribeState>().order.length; i++) {
        const describe = current<DescribeState>()
        const item = items.get(describe.order[describe.index] ?? '')
        if (item === undefined) continue
        const [first, second] = block.questions
        const a = faceValue(item, first.face)
        const b = faceValue(item, second.face)
        if (a !== null) act({ t: 'pick', block: block.id, side: 'a', target: a })
        if (b !== null) act({ t: 'pick', block: block.id, side: 'b', target: b })
      }
      break
    }
    case 'hotspot':
      for (const id of current<HotspotState>().order) {
        act({ t: 'pick', block: block.id, side: 'a', target: id })
        act({ t: 'pick', block: block.id, side: 'b', target: id })
      }
      break
    case 'memory': {
      const seen: string[] = []
      for (const card of current<MemoryState>().order) {
        const id = cardItem(card)
        if (!seen.includes(id)) seen.push(id)
      }
      for (const id of seen) {
        act({ t: 'tap', block: block.id, target: cardId(id, 'a') })
        act({ t: 'tap', block: block.id, target: cardId(id, 'b') })
      }
      break
    }
    case 'scramble': {
      const items = new Map(resolveItems(lesson, block.items).map((i) => [i.id, i]))
      for (let i = 0; i < current<ScrambleState>().order.length; i++) {
        const scramble = current<ScrambleState>()
        const target = scramble.order[scramble.index]
        const item = target === undefined ? undefined : items.get(target)
        if (item === undefined || target === undefined) continue
        for (const word of sentenceWords(block, item)) {
          act({ t: 'pick', block: block.id, side: 'a', target: word })
        }
        act({ t: 'tap', block: block.id, target })
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
