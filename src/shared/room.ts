/**
 * The room's brain (design D9).
 *
 * Everything a room does — admit a joiner, apply an action, refuse a locked student,
 * switch lesson, produce a snapshot — happens here, in plain code over plain data. The
 * Durable Object in `worker/` is a socket adapter around this class and holds no rules
 * of its own, which is what makes convergence a unit test rather than a two-browser
 * check.
 *
 * No Cloudflare import, no socket, no clock, no randomness: given the same room state
 * and the same message, this always produces the same next room state.
 */

import { applyAction, newLessonState } from './reducer'
import { seedFor } from './rng'
import type { ClientMessage, Peers, RefusedReason, Role, ServerMessage } from './protocol'
import type { Action, Lesson, LessonState } from './types'

/** Small enough to stay a lesson between two people, with room to grow into a pair. */
export const MAX_PARTICIPANTS = 4

/**
 * The actions that change which exercise is in play rather than what happens inside it.
 * In a room they belong to the teacher alone (design D23); everything else — every tap
 * inside the exercise — is open to both.
 */
export const PACING_ACTIONS: readonly Action['t'][] = ['nav', 'reset']

export type Participant = { id: string; role: Role }

/** Everything a room is. This is exactly what the Durable Object persists (design D11). */
export type RoomState = {
  /** The lesson in play. The room carries the data, not just the id — see protocol.ts. */
  lesson: Lesson
  state: LessonState
  locked: boolean
  /** Never leaves the room: a client is told how many peers there are, not who. */
  teacherKey: string
  participants: Participant[]
}

/** What the adapter must do with a message, once the room has decided. */
export type Outcome =
  /** The state changed: send every participant a fresh snapshot. */
  | { kind: 'applied' }
  /** Nothing changed: tell the sender why, and hand it the room's state to settle on. */
  | { kind: 'refused'; reason: RefusedReason }
  /** The roster changed: send every participant the peer count. */
  | { kind: 'peers' }
  /** The sender may not be here at all. */
  | { kind: 'error'; code: 'room-full' | 'bad-message' }

export type JoinOutcome = { ok: true; role: Role } | { ok: false; code: 'room-full' }

export class RoomCore {
  #room: RoomState

  constructor(room: RoomState) {
    this.#room = room
  }

  /** A room opens on the lesson and the progress the teacher already had (spec). */
  static open(lesson: Lesson, state: LessonState, teacherKey: string): RoomCore {
    return new RoomCore({ lesson, state, locked: false, teacherKey, participants: [] })
  }

  /** The whole room, for the adapter to persist. Callers must not mutate it. */
  get snapshot(): RoomState {
    return this.#room
  }

  get lesson(): Lesson {
    return this.#room.lesson
  }

  get locked(): boolean {
    return this.#room.locked
  }

  get participants(): readonly Participant[] {
    return this.#room.participants
  }

  /**
   * Admits a socket. The role comes from the key it presents, never from the route it
   * arrived on (design D12), so the student's link cannot yield the teacher's view.
   */
  join(id: string, key: string | null): JoinOutcome {
    const existing = this.#room.participants.find((p) => p.id === id)
    if (existing !== undefined) return { ok: true, role: existing.role }
    if (this.#room.participants.length >= MAX_PARTICIPANTS) return { ok: false, code: 'room-full' }

    const role: Role = key !== null && key === this.#room.teacherKey ? 'teacher' : 'student'
    this.#room = { ...this.#room, participants: [...this.#room.participants, { id, role }] }
    return { ok: true, role }
  }

  leave(id: string): void {
    const participants = this.#room.participants.filter((p) => p.id !== id)
    if (participants.length === this.#room.participants.length) return
    this.#room = { ...this.#room, participants }
  }

  roleOf(id: string): Role | null {
    return this.#room.participants.find((p) => p.id === id)?.role ?? null
  }

  peers(): Peers {
    return {
      teacher: this.#room.participants.some((p) => p.role === 'teacher'),
      students: this.#room.participants.filter((p) => p.role === 'student').length,
    }
  }

  /** The snapshot a given socket is sent: the same state, addressed to its own role. */
  stateMessage(role: Role): ServerMessage {
    return { t: 'state', state: this.#room.state, locked: this.#room.locked, role }
  }

  peersMessage(): ServerMessage {
    return { t: 'peers', peers: this.peers() }
  }

  /** Everything a participant can ask of the room, after `hello`. */
  handle(participantId: string, message: ClientMessage): Outcome {
    const role = this.roleOf(participantId)
    if (role === null) return { kind: 'error', code: 'bad-message' }

    switch (message.t) {
      case 'hello':
        // Answered by the adapter on connect; a second one changes nothing.
        return { kind: 'refused', reason: 'no-effect' }
      case 'action':
        return this.#act(role, message.action)
      case 'switch-lesson':
        if (role !== 'teacher') return { kind: 'refused', reason: 'not-teacher' }
        return this.#switchLesson(message.lesson)
      case 'lock':
        if (role !== 'teacher') return { kind: 'refused', reason: 'not-teacher' }
        if (this.#room.locked === message.value) return { kind: 'refused', reason: 'no-effect' }
        this.#room = { ...this.#room, locked: message.value }
        return { kind: 'applied' }
    }
  }

  /**
   * Both of the room's rules about who may do what are enforced here and only reflected
   * in the student's UI (design D14, D23): a rule that lived in the browser would be
   * undone by the page reload the child it is aimed at is the most likely person to
   * perform.
   *
   * They are different rules. Pacing is the teacher's whatever the lock says — the
   * student plays the exercise, the teacher decides when the lesson moves on — while the
   * lock is the stronger, temporary "hands off the exercise itself".
   */
  #act(role: Role, action: Action): Outcome {
    if (role === 'student' && PACING_ACTIONS.includes(action.t)) {
      return { kind: 'refused', reason: 'not-teacher' }
    }
    if (role === 'student' && this.#room.locked) return { kind: 'refused', reason: 'locked' }

    const next = applyAction(this.#room.lesson, this.#room.state, action)
    // The reducer returns its input by reference when it refuses. An action from a peer
    // with a stale view is expected, not exceptional.
    if (next === this.#room.state) return { kind: 'refused', reason: 'no-effect' }

    this.#room = { ...this.#room, state: next }
    return { kind: 'applied' }
  }

  /**
   * A room is not bound to the lesson it was created with (spec, D-11). The new lesson
   * always starts fresh, including one played earlier in the session, and its seed is
   * derived from the state being left behind — so the room needs no randomness of its
   * own and two switches to the same lesson still shuffle differently.
   */
  #switchLesson(lesson: Lesson): Outcome {
    const current = this.#room.state
    const seed = seedFor(current.seed, lesson.id, current.v)
    this.#room = { ...this.#room, lesson, state: newLessonState(lesson.id, seed) }
    return { kind: 'applied' }
  }
}

/**
 * How a device settles a disagreement with its room (design D10): the room's account
 * wins whenever it is at least as new as the device's own. A snapshot older than the
 * local state is a message that overtook an action still in flight, and adopting it
 * would make the participant's own tap flicker back out.
 *
 * A snapshot for a different lesson is always adopted: the room changed lesson under us.
 */
export function reconcile(local: LessonState, incoming: LessonState): LessonState {
  if (incoming.lessonId !== local.lessonId) return incoming
  return incoming.v >= local.v ? incoming : local
}

// ── The other side of the wire ───────────────────────────────────────────────

/**
 * A participant's view of the room, as pure data. `useRoom` is a React wrapper over
 * this and adds nothing to it, so the convergence test drives the same code the browser
 * runs — which is the whole point of testing convergence without a socket (design D19).
 */
export type ClientView = {
  state: LessonState
  locked: boolean
  role: Role | null
  /**
   * Whether the next snapshot must be taken whole rather than reconciled by version.
   * True on a fresh connection — a device that played on unsynced can be ahead of the
   * room and must still be brought into agreement with it — and true after a refusal,
   * where the device has just learnt that an action it applied never happened.
   */
  adoptNext: boolean
}

export function newClientView(state: LessonState): ClientView {
  return { state, locked: false, role: null, adoptNext: true }
}

/** A fresh socket: whatever the room says next is the truth (spec: "Coming back"). */
export function viewConnected(view: ClientView): ClientView {
  return { ...view, adoptNext: true }
}

/**
 * The optimistic half of design D13. The tap lands on this screen at once; the room
 * hears about it separately and has the final word.
 */
export function viewAct(view: ClientView, lesson: Lesson, action: Action): ClientView {
  const state = applyAction(lesson, view.state, action)
  return state === view.state ? view : { ...view, state }
}

export function viewReceive(view: ClientView, message: ServerMessage): ClientView {
  if (message.t === 'state') {
    const state = view.adoptNext ? message.state : reconcile(view.state, message.state)
    return { state, locked: message.locked, role: message.role, adoptNext: false }
  }
  if (message.t === 'refused') return { ...view, adoptNext: true }
  return view
}
