import { describe, expect, it } from 'vitest'
import { lessonFiles, loadLesson } from './support/play'
import { WHOLE, choicesOf, narrow } from '../src/shared/narrow'
import type { Lesson } from '../src/shared/types'

/**
 * A sitting is five words (spec: a lesson teaches one sitting's worth of vocabulary).
 *
 * This is the finding the teacher's own re-cut of Animals delivered — she took a
 * ten-word lesson and made two five-word lessons of it — and a rule written only in a
 * document is a rule that lasts until the next lesson is written in a hurry (design D122).
 *
 * What it now measures is a *part*, not a file. A topic is one file that declares the
 * sittings it can be taught in, and the teacher chooses between them, so the rule belongs
 * to the parts she is offered rather than to the way the content was filed. What is
 * measured is still what a sitting *introduces*, not what it carries: a later part carries
 * the whole vocabulary so that it can revise the earlier half.
 *
 * The whole-topic choice is deliberately exempt. It is the teacher saying that today's
 * child has met these words before, which is the decision this rule used to make for her.
 */

const MAX_NEW_WORDS = 5

/**
 * Topics still waiting for their parts, each a ten-word lesson with nothing to choose.
 * Naming them here is what keeps the exception from passing quietly. The list only ever
 * shrinks.
 */
const NOT_YET_PARTED = new Set<string>([])

const lessons: Lesson[] = lessonFiles.map(loadLesson)

describe('a sitting is one sitting long', () => {
  for (const lesson of lessons) {
    const parts = lesson.parts ?? []
    for (const part of parts) {
      it(`${lesson.id}/${part.id} introduces at most ${MAX_NEW_WORDS} words`, () => {
        expect(part.items.length, part.items.join(', ')).toBeLessThanOrEqual(MAX_NEW_WORDS)
      })
    }
  }

  it('counts what a part teaches, not what it carries', () => {
    const animals = lessons.find((l) => l.id === 'animals') as Lesson
    const wild = choicesOf(animals).find((c) => c.id === 'wild')
    expect(wild?.teaches).toBe(5)
    expect(wild?.carries).toBe(10)
    expect(narrow(animals, 'wild').items).toHaveLength(10)
  })

  it('names the topics still waiting for parts, so the exception cannot be forgotten', () => {
    const unparted = lessons
      .filter((l) => l.parts === undefined && l.items.length > MAX_NEW_WORDS)
      .map((l) => l.id)
    expect(unparted.sort()).toEqual([...NOT_YET_PARTED].sort())
  })

  it('offers every topic a sitting of five, and the whole of it besides', () => {
    for (const lesson of lessons.filter((l) => l.parts !== undefined)) {
      const sizes = choicesOf(lesson)
      expect(sizes.at(-1)?.id).toBe(WHOLE)
      expect(sizes.length).toBe((lesson.parts ?? []).length + 1)
    }
  })
})
