// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { BodyScene } from './BodyScene'
import { SCENES } from '@/shared/scenes'
import bodyParts from '../../lessons/body-parts.json'

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined
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

describe('the body scene', () => {
  it('draws one svg in the coordinate space the lesson measures against', () => {
    act(() => root.render(<BodyScene />))
    const svgs = container.querySelectorAll('svg')
    expect(svgs).toHaveLength(1)
    const { width, height } = SCENES.body
    expect(svgs[0]?.getAttribute('viewBox')).toBe(`0 0 ${width} ${height}`)
  })

  it('is artwork only — nothing inside it can be tapped', () => {
    act(() => root.render(<BodyScene />))
    expect(container.querySelectorAll('button')).toHaveLength(0)
    expect(container.querySelectorAll('a')).toHaveLength(0)
  })
})

/**
 * The reason the scene is two panels rather than one figure (design D128).
 *
 * The stage is laid out at a fixed width and scaled down to about four tenths on the
 * narrowest screen it supports, so two places a child must tell apart need roughly 110 px
 * between their centres in the scene's own space. Six of them stacked down one figure would
 * want 660 px of the 510 the stage has, which is why the head stands on its own.
 */
describe('every part of the body scene can be told apart by a finger', () => {
  const MIN_APART = 110

  const block = bodyParts.blocks.find((b) => b.type === 'hotspot')
  const spots = (block as { spots?: Record<string, number[]> } | undefined)?.spots

  it('is measured against a real lesson', () => {
    expect(spots, 'body-parts.json has no hotspot block to measure').toBeDefined()
  })

  it('keeps every pair of places at least a fingertip apart', () => {
    const { width, height } = SCENES.body
    const centres = Object.entries(spots ?? {}).map(([id, [x = 0, y = 0, w = 0, h = 0]]) => ({
      id,
      x: (x + w / 2) * width,
      y: (y + h / 2) * height,
    }))

    for (const a of centres) {
      for (const b of centres) {
        if (a.id >= b.id) continue
        const apart = Math.hypot(a.x - b.x, a.y - b.y)
        expect(Math.round(apart), `${a.id} and ${b.id} are too close`).toBeGreaterThanOrEqual(
          MIN_APART,
        )
      }
    }
  })
})
