import { describe, expect, it } from 'vitest'
import {
  applyInk,
  completedBoard,
  simplify,
  simplifyStroke,
  thin,
  withoutPending,
  decodePoints,
  encodePoints,
  MAX_STROKES_PER_BLOCK,
  SIMPLIFY_TOLERANCE,
} from './ink'
import { INK_GRID, type Board, type Point, type Role, type Stroke } from './types'

function stroke(id: string, by: Role, points = [{ x: 0, y: 0 }], done = true): Stroke {
  return { id, by, colour: '#000', width: 4, points, done }
}

function boardOf(...strokes: Stroke[]): Board {
  return { b1: strokes }
}

/**
 * A circle drawn by hand at about 60 Hz: ninety samples around the ring, with the small
 * jitter a mouse actually produces rather than a mathematically exact path.
 */
function handDrawnCircle(): Point[] {
  const points: Point[] = []
  let noise = 7
  for (let i = 0; i < 90; i += 1) {
    // A deterministic wobble: the model may not use randomness, and neither may its test.
    // Three grid units is about half a pixel — the order a real mouse actually wanders
    // on a smooth drag, rather than a figure chosen to make the reduction look good.
    noise = (noise * 1103515245 + 12345) % 2048
    const wobble = (noise % 7) - 3
    const angle = (i / 90) * Math.PI * 2
    points.push({
      x: Math.round(2048 + Math.cos(angle) * 900 + wobble),
      y: Math.round(2048 + Math.sin(angle) * 900 + wobble),
    })
  }
  return points
}

describe('applyInk adds and appends', () => {
  it('adds a stroke to an empty board', () => {
    const next = applyInk({}, { t: 'ink', block: 'b1', stroke: stroke('s1', 'teacher') }, 'teacher')
    expect(next['b1']).toHaveLength(1)
    expect(next['b1']?.[0]?.id).toBe('s1')
  })

  it('takes the author from the caller, never from the stroke', () => {
    const claimed = stroke('s1', 'teacher')
    const next = applyInk({}, { t: 'ink', block: 'b1', stroke: claimed }, 'student')
    expect(next['b1']?.[0]?.by).toBe('student')
  })

  it('appends points to an unfinished stroke of the same id', () => {
    const open = applyInk(
      {},
      { t: 'ink', block: 'b1', stroke: stroke('s1', 'teacher', [{ x: 1, y: 1 }], false) },
      'teacher',
    )
    const next = applyInk(
      open,
      { t: 'ink', block: 'b1', stroke: stroke('s1', 'teacher', [{ x: 2, y: 2 }], true) },
      'teacher',
    )
    expect(next['b1']).toHaveLength(1)
    expect(next['b1']?.[0]?.points).toEqual([
      { x: 1, y: 1 },
      { x: 2, y: 2 },
    ])
    expect(next['b1']?.[0]?.done).toBe(true)
  })

  it('refuses to extend a stroke that is already finished', () => {
    const closed = boardOf(stroke('s1', 'teacher', [{ x: 1, y: 1 }], true))
    const next = applyInk(
      closed,
      { t: 'ink', block: 'b1', stroke: stroke('s1', 'teacher', [{ x: 9, y: 9 }], true) },
      'teacher',
    )
    expect(next).toBe(closed)
  })

  it('refuses to extend a stroke somebody else started', () => {
    const hers = boardOf(stroke('s1', 'teacher', [{ x: 1, y: 1 }], false))
    const next = applyInk(
      hers,
      { t: 'ink', block: 'b1', stroke: stroke('s1', 'student', [{ x: 9, y: 9 }], false) },
      'student',
    )
    expect(next).toBe(hers)
  })

  it('keeps marks of different exercises apart', () => {
    const one = applyInk({}, { t: 'ink', block: 'b1', stroke: stroke('s1', 'teacher') }, 'teacher')
    const two = applyInk(one, { t: 'ink', block: 'b2', stroke: stroke('s2', 'teacher') }, 'teacher')
    expect(two['b1']).toHaveLength(1)
    expect(two['b2']).toHaveLength(1)
  })
})

describe('applyInk keeps the board bounded (design D109)', () => {
  it('drops the oldest stroke rather than refusing the newest', () => {
    let board: Board = {}
    for (let i = 0; i < MAX_STROKES_PER_BLOCK + 10; i += 1) {
      board = applyInk(
        board,
        { t: 'ink', block: 'b1', stroke: stroke(`s${i}`, 'teacher') },
        'teacher',
      )
    }
    const strokes = board['b1'] ?? []
    expect(strokes).toHaveLength(MAX_STROKES_PER_BLOCK)
    expect(strokes[strokes.length - 1]?.id).toBe(`s${MAX_STROKES_PER_BLOCK + 9}`)
    expect(strokes.some((s) => s.id === 's0')).toBe(false)
  })
})

describe('applyInk erases', () => {
  it('removes the named strokes', () => {
    const board = boardOf(stroke('s1', 'teacher'), stroke('s2', 'teacher'))
    const next = applyInk(board, { t: 'ink-erase', block: 'b1', ids: ['s1'] }, 'teacher')
    expect(next['b1']?.map((s) => s.id)).toEqual(['s2'])
  })

  it('lets the teacher erase the student’s mark', () => {
    const board = boardOf(stroke('s1', 'student'))
    const next = applyInk(board, { t: 'ink-erase', block: 'b1', ids: ['s1'] }, 'teacher')
    expect(next['b1']).toBeUndefined()
  })

  it('does not let the student erase the teacher’s mark', () => {
    const board = boardOf(stroke('s1', 'teacher'))
    const next = applyInk(board, { t: 'ink-erase', block: 'b1', ids: ['s1'] }, 'student')
    expect(next).toBe(board)
  })

  it('erasing what is already gone changes nothing', () => {
    const board = boardOf(stroke('s1', 'teacher'))
    const next = applyInk(board, { t: 'ink-erase', block: 'b1', ids: ['gone'] }, 'teacher')
    expect(next).toBe(board)
  })
})

describe('applyInk undoes only the asker’s own strokes', () => {
  it('takes back the asker’s last stroke, not the other’s', () => {
    const board = boardOf(stroke('s1', 'student'), stroke('s2', 'teacher'))
    const next = applyInk(board, { t: 'ink-undo', block: 'b1' }, 'teacher')
    expect(next['b1']?.map((s) => s.id)).toEqual(['s1'])
  })

  it('skips over the other participant’s later stroke', () => {
    const board = boardOf(stroke('s1', 'teacher'), stroke('s2', 'student'))
    const next = applyInk(board, { t: 'ink-undo', block: 'b1' }, 'teacher')
    expect(next['b1']?.map((s) => s.id)).toEqual(['s2'])
  })

  it('walks back through the asker’s own strokes in order', () => {
    const board = boardOf(stroke('s1', 'teacher'), stroke('s2', 'teacher'))
    const once = applyInk(board, { t: 'ink-undo', block: 'b1' }, 'teacher')
    const twice = applyInk(once, { t: 'ink-undo', block: 'b1' }, 'teacher')
    expect(once['b1']?.map((s) => s.id)).toEqual(['s1'])
    expect(twice['b1']).toBeUndefined()
  })

  it('does nothing when the asker has drawn nothing', () => {
    const board = boardOf(stroke('s1', 'student'))
    const next = applyInk(board, { t: 'ink-undo', block: 'b1' }, 'teacher')
    expect(next).toBe(board)
  })
})

describe('applyInk clears by who is clearing', () => {
  it('the teacher’s clear empties the exercise', () => {
    const board = boardOf(stroke('s1', 'teacher'), stroke('s2', 'student'))
    const next = applyInk(board, { t: 'ink-clear', block: 'b1' }, 'teacher')
    expect(next['b1']).toBeUndefined()
  })

  it('the student’s clear leaves the teacher’s marks', () => {
    const board = boardOf(stroke('s1', 'teacher'), stroke('s2', 'student'))
    const next = applyInk(board, { t: 'ink-clear', block: 'b1' }, 'student')
    expect(next['b1']?.map((s) => s.id)).toEqual(['s1'])
  })

  it('clearing an exercise with nothing of one’s own changes nothing', () => {
    const board = boardOf(stroke('s1', 'teacher'))
    const next = applyInk(board, { t: 'ink-clear', block: 'b1' }, 'student')
    expect(next).toBe(board)
  })

  it('clearing an untouched exercise changes nothing', () => {
    const board = boardOf(stroke('s1', 'teacher'))
    const next = applyInk(board, { t: 'ink-clear', block: 'other' }, 'teacher')
    expect(next).toBe(board)
  })
})

describe('unfinished strokes', () => {
  it('completedBoard keeps only what was finished', () => {
    const board: Board = {
      b1: [stroke('s1', 'teacher', [{ x: 0, y: 0 }], true), stroke('s2', 'teacher', [{ x: 1, y: 1 }], false)],
      b2: [stroke('s3', 'student', [{ x: 2, y: 2 }], false)],
    }
    const done = completedBoard(board)
    expect(done['b1']?.map((s) => s.id)).toEqual(['s1'])
    expect(done['b2']).toBeUndefined()
  })

  it('withoutPending drops the leaver’s unfinished strokes and keeps everyone else’s', () => {
    const board: Board = {
      b1: [
        stroke('s1', 'teacher', [{ x: 0, y: 0 }], true),
        stroke('s2', 'teacher', [{ x: 1, y: 1 }], false),
        stroke('s3', 'student', [{ x: 2, y: 2 }], false),
      ],
    }
    const next = withoutPending(board, 'teacher')
    expect(next['b1']?.map((s) => s.id)).toEqual(['s1', 's3'])
  })

  it('withoutPending returns the board by reference when nothing was pending', () => {
    const board = boardOf(stroke('s1', 'teacher'))
    expect(withoutPending(board, 'teacher')).toBe(board)
  })
})

describe('simplification (design D105)', () => {
  it('reduces a hand-drawn circle by at least 70 per cent', () => {
    const raw = handDrawnCircle()
    const reduced = simplify(thin(raw))
    expect(raw).toHaveLength(90)
    expect(reduced.length).toBeLessThanOrEqual(Math.floor(raw.length * 0.3))
    expect(reduced.length).toBeGreaterThan(2)
  })

  it('keeps every original point within the tolerance of the simplified path', () => {
    const raw = handDrawnCircle()
    const reduced = simplify(raw)

    // The guarantee RDP actually makes: nothing that was dropped is further from the path
    // that remains than the tolerance allows.
    for (const point of raw) {
      let nearest = Infinity
      for (let i = 0; i < reduced.length - 1; i += 1) {
        const a = reduced[i]
        const b = reduced[i + 1]
        if (a === undefined || b === undefined) continue
        nearest = Math.min(nearest, segmentDistance(point, a, b))
      }
      expect(nearest).toBeLessThanOrEqual(SIMPLIFY_TOLERANCE)
    }
  })

  it('keeps the ends of a stroke exactly where they were', () => {
    const raw = handDrawnCircle()
    const reduced = simplify(raw)
    expect(reduced[0]).toEqual(raw[0])
    expect(reduced[reduced.length - 1]).toEqual(raw[raw.length - 1])
  })

  it('reduces a straight line sampled many times to its two ends', () => {
    const line = Array.from({ length: 60 }, (_, i) => ({ x: i * 30, y: 1000 }))
    expect(simplify(line)).toEqual([
      { x: 0, y: 1000 },
      { x: 59 * 30, y: 1000 },
    ])
  })

  it('thinning drops points the hand did not really move', () => {
    const jitter = Array.from({ length: 40 }, (_, i) => ({ x: 1000 + (i % 2), y: 1000 }))
    expect(thin(jitter)).toHaveLength(1)
  })

  it('a stroke that never moved is still a dot', () => {
    expect(thin([{ x: 5, y: 5 }])).toEqual([{ x: 5, y: 5 }])
  })

  it('simplifyStroke returns its input by reference when nothing can be dropped', () => {
    const dot = stroke('s1', 'teacher', [{ x: 5, y: 5 }])
    expect(simplifyStroke(dot)).toBe(dot)
  })
})

/** The un-squared distance from a point to a segment, for readable assertions. */
function segmentDistance(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const lengthSquared = dx * dx + dy * dy
  if (lengthSquared === 0) return Math.hypot(p.x - a.x, p.y - a.y)
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSquared))
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy))
}

describe('encoding (design D105)', () => {
  function pseudoRandomPoints(count: number, seed: number): Point[] {
    let n = seed
    const points: Point[] = []
    for (let i = 0; i < count; i += 1) {
      n = (n * 1103515245 + 12345) % 2147483648
      const x = n % INK_GRID
      n = (n * 1103515245 + 12345) % 2147483648
      const y = n % INK_GRID
      points.push({ x, y })
    }
    return points
  }

  it('round-trips exactly', () => {
    for (const seed of [1, 7, 99, 12345]) {
      const points = pseudoRandomPoints(60, seed)
      expect(decodePoints(encodePoints(points))).toEqual(points)
    }
  })

  it('round-trips the edges of the grid', () => {
    const points: Point[] = [
      { x: 0, y: 0 },
      { x: INK_GRID - 1, y: INK_GRID - 1 },
      { x: 0, y: INK_GRID - 1 },
    ]
    expect(decodePoints(encodePoints(points))).toEqual(points)
  })

  it('round-trips an empty path', () => {
    expect(decodePoints(encodePoints([]))).toEqual([])
  })

  it('costs far less than the same points as objects', () => {
    const points = handDrawnCircle()
    const asObjects = JSON.stringify(points).length
    const asDeltas = JSON.stringify(encodePoints(points)).length
    expect(asDeltas).toBeLessThan(asObjects)
  })

  it('a simplified stroke — what is actually sent — is a few hundred bytes', () => {
    // A real path, not scattered points: consecutive samples of a stroke are close
    // together, which is the whole reason differences are smaller than coordinates.
    const encoded = JSON.stringify(encodePoints(simplify(thin(handDrawnCircle()))))
    expect(encoded.length).toBeLessThan(500)
  })

  it('refuses an odd-length array', () => {
    expect(decodePoints([1, 2, 3])).toBeNull()
  })

  it('refuses a non-integer', () => {
    expect(decodePoints([1, 2.5])).toBeNull()
  })

  it('refuses a coordinate the sums put off the grid', () => {
    expect(decodePoints([10, 10, -50, 0])).toBeNull()
    expect(decodePoints([INK_GRID, 0])).toBeNull()
    expect(decodePoints([0, 0, 0, INK_GRID])).toBeNull()
  })
})
