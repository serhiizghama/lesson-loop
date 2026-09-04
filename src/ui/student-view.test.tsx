import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { LessonPlayer } from './LessonPlayer'
import { TeacherPanel } from './TeacherPanel'
import { answerKeyFor } from '@/shared/reducer'
import { testLesson, testState } from '@/shared/__fixtures__/lesson'
import type { LessonState } from '@/shared/types'
import type { LessonStore } from './useLesson'

/**
 * The whole reason for two links rather than one shared screen is that the student's
 * side must not carry the teacher's. This renders both views and reads the markup,
 * because "hidden with CSS" would satisfy a screenshot and not the requirement.
 */
const lesson = testLesson()

function store(state: LessonState = testState()): LessonStore {
  return { state, dispatch: () => {}, progress: { done: 0, total: 6, percent: 0 } }
}

function studentMarkup(state?: LessonState, readOnly = false): string {
  return renderToStaticMarkup(
    <LessonPlayer
      lesson={lesson}
      store={store(state)}
      onExit={() => {}}
      canSteer={false}
      readOnly={readOnly}
    />,
  )
}

/** A lesson opened from the home screen: no room, no role, every control (design D22). */
function soloMarkup(state?: LessonState): string {
  return renderToStaticMarkup(
    <LessonPlayer lesson={lesson} store={store(state)} onExit={() => {}} />,
  )
}

function teacherMarkup(state: LessonState = testState(), locked = false): string {
  return renderToStaticMarkup(
    <LessonPlayer
      lesson={lesson}
      store={store(state)}
      onExit={() => {}}
      canSteer
      aside={
        <TeacherPanel
          lesson={lesson}
          lessons={[lesson]}
          state={state}
          locked={locked}
          connection={{ connected: true, failures: 0, unsynced: false }}
          peers={{ teacher: true, students: 1 }}
          studentLink="https://lessonloop.test/r/AB12"
          onPrevious={() => {}}
          onNext={() => {}}
          onReset={() => {}}
          onSwitchLesson={() => {}}
          onSetLocked={() => {}}
        />
      }
    />,
  )
}

/** Just the footer, so the two views' lesson controls can be compared directly. */
function footerOf(markup: string): string {
  return markup.slice(markup.indexOf('<footer'), markup.indexOf('</footer>'))
}

/** Every answer the teacher can see for a given exercise, as rendered text. */
function answersOn(slide: number): string[] {
  const state = { ...testState(), slide }
  const block = lesson.blocks[slide]!
  const key = answerKeyFor(lesson, state, block)
  return key === null ? [] : key.rows.map((r) => r.value)
}

describe("the student's screen carries the exercise and nothing else", () => {
  it('renders no teacher panel at all — not merely a hidden one', () => {
    const markup = studentMarkup()
    expect(markup).not.toContain('Teacher panel')
    expect(markup).not.toContain('Student link')
    expect(markup).not.toContain('Change lesson')
    expect(markup).not.toContain('Reset this exercise')
    expect(markup).not.toContain('Student can tap')
    expect(markup).not.toContain('aside')
  })

  it('carries no answer-key markup for an exercise whose answers the teacher can see', () => {
    // Slide 3 is the sorting exercise: the teacher sees every item's bucket.
    const markup = studentMarkup({ ...testState(), slide: 3 })
    expect(answersOn(3).length).toBeGreaterThan(0)
    expect(markup).not.toContain('answerKey')
    expect(markup).not.toContain('rowValue')
  })

  it('does not reveal what is behind a card the learner has not turned over', () => {
    // The cards exercise is where the key is content the student cannot otherwise see.
    const markup = studentMarkup({ ...testState(), slide: 0 })
    const backs = answersOn(0)
    expect(backs.length).toBeGreaterThan(0)
    for (const back of backs) {
      expect(markup, `the student's screen shows "${back}"`).not.toContain(back)
    }
  })

  it('still shows the exercise, its instruction and the progress', () => {
    const markup = studentMarkup()
    expect(markup).toContain(lesson.blocks[0]!.title)
    expect(markup).toContain(lesson.title)
    expect(markup).toContain('0%')
  })
})

describe('the student cannot pace the lesson (design D22)', () => {
  it('carries no way to move to another exercise or reset this one', () => {
    const markup = studentMarkup({ ...testState(), slide: 2 })
    // Scoped to the footer: the header's ← is "back to the lessons", which leaves the
    // room rather than paces it, and is the student's only way out.
    const footer = footerOf(markup)
    expect(footer).not.toContain('Reset')
    expect(footer).not.toContain('←')
    expect(footer).not.toContain('→')
    expect(footer).not.toContain('<button')
  })

  it('still shows where in the lesson they are, and how much is done', () => {
    const markup = studentMarkup({ ...testState(), slide: 2 })
    expect(markup).toContain('3 / 7')
    expect(markup).toContain('0%')
  })

  it('renders the same footer whether or not the teacher has locked them', () => {
    const state = { ...testState(), slide: 2 }
    expect(footerOf(studentMarkup(state, false))).toBe(footerOf(studentMarkup(state, true)))
  })

  it('leaves a lesson opened alone with every control (spec: a lesson opened alone)', () => {
    const markup = soloMarkup({ ...testState(), slide: 2 })
    expect(markup).toContain('Reset')
    expect(markup).toContain('←')
    expect(markup).toContain('→')
    expect(markup).toContain('3 / 7')
  })
})

describe("the teacher's screen carries what the student's does not", () => {
  it('shows the controls and the key for the same exercise', () => {
    const markup = teacherMarkup({ ...testState(), slide: 3 })
    expect(markup).toContain('Teacher panel')
    expect(markup).toContain('Reset this exercise')
    expect(markup).toContain('Student link')
    for (const answer of answersOn(3)) expect(markup).toContain(answer)
  })

  it('shows no key at all for an exercise with nothing to be right about', () => {
    // Slide 5 is the physical-response exercise, which scores nothing.
    expect(answersOn(5)).toEqual([])
    const markup = teacherMarkup({ ...testState(), slide: 5 })
    expect(markup).toContain('Teacher panel')
    expect(markup).not.toContain('answerKey')
  })

  it('keeps all four lesson controls', () => {
    const markup = teacherMarkup({ ...testState(), slide: 2 })
    expect(markup).toContain('Previous')
    expect(markup).toContain('Next')
    expect(markup).toContain('Reset this exercise')
    expect(markup).toContain('Change lesson')
    // …and the footer's own controls, which the student's screen no longer has.
    expect(footerOf(markup)).toContain('Reset')
  })

  it('keeps its footer controls while student input is locked', () => {
    expect(footerOf(teacherMarkup({ ...testState(), slide: 2 }, true))).toContain('Reset')
  })

  it('says whether the student is there', () => {
    expect(teacherMarkup()).toContain('student here')
  })
})
