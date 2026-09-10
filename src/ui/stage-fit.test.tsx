// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LessonPlayer } from './LessonPlayer'
import { STAGE_REFERENCE_PX } from './stage'
import { testLesson, testState } from '@/shared/__fixtures__/lesson'
import type { LessonState } from '@/shared/types'
import type { LessonStore } from './useLesson'

/**
 * That the player actually wires the reference width and the scale onto the page
 * (design D103).
 *
 * jsdom has no layout engine: it computes no widths, applies no stylesheet to a class, and
 * has no `ResizeObserver`. So the measurements are supplied — a viewport width and a stage
 * height — and what is checked is the arithmetic the player does with them and where it
 * puts the answer. Whether the resulting CSS *looks* right is a browser's question, and it
 * is answered by the runtime check in this change's task 7.5.
 */

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined
}

const lesson = testLesson()

function store(state: LessonState): LessonStore {
  return {
    state,
    dispatch: () => {},
    progress: { done: 0, total: 6, percent: 0 },
    muted: false,
    setMuted: () => {},
    board: {},
    ink: () => {},
    inkRole: 'teacher' as const,
    pen: true,
    setPen: () => {},
  }
}

/** A `ResizeObserver` that never fires: the player measures once, synchronously, on mount. */
class SilentResizeObserver {
  observe(): void {}
  disconnect(): void {}
  unobserve(): void {}
}

let container: HTMLDivElement
let root: Root

/**
 * Stands in for the layout jsdom will not do: every wrapper reports the viewport's width,
 * and every stage the same natural height.
 */
function measureAs(viewport: number, stageHeight: number): void {
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
    configurable: true,
    get(this: HTMLElement) {
      return this.dataset['scaled'] === 'true' || this.className.includes('stageFit')
        ? viewport
        : 0
    },
  })
  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
    configurable: true,
    get(this: HTMLElement) {
      return this.tagName === 'MAIN' ? stageHeight : 0
    },
  })
}

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  vi.stubGlobal('ResizeObserver', SilentResizeObserver)
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
  vi.unstubAllGlobals()
  Reflect.deleteProperty(HTMLElement.prototype, 'clientWidth')
  Reflect.deleteProperty(HTMLElement.prototype, 'offsetHeight')
})

function render(slide = 0): HTMLElement {
  act(() => {
    root.render(
      <LessonPlayer lesson={lesson} store={store({ ...testState(), slide })} onExit={() => {}} />,
    )
  })
  const wrapper = container.querySelector<HTMLElement>('[data-scaled="true"]')
  if (wrapper === null) throw new Error('the stage was never marked scaled')
  return wrapper
}

describe('the player scales the stage to the space it has (design D103)', () => {
  it('publishes the reference width the exercise is laid out at', () => {
    measureAs(1280, 900)
    expect(render().style.getPropertyValue('--stage-reference')).toBe(`${STAGE_REFERENCE_PX}px`)
  })

  it('leaves a wide screen at natural size', () => {
    measureAs(1280, 900)
    const wrapper = render()
    expect(wrapper.style.getPropertyValue('--stage-scale')).toBe('1')
    expect(wrapper.style.height).toBe('900px')
  })

  it('scales a narrow screen down in proportion', () => {
    measureAs(380, 900)
    const wrapper = render()
    const scale = 380 / STAGE_REFERENCE_PX
    expect(Number(wrapper.style.getPropertyValue('--stage-scale'))).toBeCloseTo(scale)
    expect(wrapper.style.height).toBe(`${Math.round(900 * scale)}px`)
  })

  it('puts the stage inside the wrapper it scales', () => {
    measureAs(380, 900)
    expect(render().querySelector('main')).not.toBeNull()
  })

  it('touches nothing at all where there is no ResizeObserver', () => {
    measureAs(380, 900)
    vi.stubGlobal('ResizeObserver', undefined)
    act(() => {
      root.render(<LessonPlayer lesson={lesson} store={store(testState())} onExit={() => {}} />)
    })
    // No marker, so the stylesheet's fluid layout — what the stage did before D103 — stands.
    expect(container.querySelector('[data-scaled="true"]')).toBeNull()
  })
})

/**
 * The three exercises added with the body diagram lay out inside the same fixed box as
 * every other one: a place on the drawing, a card on the board and a chip in a sentence
 * must name the same thing on both screens, which is only true while the stage is laid
 * out at its reference width and merely scaled (design D103, D128).
 */
describe('a diagram, a board and a scrambled sentence lay out at the reference width', () => {
  const slidesOf = (types: string[]) =>
    lesson.blocks.flatMap((block, at) => (types.includes(block.type) ? [[block.type, at]] : []))

  it.each(slidesOf(['hotspot', 'memory', 'scramble']))(
    '%s is laid out at the reference width and scaled from there',
    (_type, slide) => {
      measureAs(380, 900)
      const wrapper = render(slide as number)
      expect(wrapper.style.getPropertyValue('--stage-reference')).toBe(`${STAGE_REFERENCE_PX}px`)
      expect(Number(wrapper.style.getPropertyValue('--stage-scale'))).toBeCloseTo(
        380 / STAGE_REFERENCE_PX,
      )
    },
  )

  it('gives the exercise the same box whatever the window is', () => {
    const [, slide] = slidesOf(['hotspot'])[0] as [string, number]
    measureAs(1280, 900)
    expect(render(slide).style.getPropertyValue('--stage-scale')).toBe('1')
    measureAs(380, 900)
    expect(render(slide).style.getPropertyValue('--stage-reference')).toBe(`${STAGE_REFERENCE_PX}px`)
  })

  it('carries no viewport unit and no breakpoint into the three new block styles', () => {
    // A block that reflowed with the window would put the third card in a different place
    // on the two screens, and the mark drawn over it somewhere else again.
    //
    // Scoped to the styles added here on purpose: six of the older blocks still size a
    // font with `clamp(…, Nvw, …)`, which predates the fixed stage (design D103) and is
    // left alone rather than restyled from inside this change.
    const css = readFileSync(join(process.cwd(), 'src/blocks/blocks.module.css'), 'utf8')
    const added = css.slice(css.indexOf('/* ── Hotspot'))
    expect(added.length).toBeGreaterThan(0)
    expect(added).not.toMatch(/@media/)
    expect(added).not.toMatch(/\b\d+(\.\d+)?v[wh]\b/)
  })
})
