// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Lesson } from '@/shared/types'

/**
 * A topic short enough for one sitting offers nothing to choose and opens as one lesson,
 * exactly as every topic did before this change (spec).
 *
 * Every shipped topic now declares parts, so this is the one case the real catalogue
 * cannot show. The catalogue is stood in for rather than the machinery, so what is under
 * test is still the app.
 */
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const short: Lesson = {
  id: 'greetings',
  title: 'Greetings',
  emoji: '👋',
  audience: 'kids',
  l1: null,
  items: [
    { id: 'hello', en: 'hello', emoji: '👋' },
    { id: 'bye', en: 'bye', emoji: '🙋' },
  ],
  blocks: [
    { id: 'vocab', type: 'cards', title: '🧠 What Is It?', items: { select: 'new' }, front: 'emoji', back: ['en'] },
    { id: 'done', type: 'finish', title: '🎉 Great job!', message: 'You did it!' },
  ],
}

vi.mock('@/lessons', async () => {
  const { narrow } = await import('@/shared/narrow')
  return {
    lessons: [short],
    lessonFailures: [],
    topicById: (id: string) => (id === short.id ? short : undefined),
    lessonById: (id: string) => (id === short.id ? narrow(short) : undefined),
    playableLessons: () => [narrow(short)],
  }
})

const { App } = await import('./App')

let host: HTMLDivElement
let root: Root

function open(path: string): void {
  window.history.replaceState(null, '', path)
  act(() => {
    root.render(<App />)
  })
  act(() => {
    window.dispatchEvent(new PopStateEvent('popstate'))
  })
}

beforeEach(() => {
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

describe('a topic that declares no parts', () => {
  it('offers no sizes on its card', () => {
    open('/')
    expect(host.textContent).toContain('Greetings')
    expect(host.querySelectorAll('ul li button')).toHaveLength(0)
    expect(host.querySelectorAll('[aria-expanded]')).toHaveLength(0)
  })

  it('opens its lesson straight from the card, with nothing to choose first', () => {
    open('/')
    const card = host.querySelector('button') as HTMLButtonElement
    act(() => card.dispatchEvent(new MouseEvent('click', { bubbles: true })))
    expect(window.location.pathname).toBe('/l/greetings')
    expect(host.textContent).toContain('🧠 What Is It?')
  })

  it('opens the same lesson at its bare address, over all of its words', () => {
    open('/l/greetings')
    expect(host.textContent).toContain('🧠 What Is It?')
    // Both words are on the table — `select: 'new'` over a topic with no parts is the
    // whole of it, which is what makes the four un-parted files keep working untouched.
    const cards = [...host.querySelectorAll('button')].filter((b) => b.className.includes('card'))
    expect(cards).toHaveLength(2)
  })

  it('still refuses a size it does not have', () => {
    open('/l/greetings/half')
    expect(host.textContent).toContain('There is no such lesson')
  })
})
