import { INK_GRID, type Board, type InkOp, type Point, type Role, type Stroke } from './types'

/**
 * The board's single transition, and the mirror of `applyAction` for ink.
 *
 * It is pure in the same sense and for the same reason: given the same board, operation
 * and role it always produces the same result, and it reads nothing outside its
 * arguments — no clock, no randomness, no environment. It runs optimistically in the
 * browser and authoritatively inside the Durable Object, so that a rule about who may
 * erase what is not a rule the student can reload away (design D102).
 *
 * Ink deliberately does not travel through `applyAction`: a stroke is not progress
 * through a lesson, and putting it in `LessonState` would enlarge the snapshot broadcast
 * on every subsequent tap for the rest of the lesson (design D101).
 */

/**
 * How many strokes one exercise keeps. Past it the oldest gives way, rather than the pen
 * refusing to draw (design D109) — mid-lesson, a mark from ten minutes ago is worth less
 * than the one being made now.
 */
export const MAX_STROKES_PER_BLOCK = 200

/**
 * How many points one stroke keeps. A bound on untrusted input rather than a limit
 * anybody draws into: a stroke is simplified before it is sent, and a second of drawing
 * survives simplification as a few dozen points.
 */
export const MAX_POINTS_PER_STROKE = 4000

/**
 * Whether `role` may remove a stroke somebody else made. The teacher may, because she is
 * running the lesson; the student may only take back her own (spec `teacher-view`).
 */
function mayRemove(role: Role, stroke: Stroke): boolean {
  return role === 'teacher' || stroke.by === role
}

/**
 * Applies `op` to `board` on behalf of `by`.
 *
 * Returns its input **by reference** when the operation changes nothing — the convention
 * `applyAction` already uses, and what lets a caller tell "refused" from "applied" with
 * `===` rather than a deep comparison.
 */
export function applyInk(board: Board, op: InkOp, by: Role): Board {
  const strokes = board[op.block] ?? []

  switch (op.t) {
    case 'ink':
      return withStrokes(board, op.block, addOrAppend(strokes, op.stroke, by), strokes)

    case 'ink-erase': {
      const removing = new Set(op.ids)
      const kept = strokes.filter((s) => !(removing.has(s.id) && mayRemove(by, s)))
      return withStrokes(board, op.block, kept, strokes)
    }

    case 'ink-undo': {
      // The most recent of this participant's own strokes, never the other's — two people
      // annotating at once must each walk back through their own marks.
      const last = lastIndexBy(strokes, by)
      if (last === -1) return board
      const kept = [...strokes.slice(0, last), ...strokes.slice(last + 1)]
      return withStrokes(board, op.block, kept, strokes)
    }

    case 'ink-clear': {
      const kept = by === 'teacher' ? [] : strokes.filter((s) => s.by !== by)
      return withStrokes(board, op.block, kept, strokes)
    }
  }
}

/**
 * Adds a stroke, or appends its points to the one already carrying that id — which is how
 * a stroke long enough to be sent in parts arrives (design D106).
 *
 * The role is taken from the caller and never from the stroke, so a client cannot draw in
 * somebody else's name or extend somebody else's mark.
 */
function addOrAppend(strokes: Stroke[], incoming: Stroke, by: Role): Stroke[] {
  const at = strokes.findIndex((s) => s.id === incoming.id)

  if (at === -1) {
    const stroke: Stroke = {
      ...incoming,
      by,
      points: incoming.points.slice(0, MAX_POINTS_PER_STROKE),
    }
    if (stroke.points.length === 0) return strokes
    // Dropping from the front keeps the newest, which is what somebody drawing is looking
    // at. The index is clamped because a negative one would count from the end and quietly
    // hold the board at half its bound.
    const from = Math.max(0, strokes.length - MAX_STROKES_PER_BLOCK + 1)
    return [...strokes.slice(from), stroke]
  }

  const existing = strokes[at]
  if (existing === undefined) return strokes
  // A finished stroke takes no more points, and a stroke belongs to whoever started it.
  if (existing.done || existing.by !== by) return strokes

  const points = [...existing.points, ...incoming.points].slice(0, MAX_POINTS_PER_STROKE)
  if (points.length === existing.points.length && incoming.done === existing.done) {
    return strokes
  }
  const grown: Stroke = { ...existing, points, done: incoming.done }
  return strokes.map((s, i) => (i === at ? grown : s))
}

function lastIndexBy(strokes: Stroke[], by: Role): number {
  for (let i = strokes.length - 1; i >= 0; i -= 1) {
    if (strokes[i]?.by === by) return i
  }
  return -1
}

/**
 * Puts `next` back on the board under `block`, returning the board by reference when
 * nothing moved, and dropping the key entirely when the exercise has no marks left — an
 * empty board is `{}`, so it costs a joiner and the room's storage nothing.
 */
function withStrokes(board: Board, block: string, next: Stroke[], previous: Stroke[]): Board {
  if (next === previous) return board
  if (next.length === previous.length && next.every((s, i) => s === previous[i])) return board

  if (next.length === 0) {
    if (!(block in board)) return board
    const { [block]: _removed, ...rest } = board
    return rest
  }
  return { ...board, [block]: next }
}

/** Every stroke on the board that is finished — the only ones worth persisting (D106). */
export function completedBoard(board: Board): Board {
  const out: Board = {}
  for (const [block, strokes] of Object.entries(board)) {
    const done = strokes.filter((s) => s.done)
    if (done.length > 0) out[block] = done
  }
  return out
}

/**
 * The board with every unfinished stroke by `by` removed — what a room does when a
 * participant leaves mid-stroke, so a mark nobody will ever finish does not outlive them.
 */
export function withoutPending(board: Board, by: Role): Board {
  let changed = false
  const out: Board = {}
  for (const [block, strokes] of Object.entries(board)) {
    const kept = strokes.filter((s) => s.done || s.by !== by)
    if (kept.length !== strokes.length) changed = true
    if (kept.length > 0) out[block] = kept
  }
  return changed ? out : board
}

/** The squared distance between two points, in grid units. */
export function distanceSquared(a: Point, b: Point): number {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return dx * dx + dy * dy
}

// ── Simplification (design D105) ─────────────────────────────────────────────
//
// Raw pointer input is mostly redundant: a straight segment sampled at 60 Hz is sixty
// collinear points that two reproduce exactly. Thinning them costs nothing visually and
// has a second benefit that matters more than the bytes — the teacher draws with a mouse,
// and a smoothed stroke reads better than the jittery one her hand actually made.
//
// The grid is 4096 across the stage, and the stage is 736 px at its reference width, so
// one grid unit is roughly a fifth of a pixel. Both constants below are expressed in grid
// units and chosen to sit under what an eye resolves.

/** Points nearer than this to the previous one are never recorded: about two pixels. */
export const MIN_POINT_DISTANCE = 12

/**
 * How far the simplified path may stray from the original: about three pixels at the
 * reference width, and under one on a phone.
 *
 * Measured against the pen rather than against the screen. A deviation smaller than the
 * line's own thickness cannot be seen at all — the thinnest pen here is about twenty grid
 * units wide — so simplifying to well inside that is invisible by construction. A tighter
 * tolerance costs real points for no visible gain: a dense curve is the worst case for
 * this algorithm, and halving the tolerance roughly doubles the points a circle needs.
 */
export const SIMPLIFY_TOLERANCE = 16

/** Whether a new point is far enough from the last recorded one to be worth keeping. */
export function farEnough(last: Point, next: Point): boolean {
  return distanceSquared(last, next) >= MIN_POINT_DISTANCE * MIN_POINT_DISTANCE
}

/** The minimum-distance filter applied to a whole path, for a stroke made all at once. */
export function thin(points: Point[]): Point[] {
  const out: Point[] = []
  for (const point of points) {
    const last = out[out.length - 1]
    if (last === undefined || farEnough(last, point)) out.push(point)
  }
  // A stroke that never moved far enough to keep a second point is still a dot.
  if (out.length === 0 && points.length > 0) {
    const first = points[0]
    if (first !== undefined) out.push(first)
  }
  return out
}

/** The squared distance from `p` to the segment `a`–`b`. */
function segmentDistanceSquared(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const lengthSquared = dx * dx + dy * dy
  if (lengthSquared === 0) return distanceSquared(p, a)

  // Where the foot of the perpendicular falls along the segment, clamped to its ends so
  // that a point beyond either end measures to that end rather than to the infinite line.
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSquared))
  return distanceSquared(p, { x: a.x + t * dx, y: a.y + t * dy })
}

/**
 * Ramer–Douglas–Peucker: drops every point that the path would pass within `tolerance` of
 * anyway. Iterative rather than recursive because a stroke arrives from the network and
 * may be as long as `MAX_POINTS_PER_STROKE`.
 */
export function simplify(points: Point[], tolerance = SIMPLIFY_TOLERANCE): Point[] {
  if (points.length <= 2) return points

  const toleranceSquared = tolerance * tolerance
  const keep = new Array<boolean>(points.length).fill(false)
  keep[0] = true
  keep[points.length - 1] = true

  const pending: Array<[number, number]> = [[0, points.length - 1]]
  while (pending.length > 0) {
    const span = pending.pop()
    if (span === undefined) break
    const [first, last] = span
    const from = points[first]
    const to = points[last]
    if (from === undefined || to === undefined) continue

    let worst = 0
    let at = -1
    for (let i = first + 1; i < last; i += 1) {
      const point = points[i]
      if (point === undefined) continue
      const distance = segmentDistanceSquared(point, from, to)
      if (distance > worst) {
        worst = distance
        at = i
      }
    }

    if (at !== -1 && worst > toleranceSquared) {
      keep[at] = true
      pending.push([first, at], [at, last])
    }
  }

  return points.filter((_, i) => keep[i] === true)
}

/** A finished stroke, thinned and simplified — what is stored and what is sent. */
export function simplifyStroke(stroke: Stroke): Stroke {
  const points = simplify(thin(stroke.points))
  return points.length === stroke.points.length ? stroke : { ...stroke, points }
}

// ── Encoding (design D105) ───────────────────────────────────────────────────
//
// Points travel as one flat array of integers rather than as objects: `{"x":1725,"y":3187}`
// spends eleven bytes per point on punctuation that says nothing. After the first pair the
// numbers are differences, which are one or two digits where absolute coordinates are four.
//
// It stays a JSON array of numbers on purpose. A binary encoding would be about twice as
// compact again and would break the property that everything on the wire is plain
// serialisable data, which `protocol.ts` and `purity.test.ts` are built on.

/** `[x0, y0, dx1, dy1, …]` — absolute first, differences thereafter. */
export function encodePoints(points: Point[]): number[] {
  const out: number[] = []
  let previous: Point = { x: 0, y: 0 }
  for (const point of points) {
    out.push(point.x - previous.x, point.y - previous.y)
    previous = point
  }
  return out
}

/**
 * The inverse, over untrusted input: returns null for an odd-length array, a non-integer,
 * or any point the sums put outside the grid. A malformed stroke is refused, not clamped —
 * a clamped one would be a mark nobody made, in a place nobody drew.
 */
export function decodePoints(encoded: readonly number[]): Point[] | null {
  if (encoded.length % 2 !== 0) return null

  const points: Point[] = []
  let x = 0
  let y = 0
  for (let i = 0; i < encoded.length; i += 2) {
    const dx = encoded[i]
    const dy = encoded[i + 1]
    if (dx === undefined || dy === undefined) return null
    if (!Number.isInteger(dx) || !Number.isInteger(dy)) return null
    x += dx
    y += dy
    if (x < 0 || y < 0 || x >= INK_GRID || y >= INK_GRID) return null
    points.push({ x, y })
  }
  return points
}
