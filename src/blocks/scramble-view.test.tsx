// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ScrambleView } from './ScrambleView'
import { blockLogic, scrambleChips, scrambleTarget, sentenceWords } from '@/shared/blocks'
import { testLesson } from '@/shared/__fixtures__/lesson'
import { itemById } from '@/shared/text'
import type { Speech } from '@/speech/speech'
import type { Action, BlockOf, ScrambleState } from '@/shared/types'

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined
}

const lesson = testLesson()
const block = lesson.blocks.find((b) => b.type === 'scramble') as BlockOf<'scramble'>
const SEED = 4242

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

function render(
  state: ScrambleState,
  speech: Speech,
  dispatch: (a: Action) => void = () => {},
): void {
  act(() => {
    root.render(
      <ScrambleView
        lesson={lesson}
        block={block}
        state={state}
        seed={SEED}
        dispatch={dispatch}
        speech={speech}
      />,
    )
  })
}

const initial = (): ScrambleState => blockLogic.scramble.init(lesson, block, SEED)
const buttons = () => [...container.querySelectorAll<HTMLButtonElement>('button')]
const chipButtons = () => buttons().filter((b) => b.textContent !== 'Next word →')
const forward = () => buttons().find((b) => b.textContent === 'Next word →')

/** The sentence being asked for in a given state. */
function wordsOf(state: ScrambleState): string[] {
  return sentenceWords(block, itemById(lesson, scrambleTarget(state) as string)!)
}

describe('the sentence-assembly view', () => {
  it('offers the sentence’s words, shuffled, and nothing else', () => {
    const state = initial()
    render(state, fakeSpeech(true))
    const chips = scrambleChips(lesson, block, state, SEED)
    expect(chipButtons().map((b) => b.textContent)).toEqual(chips)
  })

  it('places the word whose chip was tapped', () => {
    const state = initial()
    const dispatch = vi.fn()
    render(state, fakeSpeech(true), dispatch)
    const chip = chipButtons()[0]
    act(() => chip?.click())
    expect(dispatch).toHaveBeenCalledWith({
      t: 'pick', block: block.id, side: 'a', target: chip?.textContent,
    })
  })

  it('says nothing at all as words are placed', () => {
    const speech = fakeSpeech(false)
    const state = initial()
    render({ ...state, placed: 1 }, speech)
    render({ ...state, placed: 2 }, speech)
    expect(speech.speak).not.toHaveBeenCalled()
  })

  it('speaks the whole sentence once, when its last word lands', () => {
    const speech = fakeSpeech(false)
    const state = initial()
    const words = wordsOf(state)
    render({ ...state, placed: words.length - 1 }, speech)
    render({ ...state, placed: words.length }, speech)
    expect(speech.speak).toHaveBeenCalledTimes(1)
    expect(speech.speak).toHaveBeenCalledWith(words.join(' '))
  })

  it('shows the finished sentence as one line', () => {
    const state = initial()
    const words = wordsOf(state)
    render({ ...state, placed: words.length }, fakeSpeech(true))
    expect(container.textContent).toContain(words.join(' '))
  })

  it('shows the sentence with the sound off, and only volunteers it', () => {
    const speech = fakeSpeech(true)
    const state = initial()
    const words = wordsOf(state)
    render({ ...state, placed: words.length - 1 }, speech)
    render({ ...state, placed: words.length }, speech)
    expect(container.textContent).toContain(words.join(' '))
    // No 'demand' intent: this is the app volunteering, which `quietable` suppresses.
    expect(speech.speak).toHaveBeenCalledWith(words.join(' '))
  })

  it('offers no way forward until the sentence is whole', () => {
    const state = initial()
    render({ ...state, placed: 1 }, fakeSpeech(true))
    expect(forward()).toBeUndefined()
  })

  it('moves on when the way forward is taken, naming the word being left behind', () => {
    const state = initial()
    const dispatch = vi.fn()
    render({ ...state, placed: wordsOf(state).length }, fakeSpeech(true), dispatch)
    act(() => forward()?.click())
    expect(dispatch).toHaveBeenCalledWith({
      t: 'tap', block: block.id, target: scrambleTarget(state),
    })
  })

  it('offers no way forward on the last sentence, which would empty the exercise', () => {
    const state = initial()
    const last = { ...state, index: state.order.length - 1, placed: 0 }
    render({ ...last, placed: wordsOf(last).length }, fakeSpeech(true))
    expect(forward()).toBeUndefined()
    expect(container.textContent).toContain(wordsOf(last).join(' '))
  })

  it('says it is done rather than showing nothing, past the last sentence', () => {
    const state = initial()
    render({ ...state, index: state.order.length, placed: 0 }, fakeSpeech(true))
    expect(container.textContent).toContain('All done!')
  })

  it('takes a chip out of play once its word is down', () => {
    const state = initial()
    render({ ...state, placed: 1 }, fakeSpeech(true))
    const used = chipButtons().filter((b) => b.disabled)
    expect(used).toHaveLength(1)
    expect(used[0]?.textContent).toBe(wordsOf(state)[0])
  })
})
