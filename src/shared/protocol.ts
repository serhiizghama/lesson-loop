/**
 * What travels between a browser and the room it is joined to.
 *
 * Both directions are plain serialisable data: no class, no function, no `Date`, and
 * nothing that only exists in a browser or only exists in a Worker. `src/shared` is
 * bundled into both, and `src/shared/purity.test.ts` keeps it that way.
 */

import { z } from 'zod'
import type { Action, Lesson, LessonState } from './types'
import { validateLesson } from './validate'

/** Which half of the lesson a socket is holding. The room decides this, never the client. */
export type Role = 'teacher' | 'student'

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

// ── Room → client ────────────────────────────────────────────────────────────

/** Why an action did not apply. Never fatal: the state message beside it settles the truth. */
export type RefusedReason = 'locked' | 'not-teacher' | 'no-effect' | 'unknown-lesson'

/** Why a socket cannot be in this room at all. */
export type RoomErrorCode = 'no-such-room' | 'room-full' | 'bad-message'

/** Who is in the room. Names are deliberately absent — a room asks for no personal data. */
export type Peers = { teacher: boolean; students: number }

export type ServerMessage =
  /** The whole state after every applied action, and on join (design D10). */
  | { t: 'state'; state: LessonState; locked: boolean; muted: boolean; role: Role }
  | { t: 'refused'; reason: RefusedReason }
  | { t: 'peers'; peers: Peers }
  | { t: 'error'; code: RoomErrorCode }

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

const clientMessageSchema = z.discriminatedUnion('t', [
  z.object({ t: z.literal('hello'), room: z.string(), key: z.string().optional() }),
  z.object({ t: z.literal('action'), action: actionSchema }),
  z.object({ t: z.literal('switch-lesson'), lesson: lessonSchema }),
  z.object({ t: z.literal('lock'), value: z.boolean() }),
  z.object({ t: z.literal('mute'), value: z.boolean() }),
])

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
  if (t === 'state' || t === 'refused' || t === 'peers' || t === 'error') {
    return data as ServerMessage
  }
  return null
}

/** `exactOptionalPropertyTypes` forbids an explicit `undefined`, so the key is omitted. */
export function hello(room: string, key: string | null): ClientMessage {
  return key === null ? { t: 'hello', room } : { t: 'hello', room, key }
}
