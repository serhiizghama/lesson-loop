import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { LessonPlayer } from './LessonPlayer'
import { TeacherPanel } from './TeacherPanel'
import { applyAction, answerKeyFor, blockStateOf, blockById } from '@/shared/reducer'
import { testLesson, testState } from '@/shared/__fixtures__/lesson'
import type { Action, CardsState, LessonState } from '@/shared/types'
import { complete } from '../../tests/support/play'
import type { LessonStore } from './useLesson'

/**
 * The whole reason for two links rather than one shared screen is that the student's
 * side must not carry the teacher's. This renders both views and reads the markup,
 * because "hidden with CSS" would satisfy a screenshot and not the requirement.
 */
const lesson = testLesson()

function store(state: LessonState = testState(), muted = false): LessonStore {
  return {
    state,
    dispatch: () => {},
    progress: { done: 0, total: 6, percent: 0 },
    muted,
    setMuted: () => {},
    board: {},
    ink: () => {},
    inkRole: 'teacher' as const,
    pen: true,
    setPen: () => {},
  }
}

function studentMarkup(state?: LessonState, readOnly = false, muted = false): string {
  return renderToStaticMarkup(
    <LessonPlayer
      lesson={lesson}
      store={store(state, muted)}
      onExit={() => {}}
      canSteer={false}
      readOnly={readOnly}
    />,
  )
}

/** A lesson opened from the home screen: no room, no role, every control (design D22). */
function soloMarkup(state?: LessonState, muted = false): string {
  return renderToStaticMarkup(
    <LessonPlayer lesson={lesson} store={store(state, muted)} onExit={() => {}} />,
  )
}

function teacherMarkup(state: LessonState = testState(), locked = false, muted = false): string {
  return renderToStaticMarkup(
    <LessonPlayer
      lesson={lesson}
      store={store(state, muted)}
      onExit={() => {}}
      canSteer
      soundControlInPanel
      aside={
        <TeacherPanel
          lesson={lesson}
          lessons={[lesson]}
          state={state}
          locked={locked}
          muted={muted}
          pen
          connection={{ connected: true, failures: 0, unsynced: false }}
          peers={{ teacher: true, students: 1 }}
          studentLink="https://lessonloop.test/r/AB12"
          onSetPen={() => {}}
          onPrevious={() => {}}
          onNext={() => {}}
          onReset={() => {}}
          onSwitchLesson={() => {}}
          onSetLocked={() => {}}
          onSetMuted={() => {}}
        />
      }
    />,
  )
}

/** Just the header, where the sound control lives. */
function headerOf(markup: string): string {
  return markup.slice(markup.indexOf('<header'), markup.indexOf('</header>'))
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
    // Was `0%` until the percentage became a star trail (design D75).
    expect(markup).toContain('0 of 12 done')
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
    expect(markup).toContain('3 / 13') // the footer's position is unchanged
    expect(markup).toContain('0 of 12 done')
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
    expect(markup).toContain('3 / 13')
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

/**
 * The sound control is the teacher's, and a student must not even see that it exists
 * (design D72). The whole markup is read rather than the header alone where the point is
 * "nothing anywhere", because "hidden with CSS" would satisfy a screenshot and not the
 * requirement.
 */
describe('the sound control belongs to the screen that paces the lesson', () => {
  const LABEL_ON = 'Sound is on'
  const LABEL_OFF = 'Sound is off'

  it("is in the teacher's panel, beside the lock, in both states", () => {
    const on = teacherMarkup()
    expect(on).toContain('Voice on')
    expect(on).toContain('Student can tap')
    expect(headerOf(on)).not.toContain('Voice')

    expect(teacherMarkup(testState(), false, true)).toContain('Voice off')
  })

  // A lesson played alone has no panel, so the header carries it there.
  it('is in the header of a lesson opened alone', () => {
    expect(headerOf(soloMarkup())).toContain(LABEL_ON)
    expect(headerOf(soloMarkup(testState(), true))).toContain(LABEL_OFF)
  })

  // Spec: "No control leaks onto the student's screen" — including when it is off, which
  // is when a child would most want to press it.
  it("is absent from the student's screen whether the sound is on or off", () => {
    for (const markup of [studentMarkup(), studentMarkup(testState(), false, true)]) {
      expect(markup).not.toContain(LABEL_ON)
      expect(markup).not.toContain(LABEL_OFF)
      expect(headerOf(markup)).not.toContain('🔇')
    }
  })

  it('shows which state the lesson is in, not only what pressing it would do', () => {
    expect(headerOf(soloMarkup())).toContain('aria-pressed="false"')
    expect(headerOf(soloMarkup(testState(), true))).toContain('aria-pressed="true"')
    // In the panel the two toggles sit together, so each must say its own state.
    expect(teacherMarkup(testState(), false, true)).toContain('aria-pressed="true"')
  })

  // One setting gets one control: the panel's copy replaces the header's rather than
  // joining it, so the teacher never has two switches for one thing.
  it('is not duplicated in the header when the panel carries it', () => {
    expect(headerOf(teacherMarkup())).not.toContain(LABEL_ON)
    expect(headerOf(teacherMarkup(testState(), false, true))).not.toContain(LABEL_OFF)
  })
})

/** Every tap the first exercise needs, so a test can start from a genuinely earned star. */
function withFirstExerciseDone(from: LessonState = testState()): LessonState {
  const cards = blockById(lesson, 'vocab')!
  const order = (blockStateOf(lesson, from, cards) as CardsState).order
  return order
    .map((id) => ({ t: 'tap', block: 'vocab', target: id }) as Action)
    .reduce((state, action) => applyAction(lesson, state, action), from)
}

describe('the star trail (design D75)', () => {
  it('shows one mark per exercise and none for the closing slide', () => {
    const header = headerOf(soloMarkup())
    // The fixture has seven blocks, six of which are exercises.
    expect(header.match(/★/g)).toHaveLength(12)
    expect(header).toContain('0 of 12 done')
  })

  it('reports and does not steer — there is no control among the marks', () => {
    const header = headerOf(studentMarkup())
    const trail = header.slice(header.indexOf('role="img"'))
    expect(trail).not.toContain('<button')
    expect(trail).not.toContain('onclick')
  })

  it('counts a mark as earned only once its exercise is complete', () => {
    expect(headerOf(soloMarkup())).toContain('0 of 12 done')
    expect(headerOf(soloMarkup(withFirstExerciseDone()))).toContain('1 of 12 done')
  })

  it('is the same on the student\'s screen and the teacher\'s for the same state', () => {
    const state = withFirstExerciseDone({ ...testState(), slide: 2 })
    const trailOf = (markup: string) => {
      const header = headerOf(markup)
      return header.slice(header.indexOf('role="img"'), header.lastIndexOf('</div>'))
    }
    expect(trailOf(studentMarkup(state))).toBe(trailOf(teacherMarkup(state)))
  })

  it('shows no percentage anywhere', () => {
    expect(soloMarkup()).not.toContain('%')
  })
})

describe('the way forward draws attention once the exercise is done (design D83)', () => {
  const done = withFirstExerciseDone()

  it("marks the teacher's next controls as due", () => {
    const markup = teacherMarkup(done)
    expect(markup).toContain('navButtonDue')
    expect(markup).toContain('panelButtonDue')
  })

  it('leaves the student nothing to draw attention to', () => {
    const markup = studentMarkup(done)
    expect(markup).not.toContain('Due')
    expect(footerOf(markup)).not.toContain('→')
  })

  it("nudges a solo learner's own arrow exactly as it nudges the teacher's", () => {
    expect(soloMarkup(done)).toContain('navButtonDue')
  })

  it('says nothing while the exercise on screen is unfinished', () => {
    expect(teacherMarkup()).not.toContain('Due')
    expect(soloMarkup()).not.toContain('Due')
  })

  it('stops on the closing screen, where there is nowhere left to go', () => {
    const atFinish = { ...done, slide: lesson.blocks.length - 1 }
    expect(teacherMarkup(atFinish)).not.toContain('navButtonDue')
    expect(soloMarkup(atFinish)).not.toContain('navButtonDue')
  })

  /**
   * Nothing set this and nothing has to clear it: it is derived, so returning to an
   * exercise finished earlier is already pulsing on arrival (spec: "Already complete on
   * arrival"), with no celebration having played.
   */
  it('is already drawing attention on an exercise completed earlier', () => {
    const wandered = [
      { t: 'nav', slide: 3 },
      { t: 'nav', slide: 0 },
    ].reduce((state, action) => applyAction(lesson, state, action as Action), done)

    expect(wandered.slide).toBe(0)
    expect(soloMarkup(wandered)).toContain('navButtonDue')
  })
})

describe('the closing screen shows the stars that were earned (design D82)', () => {
  /** Every exercise but the last one done, then the closing slide. */
  function almostPerfect(): LessonState {
    const scored = lesson.blocks.filter((b) => b.type !== 'finish')
    let state = testState()
    for (const block of scored.slice(0, -1)) state = complete(lesson, state, block)
    return { ...state, slide: lesson.blocks.length - 1 }
  }

  /** The same progress, but stopped on an exercise rather than the closing slide. */
  function almostPerfect_onAnExercise(): LessonState {
    return { ...almostPerfect(), slide: 0 }
  }

  const count = (markup: string, className: string) =>
    (markup.match(new RegExp(className, 'g')) ?? []).length

  it('is gold for what was finished and unfilled for what was not', () => {
    const markup = soloMarkup(almostPerfect())
    // All but one of the fixture's twelve exercises were completed, so one star stays unfilled.
    // `closingStarEarned` contains `closingStar`, so the plain ones are the difference.
    const earnedStars = count(markup, 'closingStarEarned')
    expect(earnedStars).toBe(11)
    expect(count(markup, 'closingStar') - earnedStars).toBe(1)
    expect(markup).toContain('11 of 12 stars')
  })

  it('shows the same stars to the student as to the teacher', () => {
    const state = almostPerfect()
    const rowOf = (markup: string) =>
      markup.slice(markup.indexOf('closingRow'), markup.indexOf('finishMessage'))
    expect(rowOf(studentMarkup(state))).toBe(rowOf(teacherMarkup(state)))
  })

  it('no longer paints a fixed five on the slide itself', () => {
    const markup = soloMarkup(almostPerfect())
    expect(markup).not.toContain('⭐️⭐️⭐️⭐️⭐️')
    expect(markup).toContain(
      (lesson.blocks.at(-1) as Extract<(typeof lesson.blocks)[number], { type: 'finish' }>).message,
    )
  })

  /**
   * The closing screen shows the stars once, large. Repeating them in the header would be
   * the same information twice on the one page whose whole subject is that information.
   */
  it('stands the header trail down, so the stars are shown once', () => {
    const markup = soloMarkup(almostPerfect())
    expect(headerOf(markup)).not.toContain('done')
    expect(headerOf(markup)).not.toContain('★')
    expect(markup).toContain('11 of 12 stars')
  })

  it('keeps the trail in the header everywhere else', () => {
    expect(headerOf(soloMarkup(almostPerfect_onAnExercise()))).toContain('11 of 12 done')
  })

  it('drops the slide title, which said the same as the message in fewer words', () => {
    const markup = soloMarkup(almostPerfect())
    const finish = lesson.blocks.at(-1) as Extract<(typeof lesson.blocks)[number], { type: 'finish' }>
    expect(markup).toContain(finish.message)
    expect(markup).not.toContain(finish.title)
    expect(markup).not.toContain('blockTitle')
  })
})

describe('the header centres what it carries (design D84)', () => {
  const centred = (markup: string) => {
    const header = headerOf(markup)
    return header.slice(header.indexOf('headerCenter'))
  }

  it('puts the way out first and everything else in one group after it', () => {
    const header = headerOf(soloMarkup())
    expect(header.indexOf('back')).toBeLessThan(header.indexOf('headerCenter'))
    // The group is a single element, which is what the stylesheet centres.
    expect((header.match(/headerCenter/g) ?? [])).toHaveLength(1)
  })

  it('gathers the name, the marks and the controls into that group', () => {
    const group = centred(soloMarkup())
    expect(group).toContain('headerTitle')
    expect(group).toContain('★')
    expect(group).toContain('Sound is on')
  })

  it('leaves the way out outside it, where it stays pinned to the edge', () => {
    const header = headerOf(soloMarkup())
    const beforeGroup = header.slice(0, header.indexOf('headerCenter'))
    expect(beforeGroup).toContain('Back to lessons')
  })

  it('still centres a group with no marks in it, on the closing screen', () => {
    const state = { ...testState(), slide: lesson.blocks.length - 1 }
    const group = centred(soloMarkup(state))
    expect(group).toContain('headerTitle')
    expect(group).not.toContain('★')
  })

  it('tells the stylesheet how many marks there are, so the row can be sized', () => {
    // Left to measure itself, a browser sizes the row by the star glyph and the marks
    // huddle; the count is what gives it a real width (design D84).
    expect(soloMarkup()).toContain('--slots:12')
  })
})
