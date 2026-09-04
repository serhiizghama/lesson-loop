import { describe, expect, it } from 'vitest'
import { createLessonState } from '../src/shared/reducer'
import { RoomCore } from '../src/shared/room'
import type { Lesson } from '../src/shared/types'
import { lessonFiles, loadLesson, playToTheEnd } from './support/play'

/**
 * The room broadcasts its whole state after every action rather than a patch (design
 * D10), on the grounds that a lesson's state is kilobytes. That is a claim about the
 * content in `lessons/`, so it is checked against the content rather than assumed. If
 * this ever fails, the answer is the patch message D10 turned down, not a bigger limit.
 */
const LIMIT_BYTES = 32 * 1024

function largestLesson(): Lesson {
  const lessons = lessonFiles.map(loadLesson)
  const biggest = lessons
    .map((lesson) => ({ lesson, size: JSON.stringify(lesson).length }))
    .sort((a, b) => b.size - a.size)[0]
  if (biggest === undefined) throw new Error('lessons/ is empty')
  return biggest.lesson
}

describe('a full-state broadcast stays small (design D10)', () => {
  const lesson = largestLesson()

  it(`serialises a fully played "${lesson.id}" under 32 KB`, () => {
    const state = playToTheEnd(lesson, createLessonState(lesson.id))
    const message = JSON.stringify(RoomCore.open(lesson, state, 'k').stateMessage('teacher'))
    const bytes = new TextEncoder().encode(message).length

    expect(bytes, `a full snapshot of "${lesson.id}" is ${bytes} bytes`).toBeLessThan(LIMIT_BYTES)
  })
})
