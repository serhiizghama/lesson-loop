import { describe, expect, it } from 'vitest'
import { testLesson, testState } from '../__fixtures__/lesson'
import { answerKeyFor, applyAction, blockStateOf, isBlockComplete } from '../reducer'
import { seedFor } from '../rng'
import { trueAnswer, yesnoLogic, yesnoReply } from './yesno'
import type { Action, Block, BlockOf, Lesson, LessonState, YesNoState } from '../types'

const opinion: BlockOf<'yesno'> = {
  id: 'like', type: 'yesno', title: 'Do you like…?', items: { select: 'ids', ids: ['dog', 'cat', 'lion'] },
  question: 'Do you like the {en}?', yes: 'Yes, I do. I like the {en}.', no: "No, I don't. I don't like the {en}.",
}
const check: BlockOf<'yesno'> = {
  id: 'is', type: 'yesno', title: 'Is this your…?', items: { select: 'ids', ids: ['dog', 'cat', 'lion'] },
  question: 'Is this a {en}?', yes: 'Yes, it is. It is a {en}.', no: "No, it isn't. It is a {en}.", check: true,
}

function lessonWith(block: Block): Lesson {
  return { ...testLesson(), blocks: [block] }
}

function play(block: Block, actions: Action[], from: LessonState = testState()) {
  const lesson = lessonWith(block)
  const state = actions.reduce((s, a) => applyAction(lesson, s, a), from)
  return { lesson, state, block: blockStateOf(lesson, state, block) as YesNoState }
}

const tap = (block: Block, target: string): Action => ({ t: 'tap', block: block.id, target })

/** A seed whose first question in a check is false — the case a check exists for. */
function seedWithFalseFirst(): number {
  for (let seed = 1; seed < 500; seed++) {
    const s = play(check, [], testState(seed)).block
    if (s.asked[0] !== s.order[0]) return seed
  }
  throw new Error('no seed asks a false first question')
}

describe('yesno', () => {
  it('asks about every selected item, the question naming the item shown in an opinion', () => {
    const { block } = play(opinion, [])
    expect([...block.order].sort()).toEqual(['cat', 'dog', 'lion'])
    expect(block.asked).toEqual(block.order)
  })

  it('accepts either answer to an opinion', () => {
    for (const answer of ['yes', 'no']) {
      const { block } = play(opinion, [tap(opinion, answer)])
      expect(block.answer).toBe(answer)
      expect(block.wrong).toBeNull()
    }
  })

  it('accepts only the true answer to a check, and replies about the item shown', () => {
    const from = testState(seedWithFalseFirst())
    const first = play(check, [], from)
    expect(trueAnswer(first.block)).toBe('no')

    const wrong = play(check, [tap(check, 'yes')], from)
    expect(wrong.block.answer).toBeNull()
    expect(wrong.block.wrong).toBe('yes')

    const right = play(check, [tap(check, 'yes'), tap(check, 'no')], from)
    expect(right.block.answer).toBe('no')
    expect(right.block.wrong).toBeNull()
    const shown = right.lesson.items.find((i) => i.id === right.block.order[0])!
    expect(yesnoReply(check, shown, 'no')).toBe(`No, it isn't. It is a ${shown.en}.`)
  })

  it('returns the same state for a repeated wrong answer', () => {
    const from = testState(seedWithFalseFirst())
    const lesson = lessonWith(check)
    const once = applyAction(lesson, from, tap(check, 'yes'))
    expect(applyAction(lesson, once, tap(check, 'yes'))).toBe(once)
  })

  it('refuses a second answer once one is given', () => {
    const lesson = lessonWith(opinion)
    const answered = applyAction(lesson, testState(), tap(opinion, 'yes'))
    expect(applyAction(lesson, answered, tap(opinion, 'no'))).toBe(answered)
  })

  it('moves on only after an answer, and only by naming the item being left', () => {
    const lesson = lessonWith(opinion)
    const initial = blockStateOf(lesson, testState(), opinion) as YesNoState
    const shown = initial.order[0] as string
    const other = initial.order[1] as string

    const early = applyAction(lesson, testState(), tap(opinion, shown))
    expect(blockStateOf(lesson, early, opinion)).toEqual(initial)

    const answered = applyAction(lesson, testState(), tap(opinion, 'yes'))
    expect(applyAction(lesson, answered, tap(opinion, other))).toBe(answered)

    const moved = blockStateOf(lesson, applyAction(lesson, answered, tap(opinion, shown)), opinion) as YesNoState
    expect(moved.index).toBe(1)
    expect(moved.answer).toBeNull()
  })

  it('is complete when the last item is answered, without a tap after the reply', () => {
    const lesson = lessonWith(opinion)
    let state = testState()
    const order = (blockStateOf(lesson, state, opinion) as YesNoState).order
    for (const [at, id] of order.entries()) {
      expect(isBlockComplete(lesson, state, opinion)).toBe(false)
      state = applyAction(lesson, state, tap(opinion, 'no'))
      if (at < order.length - 1) state = applyAction(lesson, state, tap(opinion, id))
    }
    expect(isBlockComplete(lesson, state, opinion)).toBe(true)
    const done = state
    expect(applyAction(lesson, done, tap(opinion, order[order.length - 1] as string))).toBe(done)
  })

  it('asks the same questions for the same seed, and fresh ones after a reset', () => {
    const lesson = lessonWith(check)
    const a = yesnoLogic.init(lesson, check, seedFor(4242, 'is', 0))
    const b = yesnoLogic.init(lesson, check, seedFor(4242, 'is', 0))
    expect(a).toEqual(b)
    const differs = [1, 2, 3, 4, 5].some((generation) => {
      const c = yesnoLogic.init(lesson, check, seedFor(4242, 'is', generation))
      return JSON.stringify(c) !== JSON.stringify(a)
    })
    expect(differs).toBe(true)
  })

  it('asks a false question about half the time', () => {
    const lesson = lessonWith(check)
    let questions = 0
    let falseOnes = 0
    for (let seed = 1; seed <= 200; seed++) {
      const s = yesnoLogic.init(lesson, check, seed)
      questions += s.order.length
      falseOnes += s.order.filter((id, at) => s.asked[at] !== id).length
    }
    const share = falseOnes / questions
    expect(share).toBeGreaterThan(0.35)
    expect(share).toBeLessThan(0.65)
  })

  it('never names an item outside the selection', () => {
    const lesson = lessonWith(check)
    for (let seed = 1; seed <= 50; seed++) {
      const s = yesnoLogic.init(lesson, check, seed)
      for (const id of s.asked) expect(['dog', 'cat', 'lion']).toContain(id)
    }
  })

  it('keys each question with its true answer and reply in a check', () => {
    const from = testState(seedWithFalseFirst())
    const { lesson, state } = play(check, [], from)
    const key = answerKeyFor(lesson, state, check)!
    expect(key.rows).toHaveLength(3)
    const first = key.rows[0]!
    expect(first.mark).toBe('current')
    expect(first.value.startsWith("No — No, it isn't. It is a")).toBe(true)
    const answered = applyAction(lesson, state, tap(check, trueAnswer(blockStateOf(lesson, state, check) as YesNoState)))
    expect(answerKeyFor(lesson, answered, check)!.rows[0]!.mark).toBe('done')
  })
})
