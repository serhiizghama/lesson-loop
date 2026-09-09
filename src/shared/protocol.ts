/**
 * What travels between a browser and the room it is joined to.
 *
 * Both directions are plain serialisable data: no class, no function, no `Date`, and
 * nothing that only exists in a browser or only exists in a Worker. `src/shared` is
 * bundled into both, and `src/shared/purity.test.ts` keeps it that way.
 */

import { z } from 'zod'
import { decodePoints, encodePoints, MAX_POINTS_PER_STROKE, MAX_STROKES_PER_BLOCK } from './ink'
import type { Action, Board, InkOp, Lesson, LessonState, Stroke } from './types'
import { validateLesson } from './validate'

/**
 * Which half of the lesson a socket is holding. The room decides this, never the client.
 *
 * Defined in `./types` because a stroke carries it, and re-exported here so that every
 * existing import of `Role` from the protocol keeps resolving.
 */
export type { Role } from './types'
import type { Role } from './types'

// ── Client → room ────────────────────────────────────────────────────────────

/**
 * A lesson travels with `switch-lesson` rather than only its id, because the room has
 * no lesson catalogue of its own: `lessons/` is content the client bundles, and keeping
 * it that way is what makes a new lesson a file rather than a deploy of the Worker.
 */
export type ClientMessage =
  /** `key` claims the teacher's role (design D12); a socket without one is a student. */
  | { t: 'hello'; room: string; key?: string }
  | { t: 'action'; action: Action }
  | { t: 'switch-lesson'; lesson: Lesson }
  | { t: 'lock'; value: boolean }
  /** Teacher only: whether the app may speak unasked, on both screens (design D66). */
  | { t: 'mute'; value: boolean }
  /** Teacher only: whether the student may draw (design D107). */
  | { t: 'pen'; value: boolean }
  /**
   * A mark, or its removal. Ink is a second kind of traffic: the room relays and retains
   * it but never reduces it, and it never enters `LessonState` (design D101).
   */
  | { t: 'ink'; op: WireInkOp }

// ── Ink on the wire (design D105) ────────────────────────────────────────────

/**
 * A stroke as it travels. Its points are delta-encoded integers rather than objects, and
 * its `by` is advisory: the room takes the author from the socket that sent it, so a
 * client cannot draw in the other participant's name or extend their mark.
 */
export type WireStroke = {
  id: string
  by: Role
  colour: string
  width: number
  points: number[]
  done: boolean
}

export type WireInkOp =
  | { t: 'ink'; block: string; stroke: WireStroke }
  | { t: 'ink-erase'; block: string; ids: string[] }
  | { t: 'ink-undo'; block: string }
  | { t: 'ink-clear'; block: string }

export type WireBoard = Record<string, WireStroke[]>

// ── Room → client ────────────────────────────────────────────────────────────

/** Why an action did not apply. Never fatal: the state message beside it settles the truth. */
export type RefusedReason =
  | 'locked'
  | 'not-teacher'
  | 'no-effect'
  | 'unknown-lesson'
  /** The teacher is holding the student's pen (design D107). */
  | 'no-pen'

/** Why a socket cannot be in this room at all. */
export type RoomErrorCode = 'no-such-room' | 'room-full' | 'bad-message'

/** Who is in the room. Names are deliberately absent — a room asks for no personal data. */
export type Peers = { teacher: boolean; students: number }

export type ServerMessage =
  /** The whole state after every applied action, and on join (design D10). */
  | { t: 'state'; state: LessonState; locked: boolean; muted: boolean; pen: boolean; role: Role }
  | { t: 'refused'; reason: RefusedReason }
  | { t: 'peers'; peers: Peers }
  | { t: 'error'; code: RoomErrorCode }
  /**
   * An applied ink operation, relayed to the *other* participants — never back to the one
   * who sent it, which already applied it optimistically and would otherwise append the
   * same points twice (design D102).
   *
   * `by` travels with it because `applyInk` needs the author to decide what an undo or a
   * clear may touch, and every screen must reach the same answer.
   */
  | { t: 'ink'; op: WireInkOp; by: Role }
  /**
   * The whole board: sent on join, and to a participant whose operation was refused, so a
   * screen that ran ahead is brought back into agreement without a patch protocol.
   */
  | { t: 'board'; board: WireBoard }

// ── Parsing ──────────────────────────────────────────────────────────────────

const actionSchema: z.ZodType<Action> = z.discriminatedUnion('t', [
  z.object({ t: z.literal('nav'), slide: z.number() }),
  z.object({ t: z.literal('reset'), block: z.string() }),
  z.object({ t: z.literal('tap'), block: z.string(), target: z.string() }),
  z.object({ t: z.literal('pick'), block: z.string(), side: z.enum(['a', 'b']), target: z.string() }),
  z.object({ t: z.literal('level'), block: z.string(), level: z.number() }),
])

/**
 * A lesson arriving over a socket gets the same scrutiny as one read from `lessons/`,
 * cross-checks included: it is about to drive the authoritative reducer.
 */
const lessonSchema: z.ZodType<Lesson> = z.custom<Lesson>((v) => validateLesson(v).ok, {
  message: 'not a valid lesson',
})

/**
 * A stroke is untrusted input that ends up in an SVG attribute, so its colour is checked
 * against a shape rather than taken as a string: an arbitrary one would be arbitrary CSS.
 * Every length is bounded for the same reason the room bounds everything else — a socket
 * is open to whatever anybody sends down it.
 */
const wireStrokeSchema = z.object({
  id: z.string().min(1).max(64),
  by: z.enum(['teacher', 'student']),
  colour: z.string().regex(/^#[0-9a-f]{6}$/i),
  width: z.number().int().min(1).max(200),
  points: z.array(z.number().int()).max(MAX_POINTS_PER_STROKE * 2),
  done: z.boolean(),
})

const blockId = z.string().min(1).max(64)

const wireInkOpSchema: z.ZodType<WireInkOp> = z.discriminatedUnion('t', [
  z.object({ t: z.literal('ink'), block: blockId, stroke: wireStrokeSchema }),
  z.object({
    t: z.literal('ink-erase'),
    block: blockId,
    ids: z.array(z.string().min(1).max(64)).max(MAX_STROKES_PER_BLOCK),
  }),
  z.object({ t: z.literal('ink-undo'), block: blockId }),
  z.object({ t: z.literal('ink-clear'), block: blockId }),
])

const clientMessageSchema = z.discriminatedUnion('t', [
  z.object({ t: z.literal('hello'), room: z.string(), key: z.string().optional() }),
  z.object({ t: z.literal('action'), action: actionSchema }),
  z.object({ t: z.literal('switch-lesson'), lesson: lessonSchema }),
  z.object({ t: z.literal('lock'), value: z.boolean() }),
  z.object({ t: z.literal('mute'), value: z.boolean() }),
  z.object({ t: z.literal('pen'), value: z.boolean() }),
  z.object({ t: z.literal('ink'), op: wireInkOpSchema }),
])

// ── Ink, between the wire and the model ──────────────────────────────────────

/**
 * A stroke as the model holds it, or null when its points do not decode — an odd-length
 * array, a non-integer, or a coordinate the running sums put off the grid. A malformed
 * stroke is refused rather than clamped: a clamped one is a mark nobody made.
 */
export function toStroke(wire: WireStroke): Stroke | null {
  const points = decodePoints(wire.points)
  if (points === null) return null
  return {
    id: wire.id,
    by: wire.by,
    colour: wire.colour,
    width: wire.width,
    points,
    done: wire.done,
  }
}

export function toWireStroke(stroke: Stroke): WireStroke {
  return {
    id: stroke.id,
    by: stroke.by,
    colour: stroke.colour,
    width: stroke.width,
    points: encodePoints(stroke.points),
    done: stroke.done,
  }
}

/** A wire operation as the model holds it, or null when a stroke inside it is malformed. */
export function toInkOp(wire: WireInkOp): InkOp | null {
  if (wire.t !== 'ink') return wire
  const stroke = toStroke(wire.stroke)
  return stroke === null ? null : { t: 'ink', block: wire.block, stroke }
}

export function toWireInkOp(op: InkOp): WireInkOp {
  if (op.t !== 'ink') return op
  return { t: 'ink', block: op.block, stroke: toWireStroke(op.stroke) }
}

export function toWireBoard(board: Board): WireBoard {
  const out: WireBoard = {}
  for (const [block, strokes] of Object.entries(board)) {
    out[block] = strokes.map(toWireStroke)
  }
  return out
}

/** The inverse, over untrusted input: a board with any malformed stroke dropped. */
export function toBoard(wire: WireBoard): Board {
  const out: Board = {}
  for (const [block, strokes] of Object.entries(wire)) {
    const decoded = strokes.map(toStroke).filter((s): s is Stroke => s !== null)
    if (decoded.length > 0) out[block] = decoded
  }
  return out
}

/**
 * A room reads its messages from an open socket, so every one of them is untrusted
 * input. Returns null rather than throwing: a malformed frame is answered, not fatal.
 */
export function parseClientMessage(raw: string): ClientMessage | null {
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    return null
  }
  const parsed = clientMessageSchema.safeParse(data)
  return parsed.success ? (parsed.data as ClientMessage) : null
}

/**
 * The client trusts its room, but not the shape of a frame that may come from an older
 * or newer Worker than the page was built against.
 */
export function parseServerMessage(raw: string): ServerMessage | null {
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    return null
  }
  if (typeof data !== 'object' || data === null) return null
  const t = (data as { t?: unknown }).t
  if (
    t === 'state' ||
    t === 'refused' ||
    t === 'peers' ||
    t === 'error' ||
    t === 'ink' ||
    t === 'board'
  ) {
    return data as ServerMessage
  }
  return null
}

/** `exactOptionalPropertyTypes` forbids an explicit `undefined`, so the key is omitted. */
export function hello(room: string, key: string | null): ClientMessage {
  return key === null ? { t: 'hello', room } : { t: 'hello', room, key }
}
