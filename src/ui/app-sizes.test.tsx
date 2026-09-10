// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { App } from './App'

/**
 * Choosing how much of a topic to teach: from the home screen to the lesson that starts.
 *
 * Driven through the real app against the real lesson files, because the point of the
 * change is that a size is a lesson nobody wrote down — a test against a fixture topic
 * would prove the machinery and leave the content unchecked.
 */
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let host: HTMLDivElement
let root: Root

/**
 * Goes to an address the way the browser would. The router reads the location on mount
 * and on `popstate`, so the event is what a Back button or a typed address looks like to
 * it — and it keeps the App mounted, which is the whole question when the size changes.
 */
function open(path: string): void {
  window.history.replaceState(null, '', path)
  act(() => {
    root.render(<App />)
  })
  act(() => {
    window.dispatchEvent(new PopStateEvent('popstate'))
  })
}

/** Collapses whichever card is expanded, by tapping its head a second time. */
function collapse(): void {
  const head = host.querySelector('[aria-expanded="true"]')
  if (head === null) throw new Error('no card is expanded')
  act(() => {
    head.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
}

function buttons(): HTMLButtonElement[] {
  return [...host.querySelectorAll('button')]
}

function click(text: string): void {
  const button = buttons().find((b) => (b.textContent ?? '').includes(text))
  if (button === undefined) {
    throw new Error(
      `no button says "${text}"; screen has: ${buttons().map((b) => b.textContent).join(' | ')}`,
    )
  }
  act(() => {
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
}

/** The sizes offered on whichever card is expanded, in the order they are shown. */
function sizes(): string[] {
  return [...host.querySelectorAll('ul li button')].map((b) => b.textContent ?? '')
}

/** What the star trail says, e.g. "0 of 8 done" — the player's own summary of progress. */
function trail(): string {
  return host.querySelector('[aria-label$="done"]')?.getAttribute('aria-label') ?? ''
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

describe('the sizes a topic offers', () => {
  it('shows nothing to choose until a topic is opened', () => {
    open('/')
    expect(host.textContent).toContain('Animals')
    expect(host.querySelectorAll('[aria-expanded="true"]')).toHaveLength(0)
    expect(sizes()).toEqual([])
  })

  it('expands a topic’s card to its three sizes, and shows them away again', () => {
    open('/')
    click('Animals')
    expect(window.location.pathname).toBe('/l/animals')
    expect(host.querySelectorAll('[aria-expanded="true"]')).toHaveLength(1)
    expect(sizes()).toHaveLength(3)

    collapse()
    expect(window.location.pathname).toBe('/')
    expect(host.querySelectorAll('[aria-expanded="true"]')).toHaveLength(0)
    expect(sizes()).toEqual([])
  })

  it('says what each size teaches, and what a later part revises besides', () => {
    open('/l/animals')
    const [known, wild, whole] = sizes()
    expect(known).toContain('5 new words · Animals 1 · You Know These')
    expect(known).toContain('The first sitting of the topic')
    expect(wild).toContain('5 new words · Animals 2 · Wild Animals')
    expect(wild).toContain('10 words in the lesson, revising 5')
    expect(whole).toContain('All 10 words')
  })

  it('counts the topic’s own words rather than a figure every topic must have', () => {
    open('/l/animals')
    expect(host.textContent).toContain('All 10 words')
    open('/l/shapes')
    expect(host.textContent).toContain('All 8 words')
    expect(host.textContent).not.toContain('All 10 words')
  })

  it('starts the lesson at the size that was tapped', () => {
    open('/l/animals')
    click('Animals 2 · Wild Animals')
    expect(window.location.pathname).toBe('/l/animals/wild')
    expect(host.textContent).toContain('Animals 2 · Wild Animals')
    expect(host.textContent).toContain('🧠 What Is It?')
  })
})

describe('a size in the address', () => {
  it('opens a part cold, over the words that part carries', () => {
    open('/l/animals/known')
    expect(host.textContent).toContain('Animals 1 · You Know These')
    expect(host.textContent).toContain('🧠 What Is It?')
    expect(trail()).toBe('0 of 7 done')
  })

  it('opens the whole topic at its own address, which carries every exercise', () => {
    open('/l/animals/all')
    expect(host.textContent).toContain('🧠 What Is It?')
    expect(trail()).toBe('0 of 9 done')
  })

  it('says there is no such lesson when the size is not one the topic offers', () => {
    open('/l/animals/nope')
    expect(host.textContent).toContain('There is no such lesson')
    expect(host.textContent).not.toContain('What Is It?')
  })

  it('says there is no such lesson at the addresses the split files had', () => {
    open('/l/animals-1')
    expect(host.textContent).toContain('There is no such lesson')
    open('/l/shapes-2')
    expect(host.textContent).toContain('There is no such lesson')
  })
})

describe('changing size starts the lesson again (design D7)', () => {
  it('carries no progress from the size just left', () => {
    open('/l/animals/known')
    expect(trail()).toBe('0 of 7 done')

    // Turn over every card of the first exercise, which finishes it.
    for (const card of buttons().filter((b) => b.className.includes('card'))) {
      act(() => card.dispatchEvent(new MouseEvent('click', { bubbles: true })))
    }
    expect(trail()).toBe('1 of 7 done')

    open('/l/animals/all')
    expect(trail()).toBe('0 of 9 done')
  })
})
