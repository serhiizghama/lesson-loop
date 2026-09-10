// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryView } from './MemoryView'
import { blockLogic, cardId, cardItem } from '@/shared/blocks'
import { testLesson } from '@/shared/__fixtures__/lesson'
import type { Speech } from '@/speech/speech'
import type { Action, BlockOf, MemoryState } from '@/shared/types'

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined
}

const lesson = testLesson()
const block = lesson.blocks.find((b) => b.type === 'memory') as BlockOf<'memory'>

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

function render(state: MemoryState, speech: Speech, dispatch: (a: Action) => void = () => {}): void {
  act(() => {
    root.render(
      <MemoryView
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

const initial = (): MemoryState => blockLogic.memory.init(lesson, block, 4242)
const cards = () => [...container.querySelectorAll<HTMLButtonElement>('button')]
const cardAt = (id: string) => cards()[initial().order.indexOf(id)]

describe('the memory board', () => {
  it('lays every card out face down, giving nothing away', () => {
    const state = initial()
    render(state, fakeSpeech(true))
    expect(cards()).toHaveLength(state.order.length)
    for (const card of cards()) {
      expect(card.getAttribute('aria-label')).toBe('a card, face down')
    }
    for (const item of lesson.items) {
      expect(container.textContent).not.toContain(item.en)
    }
  })

  it('turns up the card that was tapped', () => {
    const state = initial()
    const dispatch = vi.fn()
    render(state, fakeSpeech(true), dispatch)
    act(() => cards()[0]?.click())
    expect(dispatch).toHaveBeenCalledWith({ t: 'tap', block: block.id, target: state.order[0] })
  })

  it('speaks a card as it turns up, by the face it shows', () => {
    const state = initial()
    const speech = fakeSpeech(false)
    const word = state.order.find((c) => c.endsWith('#b')) as string
    render(state, speech, () => {})
    act(() => cardAt(word)?.click())
    expect(speech.speak).toHaveBeenCalledWith(
      lesson.items.find((i) => i.id === cardItem(word))?.en,
    )
  })

  it('shows a card that is up, and locks one that is matched', () => {
    const state = initial()
    const id = cardItem(state.order[0] as string)
    render(
      { ...state, matched: [cardId(id, 'a'), cardId(id, 'b')] },
      fakeSpeech(true),
    )
    const en = lesson.items.find((i) => i.id === id)?.en as string
    expect(container.textContent).toContain(en)
    expect(cardAt(cardId(id, 'a'))?.disabled).toBe(true)
  })

  it('says the pair line once when a pair closes, and not the card that closed it', () => {
    const state = initial()
    const id = cardItem(state.order[0] as string)
    const speech = fakeSpeech(false)
    render({ ...state, up: [cardId(id, 'a')] }, speech, () => {})

    act(() => cardAt(cardId(id, 'b'))?.click())
    const en = lesson.items.find((i) => i.id === id)?.en
    expect(speech.speak).not.toHaveBeenCalledWith(en)

    // The line itself is spoken when the closed pair arrives in the state.
    const speech2 = fakeSpeech(false)
    render({ ...state, matched: [cardId(id, 'a'), cardId(id, 'b')] }, speech2)
    const sound = lesson.items.find((i) => i.id === id)?.tags?.['sound']
    expect(speech2.speak).toHaveBeenCalledWith(`The ${en} says ${sound}!`)
  })

  it('closes the pair with the sound off, and only volunteers the line', () => {
    const state = initial()
    const id = cardItem(state.order[0] as string)
    const speech = fakeSpeech(true)
    render({ ...state, up: [cardId(id, 'a')] }, speech)
    render({ ...state, matched: [cardId(id, 'a'), cardId(id, 'b')] }, speech)
    // No 'demand' intent: this is the app volunteering, which `quietable` suppresses.
    const en = lesson.items.find((i) => i.id === id)?.en
    const sound = lesson.items.find((i) => i.id === id)?.tags?.['sound']
    expect(speech.speak).toHaveBeenCalledWith(`The ${en} says ${sound}!`)
    expect(cardAt(cardId(id, 'a'))?.disabled).toBe(true)
  })

  it('counts the tries taken, and shows no score and no turn', () => {
    render({ ...initial(), tries: 3 }, fakeSpeech(true))
    expect(container.textContent).toContain('3 tries')
    expect(container.textContent).not.toMatch(/turn|score|point/i)
  })

  it('counts one try in the singular', () => {
    render({ ...initial(), tries: 1 }, fakeSpeech(true))
    expect(container.textContent).toContain('1 try')
  })
})
