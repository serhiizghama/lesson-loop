import { useReducer, useRef, type PointerEvent as ReactPointerEvent } from 'react'
import { farEnough, simplify } from '@/shared/ink'
import { INK_GRID, type InkOp, type Point, type Role, type Stroke } from '@/shared/types'
import {
  pathOf, strokeId, strokesUnder, toGrid, STROKE_FLUSH_POINTS, type Tool,
} from './ink-tools'
import styles from './app.module.css'

/**
 * The marks, over the exercise (spec `shared-drawing`).
 *
 * Coordinates are fractions of the stage's own box, so the layer's `viewBox` is the grid
 * and `preserveAspectRatio="none"` maps it back onto whatever box the stage has. Both
 * screens lay the stage out at the same reference width and therefore give it the same
 * shape (design D103), so the same pair of numbers lands on the same picture on each.
 *
 * When the pencil is down the layer takes every pointer event and the exercise underneath
 * receives none; when it is up the layer is `pointer-events: none` and taps fall straight
 * through to the exercise, with the marks still visible but inert (design D108).
 */
export function InkLayer({
  block, strokes, drawing, tool, colour, width, radius, by, onInk,
}: {
  block: string
  strokes: readonly Stroke[]
  /** Whether the pencil is down on *this* screen. Never the other participant's. */
  drawing: boolean
  tool: Tool
  colour: string
  width: number
  radius: number
  by: Role
  onInk: (op: InkOp) => void
}) {
  const svg = useRef<SVGSVGElement | null>(null)

  /**
   * The stroke in progress, held in a ref so that a pointer handler always sees the live
   * one rather than the value its closure was created with. `redraw` is what puts it on
   * screen: the hand drawing it must see its own line at once, and it is not on the board
   * until it is sent.
   */
  const pending = useRef<{ id: string; points: Point[]; sent: number } | null>(null)
  const [, redraw] = useReducer((n: number) => n + 1, 0)

  const at = (event: ReactPointerEvent): Point | null => {
    const box = svg.current?.getBoundingClientRect()
    if (box === undefined || box.width === 0 || box.height === 0) return null
    return toGrid(event.clientX, event.clientY, box)
  }

  const erase = (point: Point): void => {
    const ids = strokesUnder(strokes, point, radius, by)
    if (ids.length > 0) onInk({ t: 'ink-erase', block, ids })
  }

  /**
   * Sends the points not sent yet, as an append. A stroke that fits in one message is
   * simplified first; one already sent in parts is not, because the parts on the other
   * screen cannot be taken back — and those points were thinned as they arrived anyway.
   */
  const flush = (done: boolean): void => {
    const stroke = pending.current
    if (stroke === null) return

    const whole = stroke.sent === 0
    const tail = stroke.points.slice(stroke.sent)
    const points = whole && done ? simplify(tail) : tail
    if (points.length === 0) return

    stroke.sent = stroke.points.length
    onInk({ t: 'ink', block, stroke: { id: stroke.id, by, colour, width, points, done } })
  }

  const down = (event: ReactPointerEvent): void => {
    if (!drawing) return
    const point = at(event)
    if (point === null) return
    event.currentTarget.setPointerCapture(event.pointerId)

    if (tool === 'eraser') {
      erase(point)
      pending.current = null
      return
    }
    pending.current = { id: strokeId(), points: [point], sent: 0 }
    redraw()
  }

  const move = (event: ReactPointerEvent): void => {
    if (!drawing || event.buttons === 0) return
    const point = at(event)
    if (point === null) return

    if (tool === 'eraser') {
      erase(point)
      return
    }

    const stroke = pending.current
    if (stroke === null) return
    const last = stroke.points[stroke.points.length - 1]
    // Points the hand did not really move are dropped as they arrive, which is most of
    // them: a mouse reports far more often than it travels (design D105).
    if (last !== undefined && !farEnough(last, point)) return
    stroke.points.push(point)

    // A stroke long enough to keep the other screen waiting goes early, in order
    // (design D106). An ordinary mark never reaches this and is sent exactly once.
    if (stroke.points.length - stroke.sent >= STROKE_FLUSH_POINTS) flush(false)
    redraw()
  }

  const up = (): void => {
    if (pending.current !== null) flush(true)
    pending.current = null
    redraw()
  }

  const live = pending.current

  return (
    <svg
      ref={svg}
      className={drawing ? styles.inkLive : styles.ink}
      viewBox={`0 0 ${INK_GRID} ${INK_GRID}`}
      preserveAspectRatio="none"
      // The marks are decoration over the exercise; the exercise is what is read out.
      aria-hidden="true"
      data-drawing={drawing ? 'true' : 'false'}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
    >
      {strokes.map((stroke) => (
        <path
          key={stroke.id}
          d={pathOf(stroke.points)}
          stroke={stroke.colour}
          strokeWidth={stroke.width}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
      {live !== null && (
        <path
          d={pathOf(live.points)}
          stroke={colour}
          strokeWidth={width}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  )
}
