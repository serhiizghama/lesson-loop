import { describe, expect, it } from 'vitest'
import { stageHeight, stageScale, STAGE_REFERENCE_PX } from './stage'

describe('the stage is laid out once and scaled to fit (design D103)', () => {
  it('is untouched on a screen at least as wide as the reference', () => {
    expect(stageScale(STAGE_REFERENCE_PX)).toBe(1)
    expect(stageScale(1280)).toBe(1)
    expect(stageScale(2560)).toBe(1)
  })

  it('shrinks in proportion below the reference width', () => {
    expect(stageScale(STAGE_REFERENCE_PX / 2)).toBeCloseTo(0.5)
    expect(stageScale(380)).toBeCloseTo(380 / STAGE_REFERENCE_PX)
  })

  it('keeps a tap target usable at the narrowest supported width', () => {
    // The smallest card is 10rem — 160 px — at the reference width. The narrow-window
    // requirement is 380 px, and a young child's finger needs about 44. This is the floor
    // that decides how wide the reference box may ever go: widening it shrinks everything
    // on a phone in exact proportion.
    const smallestCard = 160
    expect(smallestCard * stageScale(380)).toBeGreaterThanOrEqual(44)
  })

  it('renders at natural size when nothing has been measured', () => {
    expect(stageScale(0)).toBe(1)
    expect(stageScale(Number.NaN)).toBe(1)
    expect(stageScale(-10)).toBe(1)
  })

  it('scales the height the wrapper reserves by the same factor', () => {
    expect(stageHeight(1000, 0.5)).toBe(500)
    expect(stageHeight(1000, 1)).toBe(1000)
  })

  it('reserves nothing for a stage that has not been laid out', () => {
    expect(stageHeight(0, 0.5)).toBe(0)
  })
})
