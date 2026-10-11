// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { YesNoView } from './YesNoView'
import { blockLogic, trueAnswer } from '@/shared/blocks'
import { testLesson } from '@/shared/__fixtures__/lesson'
import type { Speech } from '@/speech/speech'
import type { Action, BlockOf, Lesson, YesNoState } from '@/shared/types'

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined
}

const check: BlockOf<'yesno'> = {
  id: 'is', type: 'yesno', title: 'Is this a…?', items: { select: 'ids', ids: ['dog', 'cat', 'lion'] },
  question: 'Is this a {en}?', yes: 'Yes, it is. It is a {en}.', no: "No, it isn't. It is a {en}.", check: true,
}
const lesson: Lesson = { ...testLesson(), blocks: [check] }

function fakeSpeech(): Speech {
  return {
    speak: vi.fn(),
    quiet: true,
    enable: vi.fn(),
    getState: () => ({ status: 'working', speaking: false, enableAttempted: false }),
    subscribe: () => () => {},
    cancel: vi.fn(),
    preload: vi.fn(),
  }
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

function render(state: YesNoState, speech: Speech, dispatch: (a: Action) => void = () => {}): void {
  act(() => {
    root.render(<YesNoView lesson={lesson} block={check} state={state} seed={1} dispatch={dispatch} speech={speech} />)
  })
}

/** A state whose first question is false, so a wrong answer is possible. */
function falseFirst(): YesNoState {
  for (let seed = 1; seed < 500; seed++) {
    const s = blockLogic.yesno.init(lesson, check, seed)
    if (s.asked[0] !== s.order[0]) return s
  }
  throw new Error('no false first question')
}

const button = (text: string) =>
  [...container.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent?.includes(text))
const text = () => container.textContent ?? ''

describe('YesNoView', () => {
  it('writes the question out, and says nothing on arrival', () => {
    const state = falseFirst()
    const speech = fakeSpeech()
    render(state, speech)
    const asked = lesson.items.find((i) => i.id === state.asked[0])!
    expect(text()).toContain(`Is this a ${asked.en}?`)
    expect(speech.speak).not.toHaveBeenCalled()
  })

  it('says the question from its control, on demand, so it works with the sound off', () => {
    const state = falseFirst()
    const speech = fakeSpeech()
    render(state, speech)
    act(() => container.querySelector<HTMLButtonElement>('button[aria-label^="Say"]')!.click())
    const asked = lesson.items.find((i) => i.id === state.asked[0])!
    expect(speech.speak).toHaveBeenCalledWith(`Is this a ${asked.en}?`, 'demand')
  })

  it('shows no reply after a wrong answer to a check', () => {
    const state = { ...falseFirst(), wrong: 'yes' as const }
    render(state, fakeSpeech())
    expect(text()).not.toContain('It is a')
  })

  it('shows and volunteers the reply about the item shown after the true answer', () => {
    const base = falseFirst()
    const state = { ...base, answer: trueAnswer(base) }
    const speech = fakeSpeech()
    render(base, speech)
    render(state, speech)
    const shown = lesson.items.find((i) => i.id === base.order[0])!
    expect(text()).toContain(`No, it isn't. It is a ${shown.en}.`)
    expect(speech.speak).toHaveBeenCalledWith(`No, it isn't. It is a ${shown.en}.`)
    expect(button('Next →')).toBeDefined()
  })

  it('dispatches the answer tapped', () => {
    const dispatch = vi.fn()
    render(falseFirst(), fakeSpeech(), dispatch)
    act(() => button('No')!.click())
    expect(dispatch).toHaveBeenCalledWith({ t: 'tap', block: 'is', target: 'no' })
  })

  it('offers no way forward on the last item', () => {
    const base = falseFirst()
    const last = base.order.length - 1
    const state: YesNoState = { ...base, index: last, answer: base.asked[last] === base.order[last] ? 'yes' : 'no' }
    render(state, fakeSpeech())
    expect(button('Next →')).toBeUndefined()
  })
})
