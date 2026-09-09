// @vitest-environment jsdom
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { App } from './App'
import { LessonPlayer } from './LessonPlayer'
import { APP_NAME } from '@/version'
import { testLesson, testState } from '@/shared/__fixtures__/lesson'
import type { LessonState } from '@/shared/types'
import type { LessonStore } from './useLesson'

/**
 * The build line is for the teacher on her way in, and for nobody else (design D61). The
 * specs put it that way rather than leaving it to taste: an exercise carries the lesson,
 * and the student's screen carries the exercise "and nothing else".
 *
 * The markup is read rather than a screenshot taken, because hiding it with CSS would
 * satisfy a screenshot and not the requirement.
 */
const lesson = testLesson()

function store(state: LessonState = testState()): LessonStore {
  return {
    state,
    dispatch: () => {},
    progress: { done: 0, total: 6, percent: 0 },
    muted: false,
    setMuted: () => {},
    board: {},
    ink: () => {},
    inkRole: 'teacher' as const,
    pen: true,
    setPen: () => {},
  }
}

/** The signature to look for: `lesson-loop@`, wherever the version happens to land. */
const SIGNATURE = `${APP_NAME}@`

function playerMarkup(canSteer: boolean): string {
  return renderToStaticMarkup(
    <LessonPlayer lesson={lesson} store={store()} onExit={() => {}} canSteer={canSteer} />,
  )
}

describe('the home screen says which build it is', () => {
  it('carries the app name and a version', () => {
    // The router reads `window.location`, hence jsdom for this file alone; the path it
    // finds is `/`, which is the home screen.
    expect(renderToStaticMarkup(<App />)).toContain(SIGNATURE)
  })
})

describe('no other screen does', () => {
  it('an exercise the student is looking at carries no build information', () => {
    expect(playerMarkup(false)).not.toContain(SIGNATURE)
  })

  it("an exercise on the teacher's screen carries none either", () => {
    expect(playerMarkup(true)).not.toContain(SIGNATURE)
  })

  it('a lesson played solo carries none', () => {
    expect(
      renderToStaticMarkup(<LessonPlayer lesson={lesson} store={store()} onExit={() => {}} />),
    ).not.toContain(SIGNATURE)
  })
})
