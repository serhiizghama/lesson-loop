// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { QuizView } from './QuizView'
import { blockLogic, quizChoices, quizTarget } from '@/shared/blocks'
import { testLesson } from '@/shared/__fixtures__/lesson'
import type { Speech } from '@/speech/speech'
import type { Action, BlockOf, QuizState } from '@/shared/types'

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined
}

const lesson = testLesson()
const asked = lesson.blocks.find((b) => b.type === 'quiz') as BlockOf<'quiz'>
/** The same exercise the other way round: the picture asks and the words answer (D116). */
const named: BlockOf<'quiz'> = { ...asked, ask: 'emoji', show: 'en' }

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

function render(block: BlockOf<'quiz'>, speech: Speech, dispatch: (a: Action) => void = () => {}) {
  const state: QuizState = blockLogic.quiz.init(lesson, block, 4242)
  act(() => {
    root.render(
      <QuizView
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

const buttons = () => [...container.querySelectorAll('button')]
const itemOf = (id: string | null) => lesson.items.find((i) => i.id === id)

describe('the quiz', () => {
  it('asks with a tag and offers pictures', () => {
    const state = render(asked, fakeSpeech(true))
    const target = itemOf(quizTarget(state))
    expect(container.textContent).toContain(target?.tags?.['sound'])
    expect(buttons()).toHaveLength(asked.count ?? 4)
  })

  it('asks with the picture and offers the words', () => {
    const state = render(named, fakeSpeech(true))
    const choices = quizChoices(lesson, named, state, 4242)
    for (const choice of choices) expect(container.textContent).toContain(choice.en)
  })

  it('leaves every choice tappable on a device with no sound', () => {
    render(asked, fakeSpeech(true))
    expect(buttons().every((b) => !b.disabled)).toBe(true)
  })

  it('volunteers nothing while the prompt is unanswered — that would be the answer', () => {
    const speech = fakeSpeech(false)
    render(asked, speech)
    expect(speech.speak).not.toHaveBeenCalled()
  })

  it('answers with the item that was tapped', () => {
    const dispatch = vi.fn()
    const state = render(asked, fakeSpeech(false), dispatch)
    const choices = quizChoices(lesson, asked, state, 4242)
    act(() => {
      buttons()[0]?.click()
    })
    expect(dispatch).toHaveBeenCalledWith({
      t: 'tap', block: asked.id, target: choices[0]?.id,
    })
  })

  it('says the answer only once it is right', () => {
    const speech = fakeSpeech(false)
    const state = render(asked, speech, () => {})
    const choices = quizChoices(lesson, asked, state, 4242)
    const rightAt = choices.findIndex((c) => c.id === quizTarget(state))
    const wrongAt = choices.findIndex((c) => c.id !== quizTarget(state))

    act(() => {
      buttons()[wrongAt]?.click()
    })
    expect(speech.speak).not.toHaveBeenCalled()

    act(() => {
      buttons()[rightAt]?.click()
    })
    expect(speech.speak).toHaveBeenCalledWith(itemOf(quizTarget(state))?.en)
  })
})
