// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HotspotView, resolveSpot } from './HotspotView'
import { blockLogic } from '@/shared/blocks'
import { testLesson } from '@/shared/__fixtures__/lesson'
import type { Speech } from '@/speech/speech'
import type { Action, BlockOf, HotspotState } from '@/shared/types'

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined
}

const lesson = testLesson()
const block = lesson.blocks.find((b) => b.type === 'hotspot') as BlockOf<'hotspot'>

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
  state: HotspotState,
  speech: Speech,
  dispatch: (a: Action) => void = () => {},
): void {
  act(() => {
    root.render(
      <HotspotView
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

const initial = (): HotspotState => blockLogic.hotspot.init(lesson, block, 4242)
const bankButton = (word: string) =>
  [...container.querySelectorAll('button')].find((b) => b.textContent === word)
const places = () => [...container.querySelectorAll<HTMLButtonElement>('[aria-label*="·"]')]

describe('the diagram-labelling view', () => {
  it('draws the scene once, with a place for every word still to go', () => {
    render(initial(), fakeSpeech(true))
    expect(container.querySelectorAll('svg')).toHaveLength(1)
    expect(places()).toHaveLength(block.items.select === 'ids' ? block.items.ids.length : 0)
  })

  it('offers every word in the bank and speaks the one that is picked up', () => {
    const speech = fakeSpeech(false)
    const dispatch = vi.fn()
    render(initial(), speech, dispatch)

    act(() => bankButton('dog')?.click())
    expect(dispatch).toHaveBeenCalledWith({ t: 'pick', block: block.id, side: 'a', target: 'dog' })
    expect(speech.speak).toHaveBeenCalledWith('dog')
  })

  it('places the held word on the place that is tapped', () => {
    const dispatch = vi.fn()
    render({ ...initial(), selected: 'dog' }, fakeSpeech(true), dispatch)

    act(() => places()[0]?.click())
    const call = dispatch.mock.calls[0]?.[0] as Action
    expect(call.t).toBe('pick')
    expect(call).toMatchObject({ side: 'b', block: block.id })
  })

  it('speaks the block line when the placement is right', () => {
    const speech = fakeSpeech(false)
    render({ ...initial(), selected: 'dog' }, speech, () => {})
    const target = places().find((p) => p.getAttribute('aria-label') === 'top · left')
    act(() => target?.click())
    expect(speech.speak).toHaveBeenCalledWith('This is my dog.')
  })

  it('places the word with the sound off, and only volunteers the line', () => {
    const speech = fakeSpeech(true)
    const dispatch = vi.fn()
    render({ ...initial(), selected: 'dog' }, speech, dispatch)
    const target = places().find((p) => p.getAttribute('aria-label') === 'top · left')
    act(() => target?.click())
    expect(dispatch).toHaveBeenCalled()
    // No 'demand' intent: this is the app volunteering, which `quietable` suppresses.
    expect(speech.speak).toHaveBeenCalledWith('This is my dog.')
  })

  it('shows a placed word on its place, and takes it out of the bank', () => {
    render({ ...initial(), placed: ['dog'] }, fakeSpeech(true))
    expect(bankButton('dog')).toBeUndefined()
    expect(container.textContent).toContain('dog')
  })

  it('shows nothing left to place once every word is down', () => {
    render({ ...initial(), placed: ['dog', 'cat', 'eyes'] }, fakeSpeech(true))
    expect(places()).toHaveLength(0)
    expect(container.textContent).toContain('All done!')
  })
})

describe('which place a tap belongs to', () => {
  const ids = ['dog', 'cat', 'eyes']

  it('is the one whose own rectangle the tap fell in', () => {
    expect(resolveSpot(block, ids, { x: 0.15, y: 0.08 })).toBe('dog')
    expect(resolveSpot(block, ids, { x: 0.47, y: 0.46 })).toBe('cat')
  })

  it('is the nearest one when the tap fell just outside a small place', () => {
    // Just above the "cat" rectangle, inside the room it is given under a finger.
    expect(resolveSpot(block, ids, { x: 0.48, y: 0.37 })).toBe('cat')
  })

  it('is nothing at all when the tap fell nowhere near a place', () => {
    expect(resolveSpot(block, ids, { x: 0.99, y: 0.02 })).toBeNull()
  })

  it('never answers with a word that is already placed', () => {
    expect(resolveSpot(block, ['cat', 'eyes'], { x: 0.15, y: 0.08 })).not.toBe('dog')
  })
})
