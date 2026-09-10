import { describe, expect, it } from 'vitest'
import { createLessonState, isBlockComplete, lessonProgress } from '../src/shared/reducer'
import { applyAction } from '../src/shared/reducer'
import { complete, playableLessons } from './support/play'

/**
 * Every size of every topic, because a size is a lesson nobody wrote down: a part can be
 * unplayable while the file it came from is sound (design D6).
 */
describe.each(playableLessons())('%s plays from start to finish', (_name, lesson) => {
  it('reaches every block and finishes at 100%', () => {
    let state = createLessonState(lesson.id)
    for (const [index, block] of lesson.blocks.entries()) {
      state = applyAction(lesson, state, { t: 'nav', slide: index })
      state = complete(lesson, state, block)
      expect(isBlockComplete(lesson, state, block), `${lesson.id} / ${block.id}`).toBe(true)
    }
    expect(lessonProgress(lesson, state).percent).toBe(100)
  })

  it('reaches 100% whatever the seed happens to be', () => {
    for (let attempt = 0; attempt < 25; attempt++) {
      let state = createLessonState(lesson.id)
      for (const block of lesson.blocks) state = complete(lesson, state, block)
      expect(lessonProgress(lesson, state).percent).toBe(100)
    }
  })
})
