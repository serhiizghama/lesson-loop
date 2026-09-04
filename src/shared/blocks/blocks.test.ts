import { describe, expect, it } from 'vitest'
import { testLesson, testState } from '../__fixtures__/lesson'
import { applyAction, blockById, blockStateOf, isBlockComplete } from '../reducer'
import { cardsSpeech, listenChoices, listenTarget, matchPairSpeech, tprCurrent } from './index'
import { seedFor } from '../rng'
import type {
  Action, BlockOf, CardsState, LessonState, ListenState, MatchState, SentenceState, SortState, TprState,
} from '../types'

const lesson = testLesson()

function block(id: string) {
  const found = blockById(lesson, id)
  if (!found) throw new Error(`no block ${id}`)
  return found
}

/** Applies actions in order and returns the final lesson state. */
function run(actions: Action[], from: LessonState = testState()): LessonState {
  return actions.reduce((state, action) => applyAction(lesson, state, action), from)
}

function stateOf<T>(state: LessonState, id: string): T {
  return blockStateOf(lesson, state, block(id)) as T
}

describe('cards', () => {
  it('reveals a card when it is tapped', () => {
    const before = stateOf<CardsState>(testState(), 'vocab')
    const after = stateOf<CardsState>(run([{ t: 'tap', block: 'vocab', target: before.order[0]! }]), 'vocab')
    expect(after.flipped).toEqual([before.order[0]])
  })

  it('ignores a second tap on an already revealed card', () => {
    const first = stateOf<CardsState>(testState(), 'vocab').order[0]!
    const once = run([{ t: 'tap', block: 'vocab', target: first }])
    const twice = applyAction(lesson, once, { t: 'tap', block: 'vocab', target: first })
    expect(twice).toBe(once)
  })

  it('is complete when the last card is revealed', () => {
    const order = stateOf<CardsState>(testState(), 'vocab').order
    const state = run(order.map((id) => ({ t: 'tap', block: 'vocab', target: id }) as Action))
    expect(isBlockComplete(lesson, state, block('vocab'))).toBe(true)
  })
})

describe('match', () => {
  const initial = stateOf<MatchState>(testState(), 'pairs')

  it('offers only as many pairs as the block asks for', () => {
    expect(initial.orderA).toHaveLength(3)
    expect([...initial.orderA].sort()).toEqual([...initial.orderB].sort())
  })

  it('locks in a correct pair and takes it out of play', () => {
    const id = initial.orderA[0]!
    const state = run([
      { t: 'pick', block: 'pairs', side: 'a', target: id },
      { t: 'pick', block: 'pairs', side: 'b', target: id },
    ])
    const match = stateOf<MatchState>(state, 'pairs')
    expect(match.paired).toEqual([id])
    expect(match.selected).toBeNull()
    expect(match.wrong).toBeNull()
  })

  it('refuses a wrong pair, keeps both in play and clears the selection', () => {
    const a = initial.orderA[0]!
    const b = initial.orderA[1]!
    const match = stateOf<MatchState>(
      run([
        { t: 'pick', block: 'pairs', side: 'a', target: a },
        { t: 'pick', block: 'pairs', side: 'b', target: b },
      ]),
      'pairs',
    )
    expect(match.paired).toEqual([])
    expect(match.selected).toBeNull()
    expect(match.wrong).toEqual({ a, b })
  })

  it('moves the selection when the same side is tapped twice', () => {
    const match = stateOf<MatchState>(
      run([
        { t: 'pick', block: 'pairs', side: 'a', target: initial.orderA[0]! },
        { t: 'pick', block: 'pairs', side: 'a', target: initial.orderA[1]! },
      ]),
      'pairs',
    )
    expect(match.selected).toEqual({ side: 'a', id: initial.orderA[1] })
    expect(match.paired).toEqual([])
  })

  it('ignores a tap on an already matched item', () => {
    const id = initial.orderA[0]!
    const paired = run([
      { t: 'pick', block: 'pairs', side: 'a', target: id },
      { t: 'pick', block: 'pairs', side: 'b', target: id },
    ])
    expect(applyAction(lesson, paired, { t: 'pick', block: 'pairs', side: 'a', target: id })).toBe(paired)
  })

  it('is complete when every pair is made', () => {
    const actions = initial.orderA.flatMap((id): Action[] => [
      { t: 'pick', block: 'pairs', side: 'a', target: id },
      { t: 'pick', block: 'pairs', side: 'b', target: id },
    ])
    expect(isBlockComplete(lesson, run(actions), block('pairs'))).toBe(true)
  })
})

describe('sentence', () => {
  it('keeps the chosen item while the level grows', () => {
    const state = run([
      { t: 'tap', block: 'say', target: 'dog' },
      { t: 'level', block: 'say', level: 2 },
    ])
    const sentence = stateOf<SentenceState>(state, 'say')
    expect(sentence.item).toBe('dog')
    expect(sentence.level).toBe(2)
  })

  it('refuses a level the block does not have', () => {
    const state = run([{ t: 'tap', block: 'say', target: 'dog' }])
    expect(applyAction(lesson, state, { t: 'level', block: 'say', level: 9 })).toBe(state)
    expect(applyAction(lesson, state, { t: 'level', block: 'say', level: -1 })).toBe(state)
  })

  it('does not un-earn progress when the learner steps back down', () => {
    const state = run([
      { t: 'tap', block: 'say', target: 'dog' },
      { t: 'level', block: 'say', level: 2 },
      { t: 'level', block: 'say', level: 0 },
    ])
    expect(isBlockComplete(lesson, state, block('say'))).toBe(true)
  })
})

describe('sort', () => {
  it('keeps a correct placement', () => {
    const state = run([
      { t: 'pick', block: 'homes', side: 'a', target: 'lion' },
      { t: 'pick', block: 'homes', side: 'b', target: 'jungle' },
    ])
    const sort = stateOf<SortState>(state, 'homes')
    expect(sort.placed).toEqual({ lion: 'jungle' })
    expect(sort.wrong).toBeNull()
  })

  it('refuses a wrong placement and leaves the item unplaced', () => {
    const sort = stateOf<SortState>(
      run([
        { t: 'pick', block: 'homes', side: 'a', target: 'lion' },
        { t: 'pick', block: 'homes', side: 'b', target: 'farm' },
      ]),
      'homes',
    )
    expect(sort.placed).toEqual({})
    expect(sort.wrong).toEqual({ item: 'lion', bucket: 'farm' })
  })

  it('ignores a bucket tapped with nothing selected', () => {
    const start = testState()
    expect(applyAction(lesson, start, { t: 'pick', block: 'homes', side: 'b', target: 'farm' })).toBe(start)
  })

  it('is complete when every item is placed', () => {
    const homes = block('homes') as BlockOf<'sort'>
    const actions = lesson.items.flatMap((item): Action[] => [
      { t: 'pick', block: homes.id, side: 'a', target: item.id },
      { t: 'pick', block: homes.id, side: 'b', target: item.tags!['habitat']! },
    ])
    expect(isBlockComplete(lesson, run(actions), homes)).toBe(true)
  })
})

describe('listen', () => {
  const initial = stateOf<ListenState>(testState(), 'ears')

  it('offers the target among the requested number of choices', () => {
    const choices = listenChoices(lesson, block('ears') as BlockOf<'listen'>, initial, seedFor(4242, 'ears', 0))
    expect(choices).toHaveLength(3)
    expect(choices.map((c) => c.id)).toContain(listenTarget(initial))
  })

  it('advances on a correct answer', () => {
    const state = run([{ t: 'tap', block: 'ears', target: initial.order[0]! }])
    const listen = stateOf<ListenState>(state, 'ears')
    expect(listen.index).toBe(1)
    expect(listen.answered).toEqual([initial.order[0]])
    expect(listen.wrong).toBeNull()
  })

  it('keeps the target and records nothing on a wrong answer', () => {
    const listen = stateOf<ListenState>(
      run([{ t: 'tap', block: 'ears', target: initial.order[1]! }]),
      'ears',
    )
    expect(listen.index).toBe(0)
    expect(listen.answered).toEqual([])
    expect(listen.wrong).toBe(initial.order[1])
  })

  it('is complete once every target is answered', () => {
    const state = run(initial.order.map((id) => ({ t: 'tap', block: 'ears', target: id }) as Action))
    expect(isBlockComplete(lesson, state, block('ears'))).toBe(true)
    expect(listenTarget(stateOf<ListenState>(state, 'ears'))).toBeNull()
  })
})

describe('tpr', () => {
  const initial = stateOf<TprState>(testState(), 'move')

  it('gives three distinct instructions over a start and two advances', () => {
    const seen: string[] = []
    let state = testState() as LessonState
    for (let i = 0; i < 3; i++) {
      state = applyAction(lesson, state, { t: 'tap', block: 'move', target: initial.order[i === 0 ? 0 : i - 1]! })
      const current = tprCurrent(stateOf<TprState>(state, 'move'))
      if (current !== null) seen.push(current)
    }
    expect(new Set(seen).size).toBe(seen.length)
    expect(seen.length).toBeGreaterThanOrEqual(2)
  })

  it('records no correctness at all', () => {
    const state = run([{ t: 'tap', block: 'move', target: initial.order[0]! }])
    expect(Object.keys(stateOf<TprState>(state, 'move')).sort()).toEqual(['index', 'order', 'started'])
  })

  it('ignores a stale advance rather than skipping an instruction', () => {
    const started = run([{ t: 'tap', block: 'move', target: initial.order[0]! }])
    const advanced = applyAction(lesson, started, { t: 'tap', block: 'move', target: initial.order[0]! })
    const stale = applyAction(lesson, advanced, { t: 'tap', block: 'move', target: initial.order[0]! })
    expect(stale).toBe(advanced)
    expect(stateOf<TprState>(advanced, 'move').index).toBe(1)
  })
})

describe('what a block says about an item', () => {
  const dog = lesson.items.find((i) => i.id === 'dog')!
  const elephant = lesson.items.find((i) => i.id === 'elephant')!

  const soundCards: BlockOf<'cards'> = {
    id: 'sounds', type: 'cards', title: 'Sounds', items: { select: 'tag', tag: 'sound' },
    front: 'emoji', back: ['tag:sound'], speak: '{article} {en} says {tag:sound}!',
  }
  const soundMatch: BlockOf<'match'> = {
    id: 'soundmatch', type: 'match', title: 'Sound match', items: { select: 'tag', tag: 'sound' },
    left: 'emoji', right: 'tag:sound', speak: 'The {en} says {tag:sound}!',
  }

  it('speaks the English word when a card declares nothing', () => {
    expect(cardsSpeech(block('vocab') as BlockOf<'cards'>, dog)).toBe('dog')
  })

  it('speaks the sound rather than the animal when the card is about the sound', () => {
    expect(cardsSpeech(soundCards, dog)).toBe('a dog says Woof!')
  })

  it('keeps the declared grammar inside the spoken line', () => {
    expect(cardsSpeech(soundCards, elephant)).toBe('an elephant says Toot!')
  })

  it('says nothing on a pair the block has no sentence for', () => {
    expect(matchPairSpeech(block('pairs') as BlockOf<'match'>, dog)).toBeNull()
  })

  it('announces a finished pair with both of its halves', () => {
    expect(matchPairSpeech(soundMatch, dog)).toBe('The dog says Woof!')
  })
})
