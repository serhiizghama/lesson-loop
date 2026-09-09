import { INK_GRID, type Point, type Role, type Stroke } from '@/shared/types'
import { distanceSquared } from '@/shared/ink'
import { STAGE_REFERENCE_PX } from './stage'

/**
 * The pen, the eraser and the numbers behind them.
 *
 * Everything here is in grid units, because that is what a stroke is stored in and it is
 * the only unit that means the same thing on both screens. One grid unit is
 * `STAGE_REFERENCE_PX / INK_GRID` of a CSS pixel at the reference width — about a fifth.
 */

/** Grid units per CSS pixel at the stage's reference width. */
const PER_PX = INK_GRID / STAGE_REFERENCE_PX

const inUnits = (px: number): number => Math.round(px * PER_PX)

export type Tool = 'pen' | 'eraser'

/**
 * A small fixed palette. Every one of them has to read over a photograph, a coloured
 * swatch and a white card, so they are all fully saturated and none is pale.
 */
export const INK_COLOURS = ['#e11d2e', '#1668dc', '#12923b', '#f0a500', '#111827'] as const

/**
 * Teacher and student start on different colours, so the board says who made which mark
 * without either of them being told (spec `shared-drawing`).
 */
export const DEFAULT_COLOUR: Record<Role, string> = {
  teacher: '#e11d2e',
  student: '#1668dc',
}

/** Two pen sizes: one for writing a word, one for circling a picture. */
export const PEN_WIDTHS = [inUnits(3), inUnits(7)] as const

/**
 * Two eraser sizes. These are how near a stroke you must come to remove it, not how much
 * of it is removed — the eraser takes whole strokes (design D104).
 */
export const ERASER_RADII = [inUnits(12), inUnits(28)] as const

/**
 * When a stroke still being drawn is sent anyway (design D106).
 *
 * The one number that decides whether the other screen watches a line appear or receives
 * it finished. High, so an ordinary mark is exactly one message: most annotation strokes
 * are under a second, a mouse-drawn line reads better smoothed than streamed, and fewer
 * larger messages survive a poor connection better. Lowering it is all it takes to stream
 * a stroke live, and nothing else about the design changes.
 */
export const STROKE_FLUSH_POINTS = 60

/**
 * A stroke id. Only ever compared, never parsed, and unique within one lesson is enough —
 * the room refuses an id that collides with a finished stroke rather than merging into it.
 */
export function strokeId(): string {
  const crypto = globalThis.crypto as { randomUUID?: () => string } | undefined
  if (typeof crypto?.randomUUID === 'function') return crypto.randomUUID().slice(0, 16)
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

/** A point on the stage, as a fraction of its box quantised to the grid. */
export function toGrid(clientX: number, clientY: number, box: DOMRect): Point {
  const clamp = (value: number): number => Math.max(0, Math.min(INK_GRID - 1, Math.round(value)))
  return {
    x: clamp(((clientX - box.left) / box.width) * INK_GRID),
    y: clamp(((clientY - box.top) / box.height) * INK_GRID),
  }
}

/** A polyline through the points. A single point is drawn as a dot of the pen's width. */
export function pathOf(points: readonly Point[]): string {
  const first = points[0]
  if (first === undefined) return ''
  if (points.length === 1) return `M ${first.x} ${first.y} L ${first.x} ${first.y}`
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
}

/**
 * The ids of the strokes the eraser is touching: any whose path passes within `radius` of
 * the point. Whole strokes, so touching any part of one removes all of it (design D104).
 */
export function strokesUnder(
  strokes: readonly Stroke[],
  at: Point,
  radius: number,
  by: Role,
): string[] {
  return strokes
    .filter((stroke) => {
      // The teacher may rub out anything; the student only her own (spec `teacher-view`).
      if (by !== 'teacher' && stroke.by !== by) return false
      return touches(stroke, at, radius)
    })
    .map((stroke) => stroke.id)
}

/** Whether any part of the stroke's path — its own width included — is within reach. */
function touches(stroke: Stroke, at: Point, radius: number): boolean {
  const reach = radius + stroke.width / 2
  const near = reach * reach
  const points = stroke.points

  for (let i = 0; i < points.length; i += 1) {
    const a = points[i]
    if (a === undefined) continue
    if (distanceSquared(a, at) <= near) return true

    const b = points[i + 1]
    if (b === undefined) continue
    if (segmentNear(at, a, b, near)) return true
  }
  return false
}

function segmentNear(p: Point, a: Point, b: Point, near: number): boolean {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const lengthSquared = dx * dx + dy * dy
  if (lengthSquared === 0) return distanceSquared(p, a) <= near

  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSquared))
  return distanceSquared(p, { x: a.x + t * dx, y: a.y + t * dy }) <= near
}
