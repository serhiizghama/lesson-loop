// @vitest-environment jsdom
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { App } from './App'
import { EXERCISES, PICTURES, SECTIONS } from './Guide'
import { LessonPlayer } from './LessonPlayer'
import { TeacherPanel } from './TeacherPanel'
import { blockViews } from '@/blocks'
import { testLesson, testState } from '@/shared/__fixtures__/lesson'
import type { LessonState } from '@/shared/types'
import type { LessonStore } from './useLesson'

/**
 * The teacher's guide (spec `teacher-guide`).
 *
 * Documentation rots quietly: nothing fails, and a year later it describes an app that no
 * longer exists. Three of these tests exist to make the rot loud — the exercise table
 * against the block registry, the pictures against the files, and the prose against a
 * list of words a teacher should never have to read (design D8).
 */
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let host: HTMLDivElement
let root: Root

/** Goes to an address the way the browser would, as `app-sizes.test.tsx` does. */
function open(path: string): void {
  window.history.replaceState(null, '', path)
  act(() => {
    root.render(<App />)
  })
  act(() => {
    window.dispatchEvent(new PopStateEvent('popstate'))
  })
}

function click(text: string): void {
  const buttons = [...host.querySelectorAll('button')]
  const button = buttons.find((b) => (b.textContent ?? '').includes(text))
  if (button === undefined) {
    throw new Error(
      `no button says "${text}"; screen has: ${buttons.map((b) => b.textContent).join(' | ')}`,
    )
  }
  act(() => {
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
}

function contents(): HTMLAnchorElement[] {
  return [...host.querySelectorAll('nav a')] as HTMLAnchorElement[]
}

beforeEach(() => {
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

describe('getting to the guide', () => {
  it('opens at its own address', () => {
    open('/guide')
    expect(host.textContent).toContain('Teacher’s guide')
    expect(host.textContent).toContain('What this is')
  })

  it('leads back to the lessons and nowhere else', () => {
    open('/guide')
    click('Back to the lessons')
    expect(window.location.pathname).toBe('/')
    expect(host.textContent).toContain('Pick a lesson to begin')
  })

  it('is not a lesson: a deeper address is no page at all', () => {
    open('/guide/anything')
    expect(host.textContent).toContain('There is no such page')
    expect(host.textContent).not.toContain('What this is')
  })

  it('says which build it describes (design D10)', () => {
    open('/guide')
    expect(host.textContent).toContain('lesson-loop@')
  })
})

describe('the guide is offered in the room, to the teacher alone', () => {
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

  /** What the guide would look like on a screen that must not carry it. */
  function offersTheGuide(markup: string): boolean {
    return markup.includes('Teacher guide') || markup.includes('/guide')
  }

  it("is absent from the student's view of an exercise", () => {
    const markup = renderToStaticMarkup(
      <LessonPlayer lesson={lesson} store={store()} onExit={() => {}} canSteer={false} />,
    )
    expect(offersTheGuide(markup)).toBe(false)
  })

  it("is absent from the teacher's view of an exercise", () => {
    const markup = renderToStaticMarkup(
      <LessonPlayer lesson={lesson} store={store()} onExit={() => {}} canSteer />,
    )
    expect(offersTheGuide(markup)).toBe(false)
  })

  it('is offered by the panel, which is hers and hers only', () => {
    const markup = panelMarkup()
    expect(offersTheGuide(markup)).toBe(true)
  })

  it('opens in a second tab, so a live lesson is never navigated away from', () => {
    const panel = document.createElement('div')
    panel.innerHTML = panelMarkup()
    const link = panel.querySelector('a[href="/guide"]')
    expect(link).not.toBeNull()
    expect(link?.getAttribute('target')).toBe('_blank')
  })

  it('is absent from the home screen, which the teacher shares with no one', () => {
    open('/')
    expect(host.textContent).toContain('Pick a lesson to begin')
    expect(offersTheGuide(host.innerHTML)).toBe(false)
  })

  function panelMarkup(): string {
    return renderToStaticMarkup(
      <TeacherPanel
        lesson={lesson}
        lessons={[lesson]}
        state={testState()}
        locked={false}
        muted={false}
        pen
        connection={{ connected: true, failures: 0, unsynced: false }}
        peers={{ teacher: true, students: 1 }}
        studentLink="https://example.test/r/AB12"
        onPrevious={() => {}}
        onNext={() => {}}
        onReset={() => {}}
        onSwitchLesson={() => {}}
        onSetLocked={() => {}}
        onSetMuted={() => {}}
        onSetPen={() => {}}
      />,
    )
  }

  it('is absent from a lesson opened alone', () => {
    const markup = renderToStaticMarkup(
      <LessonPlayer lesson={lesson} store={store()} onExit={() => {}} />,
    )
    expect(offersTheGuide(markup)).toBe(false)
  })
})

describe('finding a place in it', () => {
  it('lists every section it has, and has every section it lists', () => {
    open('/guide')
    const sections = [...host.querySelectorAll('section[id]')]
    expect(contents()).toHaveLength(SECTIONS.length)
    expect(sections).toHaveLength(SECTIONS.length)
  })

  it('every entry points at a section that is on the page', () => {
    open('/guide')
    for (const link of contents()) {
      const id = link.getAttribute('href')?.replace(/^#/, '') ?? ''
      expect(id).not.toBe('')
      expect(host.querySelector(`section[id="${id}"]`), `no section #${id}`).not.toBeNull()
    }
  })

  it('an entry says what its section is called', () => {
    open('/guide')
    for (const [i, link] of contents().entries()) {
      expect(link.textContent).toBe(SECTIONS[i]?.title)
    }
  })

  it('opens at a section when the address names one', () => {
    // The fragment is the browser's to honour, not the router's (design D6). What this
    // holds is the half that is ours: the address still opens the guide, and the section
    // it names is on the page for the browser to scroll to.
    window.location.hash = '#controls'
    open('/guide')
    expect(host.textContent).toContain('Your controls')
    expect(host.querySelector('section[id="controls"]')).not.toBeNull()
    window.location.hash = ''
  })
})

describe('every exercise the app can play is described', () => {
  /** The registry, less the closing screen, which is a send-off and not an exercise. */
  const playable = Object.keys(blockViews).filter((type) => type !== 'finish').sort()

  it('has a row for each one', () => {
    expect(EXERCISES.map((e) => e.type).sort()).toEqual(playable)
  })

  it('says what the child does and what the teacher does, in each row', () => {
    for (const exercise of EXERCISES) {
      expect(exercise.name.length, exercise.type).toBeGreaterThan(2)
      expect(exercise.child.length, exercise.type).toBeGreaterThan(20)
      expect(exercise.teacher.length, exercise.type).toBeGreaterThan(20)
    }
  })

  it('shows them all on the page', () => {
    open('/guide')
    for (const exercise of EXERCISES) {
      expect(host.textContent, exercise.type).toContain(exercise.name)
    }
  })
})

describe('the pictures it names', () => {
  const dir = join(process.cwd(), 'public', 'guide')

  it('are published with the app', () => {
    for (const [id, picture] of Object.entries(PICTURES)) {
      expect(existsSync(join(dir, picture.file)), `public/guide/${picture.file} (${id})`).toBe(
        true,
      )
    }
  })

  it('come from this app and no other origin', () => {
    open('/guide')
    for (const img of host.querySelectorAll('img')) {
      const src = img.getAttribute('src') ?? ''
      expect(src.startsWith('/'), src).toBe(true)
      expect(src).not.toMatch(/^\/\//)
    }
  })

  it('say what they show, and reserve their space', () => {
    open('/guide')
    const shots = [...host.querySelectorAll('figure img')]
    expect(shots.length).toBeGreaterThan(0)
    for (const img of shots) {
      expect((img.getAttribute('alt') ?? '').length, img.getAttribute('src') ?? '')
        .toBeGreaterThan(20)
      expect(img.getAttribute('width')).not.toBeNull()
      expect(img.getAttribute('height')).not.toBeNull()
      expect(img.getAttribute('loading')).toBe('lazy')
    }
  })

  it('carry no instruction of their own: every section reads without them', () => {
    open('/guide')
    for (const section of host.querySelectorAll('section[id]')) {
      const words = section.cloneNode(true) as HTMLElement
      for (const figure of words.querySelectorAll('figure')) figure.remove()
      expect((words.textContent ?? '').length, section.id).toBeGreaterThan(200)
    }
  })
})

describe('it is written for the teacher, not for the developer', () => {
  /**
   * The words that give away a page written by whoever built the app. Crude on purpose:
   * it is not a style checker, it is a tripwire for the sentence that wandered in from
   * `README.md` (design D8).
   */
  const CONSTRUCTION = [
    'json',
    'worker',
    'reducer',
    'repository',
    'npm',
    'localhost',
    'commit',
    'typescript',
    'javascript',
    'browser cache',
    'durable object',
    'api',
  ]

  it('uses none of the vocabulary of its construction', () => {
    open('/guide')
    const text = (host.textContent ?? '').toLowerCase()
    for (const word of CONSTRUCTION) {
      expect(text, `the guide says "${word}"`).not.toMatch(new RegExp(`\\b${word}\\b`))
    }
  })

  it('states the limits of a room as facts about a lesson', () => {
    open('/guide')
    const text = host.textContent ?? ''
    expect(text).toContain('four people')
    expect(text).toContain('three hours')
    expect(text).toContain('Nothing is saved')
  })
})
