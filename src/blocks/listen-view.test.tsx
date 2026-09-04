// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ListenView } from './ListenView'
import { blockLogic } from '@/shared/blocks'
import { testLesson } from '@/shared/__fixtures__/lesson'
import type { Speech, SpeechState, SpeechStatus } from '@/speech/speech'
import type { Action, BlockOf } from '@/shared/types'

/**
 * The listening exercise is the one place where sound is the question rather than a
 * flourish, so these tests are about what the learner can tell from the screen: whether
 * the word was said, whether this device can say it, and whether the answer is still
 * reachable when it cannot.
 */
declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined
}

const lesson = testLesson()
const block = lesson.blocks.find((b) => b.type === 'listen') as BlockOf<'listen'>

/** A speech module frozen in one state, so a render can be pinned to it. */
function fakeSpeech(status: SpeechStatus, extra: Partial<SpeechState> = {}, quiet = false) {
  const state: SpeechState = { status, speaking: false, enableAttempted: false, ...extra }
  const speech: Speech = {
    speak: vi.fn(),
    quiet,
    enable: vi.fn(),
    getState: () => state,
    subscribe: () => () => {},
    cancel: vi.fn(),
    preload: vi.fn(),
  }
  return speech
}

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

function render(speech: Speech, dispatch: (a: Action) => void = () => {}) {
  const state = blockLogic.listen.init(lesson, block, 4242)
  act(() => {
    root.render(
      <ListenView
        lesson={lesson}
        block={block}
        state={state}
        seed={4242}
        dispatch={dispatch}
        speech={speech}
      />,
    )
  })
  return state
}

/** The one control above the pictures, whichever of its faces is showing. */
function control(): HTMLButtonElement {
  return container.querySelector('button') as HTMLButtonElement
}

function pictures(): HTMLButtonElement[] {
  return [...container.querySelectorAll('button')].slice(1) as HTMLButtonElement[]
}

describe('the repeat control says what it is doing', () => {
  it('offers to repeat the word when speech is working', () => {
    render(fakeSpeech('working'))
    expect(control().textContent).toContain('Listen again')
    expect(control().disabled).toBe(false)
  })

  it('shows that a word is playing right now', () => {
    render(fakeSpeech('working', { speaking: true }))
    expect(control().textContent).toContain('Speaking')
    expect(control().disabled).toBe(false)
  })

  it('shows that this device has no sound, once that is settled', () => {
    render(fakeSpeech('silent', { enableAttempted: true }))
    expect(control().textContent).toContain('No sound')
    expect(control().disabled).toBe(false)
  })

  it('repeats the word when tapped', () => {
    const speech = fakeSpeech('working')
    const state = render(speech)
    // Cleared, because arriving at the word speaks it too: without this the assertion
    // below would be satisfied by the mount and would prove nothing about the tap.
    vi.mocked(speech.speak).mockClear()

    act(() => control().click())
    expect(speech.speak).toHaveBeenCalledWith(state.order[state.index], 'demand')
  })
})

/**
 * A lesson the teacher has told to be quiet (design D69). The device speaks perfectly
 * well here — what has changed is that the app no longer volunteers, so the word arrives
 * when it is asked for and the control has to say so.
 */
describe('the repeat control while the lesson is quiet', () => {
  it('invites a first play rather than a repeat', () => {
    render(fakeSpeech('working', {}, true))
    expect(control().textContent).toContain('Listen')
    expect(control().textContent).not.toContain('Listen again')
  })

  it('offers a repeat again once the lesson is not quiet', () => {
    render(fakeSpeech('working', {}, false))
    expect(control().textContent).toContain('Listen again')
  })

  // Spec: "Arriving at a word with the lesson quieted" — the written word stays reserved
  // for a device that cannot speak, not for a teacher who chose silence.
  it('does not reveal the written word', () => {
    const state = render(fakeSpeech('working', {}, true))
    expect(container.textContent).not.toContain(state.order[state.index])
    expect(control().textContent).not.toContain('No sound')
  })

  // Spec: "Asking for the word in a quieted lesson" — this is the intent that gets
  // through the suppression, and it is the whole of why the exercise stays answerable.
  it('speaks the word when pressed', () => {
    const speech = fakeSpeech('working', {}, true)
    const state = render(speech)
    vi.mocked(speech.speak).mockClear()

    act(() => control().click())
    expect(speech.speak).toHaveBeenCalledWith(state.order[state.index], 'demand')
  })
})

describe('a screen that has not been allowed to speak', () => {
  it('offers the gesture instead of giving away the word', () => {
    const state = render(fakeSpeech('silent'))
    expect(control().textContent).toContain('Turn on sound')
    // Revealing the word here would turn listening into reading before it had to.
    expect(container.textContent).not.toContain(state.order[state.index])
  })

  it('asks speech to try again from inside the tap', () => {
    const speech = fakeSpeech('silent')
    render(speech)
    act(() => control().click())
    expect(speech.enable).toHaveBeenCalled()
  })

  it('does not offer sound while nothing has failed yet', () => {
    render(fakeSpeech('untested'))
    expect(control().textContent).not.toContain('Turn on sound')
  })
})

describe('the written word is a last resort', () => {
  it('stays hidden until the offer has been taken', () => {
    const state = render(fakeSpeech('silent', { enableAttempted: false }))
    expect(container.textContent).not.toContain(state.order[state.index])
  })

  it('appears once turning sound on has been tried and failed', () => {
    const state = render(fakeSpeech('silent', { enableAttempted: true }))
    const target = state.order[state.index]
    expect(container.textContent).toContain(target)
  })

  it('appears at once where there is no speech at all, since the offer would be a lie', () => {
    const state = render(fakeSpeech('unsupported'))
    const target = state.order[state.index]
    expect(container.textContent).toContain(target)
    expect(container.textContent).not.toContain('Turn on sound')
  })
})

describe('answering never depends on sound', () => {
  it('dispatches the same tap on a mute device as on a working one', () => {
    const onWorking = vi.fn()
    const working = render(fakeSpeech('working'), onWorking)
    act(() => pictures()[0]?.click())

    act(() => root.unmount())
    root = createRoot(container)

    const onSilent = vi.fn()
    const silent = render(fakeSpeech('silent', { enableAttempted: true }), onSilent)
    act(() => pictures()[0]?.click())

    expect(working.order).toEqual(silent.order)
    expect(onSilent.mock.calls[0]).toEqual(onWorking.mock.calls[0])
    expect(onSilent.mock.calls[0]?.[0]).toMatchObject({ t: 'tap', block: block.id })
  })

  it('leaves every picture tappable when the device is mute', () => {
    render(fakeSpeech('silent', { enableAttempted: true }))
    expect(pictures()).toHaveLength(block.choices ?? 4)
    expect(pictures().every((b) => !b.disabled)).toBe(true)
  })
})

describe('the exercise survives server rendering', () => {
  /**
   * Every other view in this repo is tested through `renderToStaticMarkup`, and an
   * external store without a server snapshot throws there. This block subscribes to
   * speech, so it is the one that would have broken that convention.
   */
  it('renders to static markup like every other block', () => {
    const state = blockLogic.listen.init(lesson, block, 4242)
    const markup = renderToStaticMarkup(
      <ListenView
        lesson={lesson}
        block={block}
        state={state}
        seed={4242}
        dispatch={() => {}}
        speech={fakeSpeech('working')}
      />,
    )
    expect(markup).toContain('Listen again')
  })
})
