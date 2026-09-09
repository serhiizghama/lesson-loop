// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DescribeView } from './DescribeView'
import { blockLogic, describeSentence } from '@/shared/blocks'
import { testLesson } from '@/shared/__fixtures__/lesson'
import type { Speech } from '@/speech/speech'
import type { Action, BlockOf, DescribeState, Item } from '@/shared/types'

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined
}

const lesson = testLesson()
const block = lesson.blocks.find((b) => b.type === 'describe') as BlockOf<'describe'>

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

const start = (): DescribeState => blockLogic.describe.init(lesson, block, 4242)

function render(state: DescribeState, speech: Speech, dispatch: (a: Action) => void = () => {}) {
  act(() => {
    root.render(
      <DescribeView
        lesson={lesson}
        block={block}
        state={state}
        seed={4242}
        dispatch={dispatch}
        speech={speech}
      />,
    )
  })
}

const itemOf = (id: string | undefined) => lesson.items.find((i) => i.id === id) as Item
const sentenceShown = () => container.querySelector('[class*="describeSentence"]')

describe('the description exercise', () => {
  it('asks both questions about the item on screen', () => {
    render(start(), fakeSpeech(true))
    for (const question of block.questions) {
      expect(container.textContent).toContain(question.label)
    }
  })

  it('shows no sentence before anything is answered', () => {
    render(start(), fakeSpeech(true))
    expect(sentenceShown()).toBeNull()
  })

  it('shows no sentence while only one question is answered', () => {
    render({ ...start(), given: { a: true, b: false } }, fakeSpeech(true))
    expect(sentenceShown()).toBeNull()
  })

  it('shows the two answers as one sentence once the item is finished', () => {
    const state = start()
    render({ ...state, index: 1 }, fakeSpeech(true))
    expect(sentenceShown()?.textContent).toBe(describeSentence(block, itemOf(state.order[0])))
  })

  it('shows the sentence with the sound off, and only volunteers it', () => {
    const state = start()
    const speech = fakeSpeech(true)
    render({ ...state, index: 1 }, speech)
    expect(sentenceShown()).not.toBeNull()
    // No 'demand' intent: this is the app volunteering, which `quietable` suppresses.
    expect(speech.speak).toHaveBeenCalledWith(describeSentence(block, itemOf(state.order[0])))
  })

  it('answers the question whose choice was tapped', () => {
    const dispatch = vi.fn()
    const state = start()
    render(state, fakeSpeech(false), dispatch)
    const choices = [...container.querySelectorAll('[class*="describeQuestion"] button')]
    act(() => {
      ;(choices[0] as HTMLButtonElement | undefined)?.click()
    })
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ t: 'pick', block: block.id, side: 'a' }),
    )
  })

  it('closes a question once it is answered', () => {
    render({ ...start(), given: { a: true, b: false } }, fakeSpeech(false))
    const rows = [...container.querySelectorAll('[class*="describeQuestion"]')]
    const first = [...(rows[0]?.querySelectorAll('button') ?? [])]
    const second = [...(rows[1]?.querySelectorAll('button') ?? [])]
    expect(first.every((b) => b.disabled)).toBe(true)
    expect(second.every((b) => !b.disabled)).toBe(true)
  })
})
