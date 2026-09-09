// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { testLesson, testState } from '@/shared/__fixtures__/lesson'
import type { LessonState } from '@/shared/types'
import type { LessonStore } from './useLesson'
import { complete } from '../../tests/support/play'

/**
 * The player's effects, which `renderToStaticMarkup` cannot reach — the rest of the view
 * tests read markup, and markup is rendered without ever running an effect.
 *
 * Rendered with React's own `act` into jsdom, both of which the project already has, so no
 * test dependency is added for this (the change adds no dependency at all).
 */
// React wants to be told it is in a test before it will accept `act` without complaining.
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const effects = {
  chime: vi.fn(),
  notes: vi.fn(),
  stop: vi.fn(),
  enable: vi.fn(),
  isAvailable: () => true,
}

const voice = {
  speak: vi.fn(),
  quiet: false,
  enable: vi.fn(),
  getState: () => ({ status: 'working' as const, speaking: false, enableAttempted: false }),
  subscribe: () => () => {},
  cancel: vi.fn(),
  preload: vi.fn(),
}

vi.mock('@/sound/sound', () => ({ sound: effects }))
vi.mock('@/speech/speech', () => ({ speech: voice }))

const { LessonPlayer } = await import('./LessonPlayer')
const lesson = testLesson()

function store(state: LessonState, muted: boolean): LessonStore {
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

let host: HTMLDivElement
let root: ReturnType<typeof createRoot>

function render(state: LessonState, muted = false) {
  act(() => {
    root.render(<LessonPlayer lesson={lesson} store={store(state, muted)} onExit={() => {}} />)
  })
}

beforeEach(() => {
  for (const fn of [effects.chime, effects.notes, effects.stop, voice.speak, voice.cancel]) {
    fn.mockClear()
  }
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})

afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

describe('turning the lesson quiet stops what is already sounding (design D78)', () => {
  it('stops the effects when the setting is turned off', () => {
    render(testState(), false)
    expect(effects.stop).not.toHaveBeenCalled()

    render(testState(), true)
    expect(effects.stop).toHaveBeenCalled()
    // The mirror of it, which the player already did for words.
    expect(voice.cancel).toHaveBeenCalled()
  })

  it('does not stop them on a re-render that leaves the setting alone', () => {
    render(testState(), false)
    render({ ...testState(), slide: 1 }, false)
    render({ ...testState(), slide: 2 }, false)
    expect(effects.stop).not.toHaveBeenCalled()
  })

  it('does not stop them again on a re-render while already quiet', () => {
    render(testState(), true)
    effects.stop.mockClear()
    render({ ...testState(), slide: 1 }, true)
    expect(effects.stop).not.toHaveBeenCalled()
  })
})

describe('the closing screen asks for its notes and its message (design D82)', () => {
  const atFinish = () => ({ ...testState(), slide: lesson.blocks.length - 1 })

  it('counts one note per earned star when it is reached', () => {
    render(atFinish(), false)
    expect(effects.notes).toHaveBeenCalledWith(0, 250)
  })

  it('asks for no notes while the lesson is quiet', () => {
    render(atFinish(), true)
    expect(effects.notes).not.toHaveBeenCalled()
  })

  /**
   * The closing screen is a sound and a picture, and its message is on the screen to be
   * read. Nothing about finishing is spoken — the teacher is the voice of a live lesson,
   * and an app congratulating a child over her is the app talking across her.
   */
  it('says nothing at all, however long it is left running', () => {
    vi.useFakeTimers()
    try {
      render(atFinish(), false)
      act(() => {
        vi.advanceTimersByTime(5000)
      })
      expect(voice.speak).not.toHaveBeenCalled()
    } finally {
      vi.useRealTimers()
    }
  })

  it('stops the notes when the slide is left', () => {
    render(atFinish(), false)
    effects.stop.mockClear()
    render({ ...testState(), slide: 0 }, false) // she goes back to an exercise
    expect(effects.stop).toHaveBeenCalled()
  })
})

describe('completing an exercise is celebrated without a word (design D77)', () => {
  it('chimes and says nothing', () => {
    vi.useFakeTimers()
    try {
      // A block already complete on arrival plays no moment, so start open and finish it
      // by rendering the completed state over the open one.
      render(testState(), false)
      render(complete(lesson, testState(), lesson.blocks[0]!), false)
      act(() => {
        vi.advanceTimersByTime(3000)
      })
      // The chime proves a moment really ran, so the silence below means something.
      expect(effects.chime).toHaveBeenCalledTimes(1)
      expect(voice.speak).not.toHaveBeenCalled()
    } finally {
      vi.useRealTimers()
    }
  })
})
