import { describe, expect, it } from 'vitest'
import { pathOf, strokesUnder, toGrid, DEFAULT_COLOUR } from './ink-tools'
import { INK_GRID, type Role, type Stroke } from '@/shared/types'

function line(id: string, by: Role, points: Array<[number, number]>, width = 20): Stroke {
  return {
    id,
    by,
    colour: '#000000',
    width,
    points: points.map(([x, y]) => ({ x, y })),
    done: true,
  }
}

/** A long horizontal line across the middle of the board. */
const across = line('long', 'teacher', [
  [500, 2000],
  [3500, 2000],
])

describe('the eraser takes whole strokes (design D104)', () => {
  it('takes the whole line when its middle is touched', () => {
    expect(strokesUnder([across], { x: 2000, y: 2000 }, 60, 'teacher')).toEqual(['long'])
  })

  it('takes it from either end as readily as from the middle', () => {
    expect(strokesUnder([across], { x: 500, y: 2000 }, 60, 'teacher')).toEqual(['long'])
    expect(strokesUnder([across], { x: 3500, y: 2000 }, 60, 'teacher')).toEqual(['long'])
  })

  it('leaves a stroke the eraser did not reach', () => {
    expect(strokesUnder([across], { x: 2000, y: 3000 }, 60, 'teacher')).toEqual([])
  })

  it('reaches further with a bigger eraser', () => {
    const off = { x: 2000, y: 2000 + 100 }
    expect(strokesUnder([across], off, 60, 'teacher')).toEqual([])
    expect(strokesUnder([across], off, 200, 'teacher')).toEqual(['long'])
  })

  it('counts the stroke’s own width as part of it', () => {
    const fat = line('fat', 'teacher', [[500, 2000], [3500, 2000]], 400)
    const thin = line('thin', 'teacher', [[500, 2000], [3500, 2000]], 4)
    const off = { x: 2000, y: 2200 }
    expect(strokesUnder([fat], off, 20, 'teacher')).toEqual(['fat'])
    expect(strokesUnder([thin], off, 20, 'teacher')).toEqual([])
  })

  it('takes several strokes at once when they overlap', () => {
    const other = line('other', 'teacher', [[1900, 1900], [2100, 2100]])
    expect(strokesUnder([across, other], { x: 2000, y: 2000 }, 60, 'teacher').sort()).toEqual([
      'long',
      'other',
    ])
  })

  it('lets the teacher erase the student’s mark', () => {
    const hers = line('hers', 'student', [[500, 2000], [3500, 2000]])
    expect(strokesUnder([hers], { x: 2000, y: 2000 }, 60, 'teacher')).toEqual(['hers'])
  })

  it('does not let the student erase the teacher’s mark', () => {
    expect(strokesUnder([across], { x: 2000, y: 2000 }, 60, 'student')).toEqual([])
  })

  it('finds a dot, which has no segment at all', () => {
    const dot = line('dot', 'teacher', [[2000, 2000]])
    expect(strokesUnder([dot], { x: 2010, y: 2010 }, 60, 'teacher')).toEqual(['dot'])
  })
})

describe('a pointer becomes a point on the grid', () => {
  const box = { left: 100, top: 50, width: 736, height: 620 } as DOMRect

  it('puts the top-left corner at the origin', () => {
    expect(toGrid(100, 50, box)).toEqual({ x: 0, y: 0 })
  })

  it('puts the centre in the middle', () => {
    expect(toGrid(100 + 368, 50 + 310, box)).toEqual({ x: 2048, y: 2048 })
  })

  it('keeps a pointer that strays outside on the board', () => {
    expect(toGrid(-500, -500, box)).toEqual({ x: 0, y: 0 })
    expect(toGrid(9999, 9999, box)).toEqual({ x: INK_GRID - 1, y: INK_GRID - 1 })
  })

  it('gives the same point for the same fraction of a smaller box', () => {
    // The student's screen, at half the scale: the same place on the exercise.
    const half = { left: 0, top: 0, width: 368, height: 310 } as DOMRect
    expect(toGrid(184, 155, half)).toEqual(toGrid(100 + 368, 50 + 310, box))
  })
})

describe('a stroke becomes a path', () => {
  it('draws a polyline through its points', () => {
    expect(pathOf([{ x: 1, y: 2 }, { x: 3, y: 4 }])).toBe('M 1 2 L 3 4')
  })

  it('draws a single point as a dot', () => {
    expect(pathOf([{ x: 5, y: 6 }])).toBe('M 5 6 L 5 6')
  })

  it('draws nothing for no points', () => {
    expect(pathOf([])).toBe('')
  })
})

describe('the board says who made which mark', () => {
  it('starts the two participants on different colours', () => {
    expect(DEFAULT_COLOUR.teacher).not.toBe(DEFAULT_COLOUR.student)
  })
})
