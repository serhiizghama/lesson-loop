import { describe, expect, it } from 'vitest'
import { lessonFiles, loadLesson } from './support/play'
import type { Lesson } from '../src/shared/types'

/**
 * A lesson is five words (spec: a lesson teaches one sitting's worth of vocabulary).
 *
 * This is the finding the teacher's own re-cut of Animals delivered — she took a
 * ten-word lesson and made two five-word lessons of it — and a rule written only in a
 * document is a rule that lasts until the next lesson is written in a hurry (design D122).
 *
 * What is measured is what a lesson *introduces*, not what it contains: a later part of a
 * topic carries the whole vocabulary so that it can revise the earlier half (design D113),
 * and only the words no earlier part carried are new.
 */

/** The topic a lesson belongs to: `animals-2` is Animals. Mirrors the picture generator. */
function topicOf(id: string): string {
  return id.replace(/-\d+$/, '')
}

/** Which part of its topic a lesson is; a lesson with no suffix is the only part. */
function partOf(id: string): number {
  return Number(/-(\d+)$/.exec(id)?.[1] ?? 1)
}

const MAX_NEW_WORDS = 5

/**
 * Lessons written before the rule, each still ten words long. Re-cutting them is content
 * work that reuses this rule and was deliberately left out of the change that added it —
 * so they are named here rather than quietly passing. The list only ever shrinks.
 */
const NOT_YET_RECUT = new Set(['body-parts', 'colours', 'food', 'numbers'])

const lessons: Lesson[] = lessonFiles.map(loadLesson)

/** Every word carried by an earlier part of the same topic. */
function alreadyTaught(lesson: Lesson): Set<string> {
  const earlier = lessons.filter(
    (l) => topicOf(l.id) === topicOf(lesson.id) && partOf(l.id) < partOf(lesson.id),
  )
  return new Set(earlier.flatMap((l) => l.items.map((i) => i.id)))
}

function newWords(lesson: Lesson): string[] {
  const taught = alreadyTaught(lesson)
  return lesson.items.filter((i) => !taught.has(i.id)).map((i) => i.id)
}

describe('a lesson is one sitting long', () => {
  for (const lesson of lessons.filter((l) => !NOT_YET_RECUT.has(topicOf(l.id)))) {
    it(`${lesson.id} introduces at most ${MAX_NEW_WORDS} words`, () => {
      const introduced = newWords(lesson)
      expect(introduced.length, introduced.join(', ')).toBeLessThanOrEqual(MAX_NEW_WORDS)
    })
  }

  it('counts only the words an earlier part did not already carry', () => {
    const second = lessons.find((l) => l.id === 'animals-2')
    expect(second?.items).toHaveLength(10)
    expect(newWords(second as Lesson).sort()).toEqual(
      ['bear', 'bird', 'elephant', 'lion', 'monkey'],
    )
  })

  it('names the lessons still waiting to be re-cut, so the exception cannot be forgotten', () => {
    const stillLong = lessons.filter((l) => newWords(l).length > MAX_NEW_WORDS).map((l) => l.id)
    expect(stillLong.sort()).toEqual([...NOT_YET_RECUT].sort())
  })
})
