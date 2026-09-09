// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PhrasesView } from './PhrasesView'
import { blockLogic } from '@/shared/blocks'
import { testLesson } from '@/shared/__fixtures__/lesson'
import type { Speech } from '@/speech/speech'
import type { Action, BlockOf, PhrasesState } from '@/shared/types'

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined
}

const lesson = testLesson()
const block = lesson.blocks.find((b) => b.type === 'phrases') as BlockOf<'phrases'>

function fakeSpeech(quiet: boolean): Speech {
  return {
    speak: vi.fn(),
    quiet,
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

function render(speech: Speech, dispatch: (a: Action) => void = () => {}, state?: PhrasesState) {
  const initial = state ?? blockLogic.phrases.init(lesson, block, 4242)
  act(() => {
    root.render(
      <PhrasesView
        lesson={lesson}
        block={block}
        state={initial}
        seed={4242}
        dispatch={dispatch}
        speech={speech}
      />,
    )
  })
}

const buttons = () => [...container.querySelectorAll('button')]

describe('the phrase list', () => {
  it('writes every phrase out, sound or no sound', () => {
    render(fakeSpeech(true))
    for (const line of block.lines) expect(container.textContent).toContain(line)
  })

  it('says a phrase on demand, so a quieted lesson can still hear it', () => {
    const speech = fakeSpeech(true)
    render(speech)
    act(() => {
      buttons()[0]?.click()
    })
    expect(speech.speak).toHaveBeenCalledWith(block.lines[0], 'demand')
  })

  it('records the phrase that was pressed, by its position', () => {
    const dispatch = vi.fn()
    render(fakeSpeech(false), dispatch)
    act(() => {
      buttons()[1]?.click()
    })
    expect(dispatch).toHaveBeenCalledWith({ t: 'tap', block: block.id, target: '1' })
  })

  it('volunteers nothing on arrival — a phrase list waits to be asked', () => {
    const speech = fakeSpeech(false)
    render(speech)
    expect(speech.speak).not.toHaveBeenCalled()
  })

  it('marks a phrase already heard', () => {
    render(fakeSpeech(false), () => {}, { played: ['0'] })
    const marked = buttons().filter((b) => b.className.includes('phraseHeard'))
    expect(marked).toHaveLength(1)
  })
})
