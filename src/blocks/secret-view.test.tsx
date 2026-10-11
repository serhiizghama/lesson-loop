// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SecretView } from './SecretView'
import { blockLogic } from '@/shared/blocks'
import { testLesson } from '@/shared/__fixtures__/lesson'
import type { Speech } from '@/speech/speech'
import type { Action, BlockOf, Lesson, SecretState } from '@/shared/types'

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined
}

const hide: BlockOf<'secret'> = {
  id: 'hide', type: 'secret', title: 'Guess my secret', items: { select: 'ids', ids: ['dog', 'cat', 'lion', 'elephant'] },
  rounds: 2, guess: "Is it the {en}? No, it isn't.", found: 'Yes, it is! It is the {en}.',
}
const lesson: Lesson = { ...testLesson(), blocks: [hide] }

function fakeSpeech(): Speech {
  return {
    speak: vi.fn(),
    quiet: false,
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

function render(state: SecretState, speech: Speech, dispatch: (a: Action) => void = () => {}): void {
  act(() => {
    root.render(<SecretView lesson={lesson} block={hide} state={state} seed={1} dispatch={dispatch} speech={speech} />)
  })
}

const initial = (seed = 7): SecretState => blockLogic.secret.init(lesson, hide, seed)
const tiles = () => [...container.querySelectorAll<HTMLButtonElement>('button')].filter((b) => !b.textContent?.includes('Next'))
const secretOf = (s: SecretState) => lesson.items.find((i) => i.id === s.order[s.round])!

describe('SecretView', () => {
  it('gives nothing away before the secret is found, whatever is hidden', () => {
    const renders = [1, 2, 3, 4, 5, 6].map((seed) => {
      render(initial(seed), fakeSpeech())
      return container.innerHTML
    })
    // The same markup whichever item is hidden: no picture, word, class or order differs.
    expect(new Set(renders).size).toBe(1)
    expect(container.textContent).not.toContain(secretOf(initial(1)).en)
  })

  it('disables a tile once it has been guessed wrongly, and says the guess line', () => {
    const s = initial()
    const wrong = s.order.find((id) => id !== s.order[0])!
    const speech = fakeSpeech()
    render(s, speech)
    render({ ...s, tried: [wrong] }, speech)
    const index = lesson.items.findIndex((i) => i.id === wrong)
    expect(tiles()[index]!.disabled).toBe(true)
    const item = lesson.items[index]!
    expect(speech.speak).toHaveBeenCalledWith(`Is it the ${item.en}? No, it isn't.`)
  })

  it('reveals the secret and volunteers the found line, which a quiet lesson suppresses', () => {
    const s = initial()
    const speech = fakeSpeech()
    render(s, speech)
    render({ ...s, found: true }, speech)
    const secret = secretOf(s)
    expect(container.textContent).toContain(`Yes, it is! It is the ${secret.en}.`)
    // Volunteered, not demanded: `quietable` silences it when the sound is off.
    expect(speech.speak).toHaveBeenCalledWith(`Yes, it is! It is the ${secret.en}.`)
  })

  it('offers the next round after a find, and nothing after the last', () => {
    const s = initial()
    render({ ...s, found: true }, fakeSpeech())
    expect(container.textContent).toContain('Next secret →')
    render({ ...s, round: 1, found: true }, fakeSpeech())
    expect(container.textContent).not.toContain('Next secret →')
  })
})
