// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LessonPlayer } from './LessonPlayer'
import { listenTarget } from '@/shared/blocks'
import { blockStateOf } from '@/shared/reducer'
import { testLesson, testState } from '@/shared/__fixtures__/lesson'
import type { BlockOf, LessonState, ListenState } from '@/shared/types'
import type { LessonStore } from './useLesson'

/**
 * What the lesson's sound setting does once it reaches an exercise (design D70).
 *
 * The split it has to produce is the whole point and is easy to get wrong in either
 * direction: an exercise whose question is a spoken word must say it again when sound
 * comes back, or the teacher is left telling the child to press the speaker; and turning
 * sound off must stop the word already in the air rather than let it finish over her.
 *
 * The speech module is replaced wholesale, because what is being measured is which calls
 * reach it — not whether a jsdom browser can speak.
 */
const module = vi.hoisted(() => {
  // One snapshot object, returned every time: `useSyncExternalStore` compares by
  // identity, and a fresh object per call re-renders forever. The real module keeps the
  // same discipline, and `quietable` hands `getState` through untouched for it.
  const state = { status: 'working' as const, speaking: false, enableAttempted: false }
  return {
    speak: vi.fn(),
    quiet: false,
    enable: vi.fn(),
    getState: () => state,
    subscribe: () => () => {},
    cancel: vi.fn(),
    preload: vi.fn(),
  }
})

vi.mock('@/speech/speech', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/speech/speech')>()),
  speech: module,
}))

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined
}

const lesson = testLesson()
/** The listening exercise: the one whose automatic line is the question itself. */
const LISTEN_SLIDE = lesson.blocks.findIndex((b) => b.id === 'ears')

/** The word this exercise opens on, derived exactly as the player derives it. */
function firstWord(state: LessonState): string {
  const block = lesson.blocks[LISTEN_SLIDE] as BlockOf<'listen'>
  const target = listenTarget(blockStateOf(lesson, state, block) as ListenState)
  return lesson.items.find((i) => i.id === target)?.en as string
}

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

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  module.speak.mockClear()
  module.cancel.mockClear()
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

function render(state: LessonState, muted: boolean): void {
  act(() => {
    root.render(<LessonPlayer lesson={lesson} store={store(state, muted)} onExit={() => {}} />)
  })
}

describe('the lesson’s sound setting reaches the exercise', () => {
  const onListen = (): LessonState => ({ ...testState(), slide: LISTEN_SLIDE })

  it('says nothing on arriving at the word while the lesson is quiet', () => {
    render(onListen(), true)
    expect(module.speak).not.toHaveBeenCalled()
  })

  it('says the word on arriving at it while the sound is on', () => {
    const state = onListen()
    render(state, false)
    expect(module.speak).toHaveBeenCalledWith(firstWord(state), 'auto')
  })

  // Spec: "Turning it back on where a prompt is standing" — the teacher flips the switch
  // on a listening exercise and the word arrives, on both screens, with nobody tapping.
  it('says the standing word again when the sound is turned back on', () => {
    const state = onListen()
    render(state, true)
    expect(module.speak).not.toHaveBeenCalled()

    render(state, false)
    expect(module.speak).toHaveBeenCalledWith(firstWord(state), 'auto')
  })

  it('says nothing more when the sound is turned off', () => {
    const state = onListen()
    render(state, false)
    module.speak.mockClear()

    render(state, true)
    expect(module.speak).not.toHaveBeenCalled()
  })

  // Spec: "A word in flight when the setting is turned off" — she pressed this because
  // she wants to talk now, so the line stops rather than finishing over her.
  it('stops the word already in the air when the sound is turned off', () => {
    const state = onListen()
    render(state, false)
    module.cancel.mockClear()

    render(state, true)
    expect(module.cancel).toHaveBeenCalled()
  })

  it('does not stop anything merely because the sound is on', () => {
    render(onListen(), false)
    expect(module.cancel).not.toHaveBeenCalled()
  })

  // Recordings are still warmed while quiet: sound can come back at any moment, and the
  // word it comes back for is the one that would otherwise wait on the network.
  it('still fetches the lesson’s recordings while quiet', () => {
    render(onListen(), true)
    expect(module.preload).toHaveBeenCalled()
  })
})
