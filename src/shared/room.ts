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

import { applyInk, completedBoard, withoutPending } from './ink'
import { applyAction, newLessonState } from './reducer'
import { seedFor } from './rng'
import { toBoard, toInkOp, toWireBoard } from './protocol'
import type { ClientMessage, Peers, RefusedReason, Role, ServerMessage, WireInkOp } from './protocol'
import type { Action, Board, InkOp, Lesson, LessonState } from './types'

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
  /**
   * Whether the app has been told to stop speaking unasked (design D66). The teacher's,
   * and the room's rather than a device's, because a live lesson has one voice and it is
   * hers — a synthesised one repeating her on two screens talks over her.
   */
  muted: boolean
  /**
   * Whether the student may draw (design D107). A third switch beside the lock and the
   * sound setting, independent of both: an exercise can be held while the child is still
   * invited to circle her answer, and the pen can be taken away while the exercise stays
   * hers to play.
   */
  pen: boolean
  /**
   * The marks of the lesson in play, keyed by block id. Deliberately beside `state` and
   * not inside it: ink never passes through the reducer, never advances `v`, and never
   * enlarges the snapshot broadcast on every tap (design D101).
   */
  board: Board
  /** Never leaves the room: a client is told how many peers there are, not who. */
  teacherKey: string
  participants: Participant[]
}

/** What the adapter must do with a message, once the room has decided. */
export type Outcome =
  /** The state changed: send every participant a fresh snapshot. */
  | { kind: 'applied' }
  /**
   * A mark changed: relay it to the *other* participants. Never a state broadcast — that
   * is the whole point of ink being a second channel (design D101) — and never back to the
   * sender, which applied it optimistically and would append the same points twice.
   */
  | { kind: 'ink'; op: InkOp; by: Role }
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
    return new RoomCore({
      lesson, state, locked: false, muted: false, pen: true, board: {}, teacherKey,
      participants: [],
    })
  }

  /** The whole room, live. Callers must not mutate it. */
  get snapshot(): RoomState {
    return this.#room
  }

  /**
   * The room as it should be stored: everything, minus the strokes nobody has finished
   * drawing yet (design D106). An in-flight stroke is shown and relayed, but it is not a
   * mark until the pen comes up, and a room reloaded from storage should not hold half of
   * one.
   */
  get storable(): RoomState {
    return { ...this.#room, board: completedBoard(this.#room.board) }
  }

  get lesson(): Lesson {
    return this.#room.lesson
  }

  get locked(): boolean {
    return this.#room.locked
  }

  get muted(): boolean {
    return this.#room.muted
  }

  get pen(): boolean {
    return this.#room.pen
  }

  get board(): Board {
    return this.#room.board
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
    const role = this.roleOf(id)
    const participants = this.#room.participants.filter((p) => p.id !== id)
    if (participants.length === this.#room.participants.length) return
    // A stroke nobody will ever finish must not outlive the hand that was drawing it
    // (design D106). Only that participant's unfinished marks go; every completed one
    // stays, because it is a mark that was actually made.
    const board = role === null ? this.#room.board : withoutPending(this.#room.board, role)
    this.#room = { ...this.#room, participants, board }
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
    return {
      t: 'state',
      state: this.#room.state,
      locked: this.#room.locked,
      muted: this.#room.muted,
      pen: this.#room.pen,
      role,
    }
  }

  /**
   * The whole board. Sent on join, so a joiner and a reloading participant see the marks
   * as they stand, and after a refusal, so a screen that ran ahead is brought back into
   * agreement without a patch protocol.
   */
  boardMessage(): ServerMessage {
    return { t: 'board', board: toWireBoard(this.#room.board) }
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
      case 'mute':
        // A third rule about who may do what, enforced here for the same reason as the
        // other two: a student who could quieten or unquieten the room would be deciding
        // how the lesson is taught (design D66).
        if (role !== 'teacher') return { kind: 'refused', reason: 'not-teacher' }
        if (this.#room.muted === message.value) return { kind: 'refused', reason: 'no-effect' }
        this.#room = { ...this.#room, muted: message.value }
        return { kind: 'applied' }
      case 'pen':
        // A fourth rule about who may do what, and the third the teacher owns. Enforced
        // here rather than by hiding the toolbar, for the reason D14 and D23 exist: the
        // child the rule is aimed at is the likeliest person to reload the page.
        if (role !== 'teacher') return { kind: 'refused', reason: 'not-teacher' }
        if (this.#room.pen === message.value) return { kind: 'refused', reason: 'no-effect' }
        this.#room = { ...this.#room, pen: message.value }
        return { kind: 'applied' }
      case 'ink':
        return this.#ink(role, message.op)
    }
  }

  /**
   * A mark. The author is taken from the socket rather than from the message, so a client
   * cannot draw in the other participant's name; `applyInk` then decides the rest.
   */
  #ink(role: Role, wire: WireInkOp): Outcome {
    if (role === 'student' && !this.#room.pen) return { kind: 'refused', reason: 'no-pen' }

    const op = toInkOp(wire)
    if (op === null) return { kind: 'error', code: 'bad-message' }

    const board = applyInk(this.#room.board, op, role)
    // `applyInk` returns its input by reference when the operation changes nothing — an
    // erase of a mark somebody already erased, an undo with nothing of one's own left.
    if (board === this.#room.board) return { kind: 'refused', reason: 'no-effect' }

    this.#room = { ...this.#room, board }
    return { kind: 'ink', op, by: role }
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
    // The marks go with the lesson they were made on: they are keyed by block id, and the
    // blocks of the lesson being left do not exist in the one arriving.
    this.#room = {
      ...this.#room, lesson, state: newLessonState(lesson.id, seed), board: {},
    }
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
  /** Whether this screen has been told to stop speaking unasked (design D66). */
  muted: boolean
  /** Whether the student may draw (design D107). Always true for the teacher's own pen. */
  pen: boolean
  /** The marks, beside the state rather than inside it (design D101). */
  board: Board
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
  return { state, locked: false, muted: false, pen: true, board: {}, role: null, adoptNext: true }
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

/**
 * The optimistic half of ink, and the mirror of `viewAct`. The mark lands on this screen
 * at once and the room hears about it separately, exactly as a tap does — run through the
 * same `applyInk` the room runs, so both sides reach the same board (design D102).
 *
 * `by` is this screen's own role. A screen with no role yet is playing alone, where every
 * mark is the teacher's: solo play is the teacher's own screen without a room.
 */
export function viewInk(view: ClientView, op: InkOp, by: Role): ClientView {
  const board = applyInk(view.board, op, by)
  return board === view.board ? view : { ...view, board }
}

export function viewReceive(view: ClientView, message: ServerMessage): ClientView {
  if (message.t === 'state') {
    const state = view.adoptNext ? message.state : reconcile(view.state, message.state)
    // Read as an explicit `true` rather than taken as given: a snapshot from a Worker
    // built before this change carries no `muted` at all, and sound on is what that
    // build behaves as (design D74).
    return {
      ...view,
      state,
      locked: message.locked,
      muted: message.muted === true,
      // Read the same way and for the same reason: a snapshot from a Worker built before
      // the pen existed carries none, and a granted pen is what that build behaved as.
      pen: message.pen !== false,
      role: message.role,
      adoptNext: false,
    }
  }
  if (message.t === 'refused') return { ...view, adoptNext: true }
  // A mark somebody else made, applied through the same function they applied it with.
  if (message.t === 'ink') {
    const op = toInkOp(message.op)
    return op === null ? view : viewInk(view, op, message.by)
  }
  // The room's own account of the board, which settles any disagreement whole.
  if (message.t === 'board') return { ...view, board: toBoard(message.board) }
  return view
}
