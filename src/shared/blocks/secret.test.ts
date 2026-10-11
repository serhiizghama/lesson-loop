import { describe, expect, it } from 'vitest'
import { testLesson, testState } from '../__fixtures__/lesson'
import { answerKeyFor, applyAction, blockStateOf, isBlockComplete } from '../reducer'
import { secretLogic, secretTiles } from './secret'
import type { Action, Block, BlockOf, Lesson, LessonState, SecretState } from '../types'

const hide: BlockOf<'secret'> = {
  id: 'hide', type: 'secret', title: 'Guess my secret', items: { select: 'ids', ids: ['dog', 'cat', 'lion', 'elephant'] },
  rounds: 2, guess: 'Is it the {en}? No, it isn\'t.', found: 'Yes, it is! It is the {en}.',
}
const lesson: Lesson = { ...testLesson(), blocks: [hide as Block] }

const tap = (target: string): Action => ({ t: 'tap', block: 'hide', target })
const stateOf = (state: LessonState) => blockStateOf(lesson, state, hide) as SecretState
const run = (actions: Action[], from: LessonState = testState()) =>
  actions.reduce((s, a) => applyAction(lesson, s, a), from)

const secretOf = (s: SecretState) => s.order[s.round] as string
const wrongOf = (s: SecretState) => s.order.find((id) => id !== secretOf(s) && !s.tried.includes(id)) as string

describe('secret', () => {
  it('hides one of the selected items and reveals nothing yet', () => {
    const s = stateOf(testState())
    expect([...s.order].sort()).toEqual(['cat', 'dog', 'elephant', 'lion'])
    expect(s.found).toBe(false)
    expect(s.tried).toEqual([])
  })

  it('crosses out a wrong tile, and refuses it a second time by reference', () => {
    const initial = stateOf(testState())
    const wrong = wrongOf(initial)
    const once = run([tap(wrong)])
    expect(stateOf(once).tried).toEqual([wrong])
    expect(stateOf(once).found).toBe(false)
    expect(applyAction(lesson, once, tap(wrong))).toBe(once)
  })

  it('reveals the secret when its tile is tapped', () => {
    const initial = stateOf(testState())
    expect(stateOf(run([tap(secretOf(initial))])).found).toBe(true)
  })

  it('moves on only with the secret, once found, and clears the tries', () => {
    const initial = stateOf(testState())
    const secret = secretOf(initial)
    const wrong = wrongOf(initial)
    const found = run([tap(wrong), tap(secret)])
    expect(applyAction(lesson, found, tap(wrong))).toBe(found)
    const next = stateOf(applyAction(lesson, found, tap(secret)))
    expect(next.round).toBe(1)
    expect(next.tried).toEqual([])
    expect(next.found).toBe(false)
  })

  it('hides a different item every round', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const s = secretLogic.init(lesson, hide, seed)
      expect(new Set(s.order.slice(0, hide.rounds)).size).toBe(hide.rounds)
    }
  })

  it('is complete when the last round is found, and goes no further', () => {
    let state = testState()
    expect(isBlockComplete(lesson, state, hide)).toBe(false)
    state = run([tap(secretOf(stateOf(state)))], state)
    expect(isBlockComplete(lesson, state, hide)).toBe(false)
    state = run([tap(secretOf(stateOf(state)))], state)
    state = run([tap(secretOf(stateOf(state)))], state)
    expect(stateOf(state).round).toBe(1)
    expect(isBlockComplete(lesson, state, hide)).toBe(true)
    expect(applyAction(lesson, state, tap(secretOf(stateOf(state))))).toBe(state)
  })

  it('lays out the tiles in the lesson’s order whatever the seed', () => {
    const tiles = secretTiles(lesson, hide).map((i) => i.id)
    expect(tiles).toEqual(['dog', 'cat', 'lion', 'elephant'])
    for (let seed = 1; seed <= 10; seed++) {
      secretLogic.init(lesson, hide, seed)
      expect(secretTiles(lesson, hide).map((i) => i.id)).toEqual(tiles)
    }
  })

  it('keys each round with its secret', () => {
    const state = testState()
    const key = answerKeyFor(lesson, state, hide)!
    expect(key.rows).toHaveLength(2)
    expect(key.rows[0]!.value).toBe(secretOf(stateOf(state)))
    expect(key.rows[0]!.mark).toBe('current')
    expect(key.rows[1]!.mark).toBe('open')
  })
})
