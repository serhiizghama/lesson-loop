import { describe, expect, it } from 'vitest'
import { momentBlock, snapshotOf } from './moment'
import { testLesson, testState } from '@/shared/__fixtures__/lesson'
import { lessonTrail, type TrailSlot } from '@/shared/reducer'

/** A trail written out by hand, so each case says exactly what it is about. */
function trail(...slots: Array<[id: string, done: boolean, current?: boolean]>): TrailSlot[] {
  return slots.map(([blockId, done, current = false]) => ({ blockId, done, current }))
}

describe('deciding whether to celebrate', () => {
  it('says nothing when nothing changed', () => {
    const now = trail(['a', true], ['b', false, true], ['c', false])
    expect(momentBlock(snapshotOf(now), now)).toBeNull()
  })

  it('says nothing about exercises that were already done when the screen arrived', () => {
    // A student's tab joining a lesson three exercises in, or reloading into one. The ref
    // starts at the current set, so the very first comparison finds no transition.
    const arriving = trail(['a', true], ['b', true], ['c', true, true])
    expect(momentBlock(snapshotOf(arriving), arriving)).toBeNull()
  })

  it('celebrates the exercise on screen when it becomes complete', () => {
    const before = trail(['a', true], ['b', false, true], ['c', false])
    const after = trail(['a', true], ['b', true, true], ['c', false])
    expect(momentBlock(snapshotOf(before), after)).toBe('b')
  })

  it('stays quiet for an exercise that completes while it is not on screen', () => {
    // A screen reconnecting finds two exercises newly done, and is looking at neither.
    const before = trail(['a', false], ['b', false], ['c', false, true])
    const after = trail(['a', true], ['b', true], ['c', false, true])
    expect(momentBlock(snapshotOf(before), after)).toBeNull()
  })

  /**
   * Found by the acceptance run, not by reasoning: a teacher who finishes an exercise
   * while the connection is down, then reconnects, sends the student a single update that
   * both moves the slide and marks that exercise done. Comparing only the done set would
   * celebrate it — congratulating a child for work their screen never saw happen.
   */
  it('stays quiet when the lesson moves onto an exercise that is already finished', () => {
    const before = trail(['hear', false, true], ['soundmatch', false])
    const after = trail(['hear', false], ['soundmatch', true, true])
    expect(momentBlock(snapshotOf(before), after)).toBeNull()
  })

  it('stays quiet when the teacher steps back to an exercise completed earlier', () => {
    const before = trail(['a', true], ['b', false, true])
    const after = trail(['a', true, true], ['b', false])
    expect(momentBlock(snapshotOf(before), after)).toBeNull()
  })

  it('celebrates only the one on screen when several complete at once', () => {
    const before = trail(['a', false], ['b', false, true], ['c', false])
    const after = trail(['a', true], ['b', true, true], ['c', true])
    expect(momentBlock(snapshotOf(before), after)).toBe('b')
  })

  it('says nothing when an exercise is reset', () => {
    const before = trail(['a', true, true], ['b', false])
    const after = trail(['a', false, true], ['b', false])
    expect(momentBlock(snapshotOf(before), after)).toBeNull()
  })

  it('celebrates again when a reset exercise is completed a second time', () => {
    const reopened = trail(['a', false, true], ['b', false])
    const redone = trail(['a', true, true], ['b', false])
    expect(momentBlock(snapshotOf(reopened), redone)).toBe('a')
  })

  it('says nothing on the closing screen, where no mark is current', () => {
    const before = trail(['a', false], ['b', false])
    const after = trail(['a', true], ['b', true])
    expect(momentBlock(snapshotOf(before), after)).toBeNull()
  })

  it('reads a real lesson state the same way', () => {
    const lesson = testLesson()
    const start = testState()
    const before = lessonTrail(lesson, start)
    expect(momentBlock(snapshotOf(before), before)).toBeNull()
  })
})
