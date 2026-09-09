import { describe, expect, it } from 'vitest'
import {
  RoomCore, newClientView, viewAct, viewConnected, viewInk, viewReceive, type ClientView,
} from './room'
import { hello, toWireInkOp, type ClientMessage, type Role, type ServerMessage } from './protocol'
import { testLesson, testState } from './__fixtures__/lesson'
import type { Action, Board, InkOp, Lesson, LessonState } from './types'

/**
 * The convergence tier of design D19: two clients and one room exchanging the real
 * protocol messages, with no socket anywhere. Everything that can go subtly wrong lives
 * in this message flow, and none of it needs a network to reproduce.
 */

const KEY = 'k'

/**
 * A browser without a browser: it applies its own action optimistically and adopts an
 * arriving snapshot by the same rule `useRoom` uses. A fresh connection adopts
 * unconditionally, because a device that played on while unsynced can be ahead of the
 * room in version and must still be brought into agreement with it.
 */
class Client {
  readonly id: string
  readonly key: string | null
  lesson: Lesson
  view: ClientView
  refusals = 0

  constructor(id: string, key: string | null, lesson: Lesson, state: LessonState) {
    this.id = id
    this.key = key
    this.lesson = lesson
    this.view = newClientView(state)
  }

  get state(): LessonState {
    return this.view.state
  }

  get role(): Role | null {
    return this.view.role
  }

  get locked(): boolean {
    return this.view.locked
  }

  get muted(): boolean {
    return this.view.muted
  }

  get pen(): boolean {
    return this.view.pen
  }

  get board(): Board {
    return this.view.board
  }

  /** The optimistic half of design D13: the tap lands here before it is ever sent. */
  act(action: Action): ClientMessage {
    this.view = viewAct(this.view, this.lesson, action)
    return { t: 'action', action }
  }

  /** The same, for a mark: it appears here first and the room hears about it after. */
  ink(op: InkOp): ClientMessage {
    this.view = viewInk(this.view, op, this.view.role ?? 'teacher')
    return { t: 'ink', op: toWireInkOp(op) }
  }

  receive(message: ServerMessage): void {
    if (message.t === 'refused') this.refusals++
    this.view = viewReceive(this.view, message)
  }

  /** A reconnect, or a first connection. */
  markFresh(): void {
    this.view = viewConnected(this.view)
  }
}

/** The room plus its adapter: exactly what `worker/room.ts` does with an Outcome. */
class Table {
  readonly core: RoomCore
  readonly clients: Client[] = []

  constructor(lesson: Lesson, state: LessonState) {
    this.core = RoomCore.open(lesson, state, KEY)
  }

  connect(client: Client): void {
    const joined = this.core.join(client.id, client.key)
    if (!joined.ok) throw new Error(joined.code)
    if (!this.clients.includes(client)) this.clients.push(client)
    client.markFresh()
    client.receive(this.core.stateMessage(joined.role))
    client.receive(this.core.boardMessage())
    this.#broadcastPeers()
  }

  disconnect(client: Client): void {
    this.core.leave(client.id)
    const at = this.clients.indexOf(client)
    if (at >= 0) this.clients.splice(at, 1)
    this.#broadcastPeers()
  }

  send(client: Client, message: ClientMessage): void {
    const outcome = this.core.handle(client.id, message)
    if (outcome.kind === 'applied') {
      for (const peer of this.clients) peer.receive(this.core.stateMessage(this.#roleOf(peer)))
      return
    }
    if (outcome.kind === 'ink') {
      // To the others and to nobody else. No state broadcast, because ink is not state
      // (design D101), and not back to the sender, which already applied it (design D102).
      const relayed: ServerMessage = { t: 'ink', op: toWireInkOp(outcome.op), by: outcome.by }
      for (const peer of this.clients) {
        if (peer !== client) peer.receive(relayed)
      }
      return
    }
    if (outcome.kind === 'refused') {
      client.receive({ t: 'refused', reason: outcome.reason })
      // A refusal is also where a stale device learns the truth, so the state goes back.
      client.receive(this.core.stateMessage(this.#roleOf(client)))
      if (message.t === 'ink') client.receive(this.core.boardMessage())
      return
    }
    if (outcome.kind === 'error') client.receive({ t: 'error', code: outcome.code })
  }

  #roleOf(client: Client): Role {
    return this.core.roleOf(client.id) ?? 'student'
  }

  #broadcastPeers(): void {
    for (const peer of this.clients) peer.receive(this.core.peersMessage())
  }
}

function table(): { room: Table; teacher: Client; student: Client; lesson: Lesson } {
  const lesson = testLesson()
  const state = testState()
  const room = new Table(lesson, state)
  const teacher = new Client('t', KEY, lesson, state)
  const student = new Client('s', null, lesson, state)
  return { room, teacher, student, lesson }
}

function expectAgreement(room: Table, ...clients: Client[]): void {
  for (const client of clients) {
    expect(client.state, `${client.id} disagrees with the room`).toEqual(room.core.snapshot.state)
  }
  // Field by field, so a difference is reported as the field rather than as a blob.
  const authority = room.core.snapshot.state
  for (const client of clients) {
    expect(client.state.v).toBe(authority.v)
    expect(client.state.lessonId).toBe(authority.lessonId)
    expect(client.state.slide).toBe(authority.slide)
    expect(client.state.seed).toBe(authority.seed)
    expect(client.state.blocks).toEqual(authority.blocks)
    expect(client.state.resets).toEqual(authority.resets)
  }
}

describe('two clients and one room end up identical', () => {
  it('greets each socket with the role the room assigned it', () => {
    const { room, teacher, student } = table()
    room.send(teacher, hello('AB12', KEY))
    room.connect(teacher)
    room.connect(student)

    expect(teacher.role).toBe('teacher')
    expect(student.role).toBe('student')
  })

  it('carries every kind of action to the other screen', () => {
    const { room, teacher, student } = table()
    room.connect(teacher)
    room.connect(student)

    const cards = room.core.snapshot.state
    const firstCard = testLesson().items[0]!.id
    room.send(student, student.act({ t: 'tap', block: 'vocab', target: firstCard }))
    room.send(teacher, teacher.act({ t: 'nav', slide: 1 }))
    room.send(student, student.act({ t: 'pick', block: 'pairs', side: 'a', target: 'dog' }))
    room.send(teacher, teacher.act({ t: 'nav', slide: 2 }))
    room.send(student, student.act({ t: 'level', block: 'say', level: 1 }))
    room.send(teacher, teacher.act({ t: 'reset', block: 'vocab' }))

    expect(room.core.snapshot.state.v).toBeGreaterThan(cards.v)
    expectAgreement(room, teacher, student)
  })

  it('shows both screens one shuffle', () => {
    const { room, teacher, student } = table()
    room.connect(teacher)
    room.connect(student)
    expect(student.state.seed).toBe(teacher.state.seed)
    expect(student.state.seed).toBe(room.core.snapshot.state.seed)
  })

  it('converges after interleaved actions from both sides', () => {
    const { room, teacher, student } = table()
    room.connect(teacher)
    room.connect(student)

    const ids = testLesson().items.map((i) => i.id)
    for (const [index, id] of ids.entries()) {
      const actor = index % 2 === 0 ? student : teacher
      room.send(actor, actor.act({ t: 'tap', block: 'vocab', target: id }))
    }
    expectAgreement(room, teacher, student)
  })

  it('settles a client that acted on a stale snapshot', () => {
    const { room, teacher, student } = table()
    room.connect(teacher)
    room.connect(student)

    // Both reach for the same card in the same instant; the student's arrives second.
    const target = testLesson().items[0]!.id
    const teacherMessage = teacher.act({ t: 'tap', block: 'vocab', target })
    const studentMessage = student.act({ t: 'tap', block: 'vocab', target })
    room.send(teacher, teacherMessage)
    room.send(student, studentMessage)

    expect(student.refusals).toBe(1)
    expectAgreement(room, teacher, student)
  })

  it('ignores a snapshot that overtakes an action still in flight', () => {
    const { room, teacher, student } = table()
    room.connect(teacher)
    room.connect(student)
    room.send(teacher, teacher.act({ t: 'nav', slide: 3 }))

    const ahead = student.state
    student.receive({
      t: 'state',
      state: { ...ahead, v: ahead.v - 1, slide: 0 },
      locked: false,
      muted: false,
      pen: true,
      role: 'student',
    })
    expect(student.state).toBe(ahead)
    expect(student.state.slide).toBe(3)
  })

  it('brings a rejoining client to the current screen with all progress so far', () => {
    const { room, teacher, student } = table()
    room.connect(teacher)
    room.connect(student)

    for (const id of testLesson().items.map((i) => i.id)) {
      room.send(teacher, teacher.act({ t: 'tap', block: 'vocab', target: id }))
    }
    room.send(teacher, teacher.act({ t: 'nav', slide: 1 }))
    room.send(teacher, teacher.act({ t: 'pick', block: 'pairs', side: 'a', target: 'dog' }))

    // The student closes the tab and opens the same link again.
    room.disconnect(student)
    room.send(teacher, teacher.act({ t: 'pick', block: 'pairs', side: 'b', target: 'dog' }))
    room.connect(student)

    expect(student.state.slide).toBe(1)
    expectAgreement(room, teacher, student)
  })

  it('brings back a client that played on while unsynced and got ahead in version', () => {
    const { room, teacher, student } = table()
    room.connect(teacher)
    room.connect(student)
    room.disconnect(student)

    // Offline, the student out-taps the room and ends on a higher version than it.
    for (const id of testLesson().items.map((i) => i.id)) {
      student.act({ t: 'tap', block: 'vocab', target: id })
    }
    student.act({ t: 'nav', slide: 4 })
    room.send(teacher, teacher.act({ t: 'nav', slide: 1 }))
    expect(student.state.v).toBeGreaterThan(room.core.snapshot.state.v)

    room.connect(student)
    expectAgreement(room, teacher, student)
  })

  it('keeps both screens together across a lesson switch', () => {
    const { room, teacher, student } = table()
    room.connect(teacher)
    room.connect(student)
    room.send(teacher, teacher.act({ t: 'nav', slide: 2 }))

    const other = { ...testLesson(), id: 'other', title: 'Other' }
    teacher.lesson = other
    student.lesson = other
    room.send(teacher, { t: 'switch-lesson', lesson: other })

    expect(student.state.lessonId).toBe('other')
    expect(student.state.slide).toBe(0)
    expectAgreement(room, teacher, student)
  })

  it('settles a student that tried to steer the lesson (design D23)', () => {
    const { room, teacher, student } = table()
    room.connect(teacher)
    room.connect(student)
    room.send(teacher, teacher.act({ t: 'nav', slide: 2 }))

    // The student applies it optimistically, as any dispatch does, and the room says no.
    room.send(student, student.act({ t: 'nav', slide: 5 }))
    room.send(student, student.act({ t: 'reset', block: 'vocab' }))

    expect(student.refusals).toBe(2)
    expect(room.core.snapshot.state.slide).toBe(2)
    expectAgreement(room, teacher, student)
  })

  it('leaves both screens identical when a locked student keeps tapping', () => {
    const { room, teacher, student } = table()
    room.connect(teacher)
    room.connect(student)
    room.send(teacher, { t: 'lock', value: true })

    const target = testLesson().items[1]!.id
    room.send(student, student.act({ t: 'tap', block: 'vocab', target }))
    room.send(student, student.act({ t: 'tap', block: 'vocab', target: testLesson().items[2]!.id }))

    expect(student.locked).toBe(true)
    expect(student.refusals).toBe(2)
    expectAgreement(room, teacher, student)
  })

  // Spec: the teacher's setting applies to both screens.
  it("carries the teacher's sound setting to the student's screen", () => {
    const { room, teacher, student } = table()
    room.connect(teacher)
    room.connect(student)
    expect(student.muted).toBe(false)

    room.send(teacher, { t: 'mute', value: true })
    expect(teacher.muted).toBe(true)
    expect(student.muted).toBe(true)

    room.send(teacher, { t: 'mute', value: false })
    expect(student.muted).toBe(false)
    expectAgreement(room, teacher, student)
  })

  // Spec: "A student who joins after it was turned off" and "Surviving a reload" — both
  // are the same thing to the room, a socket taking the setting from its first snapshot.
  it('hands the setting to a screen that arrives after it was changed', () => {
    const { room, teacher, student, lesson } = table()
    room.connect(teacher)
    room.send(teacher, { t: 'mute', value: true })

    room.connect(student)
    expect(student.muted).toBe(true)

    // The teacher reloads: a new socket under the same key, starting from nothing.
    room.disconnect(teacher)
    const reloaded = new Client('t', KEY, lesson, testState())
    expect(reloaded.muted).toBe(false)
    room.connect(reloaded)
    expect(reloaded.muted).toBe(true)
  })
})

// ── The board (design D101, D102; spec `synced-rooms`) ───────────────────────

const BLOCK = 'vocab'

function mark(id: string, points = [{ x: 100, y: 100 }], done = true): InkOp {
  return {
    t: 'ink',
    block: BLOCK,
    stroke: { id, by: 'teacher', colour: '#ff0000', width: 20, points, done },
  }
}

function boardIds(client: Client): string[] {
  return (client.board[BLOCK] ?? []).map((s) => s.id)
}

describe('a mark reaches the other screen', () => {
  it('arrives without a state broadcast', () => {
    const { room, teacher, student } = table()
    room.connect(teacher)
    room.connect(student)
    const before = student.state

    room.send(teacher, teacher.ink(mark('s1')))

    expect(boardIds(student)).toEqual(['s1'])
    // Ink is not state: the student's lesson state is the very same object it was.
    expect(student.state).toBe(before)
  })

  it('does not reach the sender twice', () => {
    const { room, teacher, student } = table()
    room.connect(teacher)
    room.connect(student)

    room.send(teacher, teacher.ink(mark('s1', [{ x: 10, y: 10 }])))

    expect(teacher.board[BLOCK]?.[0]?.points).toEqual([{ x: 10, y: 10 }])
    expect(boardIds(teacher)).toEqual(['s1'])
  })

  it('arrives in parts, in order, for a stroke sent in pieces', () => {
    const { room, teacher, student } = table()
    room.connect(teacher)
    room.connect(student)

    room.send(teacher, teacher.ink(mark('s1', [{ x: 10, y: 10 }], false)))
    room.send(teacher, teacher.ink(mark('s1', [{ x: 20, y: 20 }], false)))
    room.send(teacher, teacher.ink(mark('s1', [{ x: 30, y: 30 }], true)))

    expect(student.board[BLOCK]?.[0]?.points).toEqual([
      { x: 10, y: 10 },
      { x: 20, y: 20 },
      { x: 30, y: 30 },
    ])
    expect(student.board[BLOCK]?.[0]?.done).toBe(true)
    expect(student.board).toEqual(teacher.board)
  })
})

describe('two people drawing at once simply both drew', () => {
  it('both marks end up on both screens', () => {
    const { room, teacher, student } = table()
    room.connect(teacher)
    room.connect(student)

    const hers = teacher.ink(mark('t1'))
    const his = student.ink(mark('s1'))
    room.send(teacher, hers)
    room.send(student, his)

    // As a set, not as a sequence: each screen applied its own mark before hearing about
    // the other's, so the two may interleave differently (design D112).
    expect(boardIds(teacher).sort()).toEqual(['s1', 't1'])
    expect(boardIds(student).sort()).toEqual(['s1', 't1'])
  })

  it('one participant’s own marks keep their order on both screens (design D112)', () => {
    const { room, teacher, student } = table()
    room.connect(teacher)
    room.connect(student)

    // The student draws in between, which is exactly what could reorder them.
    room.send(teacher, teacher.ink(mark('t1')))
    room.send(student, student.ink(mark('s1')))
    room.send(teacher, teacher.ink(mark('t2')))
    room.send(student, student.ink(mark('s2')))
    room.send(teacher, teacher.ink(mark('t3')))

    const hersOn = (client: Client): string[] =>
      (client.board[BLOCK] ?? []).filter((s) => s.by === 'teacher').map((s) => s.id)

    expect(hersOn(teacher)).toEqual(['t1', 't2', 't3'])
    expect(hersOn(student)).toEqual(['t1', 't2', 't3'])
  })

  it('undo agrees across screens on which mark was the teacher’s last (design D112)', () => {
    const { room, teacher, student } = table()
    room.connect(teacher)
    room.connect(student)

    room.send(teacher, teacher.ink(mark('t1')))
    room.send(student, student.ink(mark('s1')))
    room.send(teacher, teacher.ink(mark('t2')))

    room.send(teacher, teacher.ink({ t: 'ink-undo', block: BLOCK }))

    expect(boardIds(teacher).sort()).toEqual(['s1', 't1'])
    expect(boardIds(student).sort()).toEqual(['s1', 't1'])
  })

  it('erasing an already-erased mark leaves both agreeing', () => {
    const { room, teacher, student } = table()
    room.connect(teacher)
    room.connect(student)
    room.send(teacher, teacher.ink(mark('t1')))

    room.send(teacher, teacher.ink({ t: 'ink-erase', block: BLOCK, ids: ['t1'] }))
    room.send(student, student.ink({ t: 'ink-erase', block: BLOCK, ids: ['t1'] }))

    expect(teacher.board[BLOCK]).toBeUndefined()
    expect(student.board[BLOCK]).toBeUndefined()
    expect(student.refusals).toBe(1)
  })
})

describe('the board settles a screen that ran ahead', () => {
  it('a refused mark is answered with the room’s own board', () => {
    const { room, teacher, student } = table()
    room.connect(teacher)
    room.connect(student)
    room.send(teacher, teacher.ink(mark('t1')))
    room.send(teacher, { t: 'pen', value: false })

    // The student draws optimistically and is refused: her screen must not keep the mark.
    room.send(student, student.ink(mark('s1')))

    expect(boardIds(student)).toEqual(['t1'])
    expect(student.board).toEqual(room.core.board)
  })

  it('a joiner is handed the marks already made', () => {
    const { room, teacher, student } = table()
    room.connect(teacher)
    room.send(teacher, teacher.ink(mark('t1')))

    room.connect(student)

    expect(boardIds(student)).toEqual(['t1'])
  })

  it('a reconnecting participant is brought back to the room’s board', () => {
    const { room, teacher, student } = table()
    room.connect(teacher)
    room.connect(student)
    room.send(teacher, teacher.ink(mark('t1')))

    room.disconnect(student)
    room.send(teacher, teacher.ink(mark('t2')))
    room.connect(student)

    expect(boardIds(student)).toEqual(['t1', 't2'])
  })
})

describe('the pen reaches both screens (design D107)', () => {
  it('the student learns her pen was withdrawn', () => {
    const { room, teacher, student } = table()
    room.connect(teacher)
    room.connect(student)

    room.send(teacher, { t: 'pen', value: false })

    expect(student.pen).toBe(false)
    expect(teacher.pen).toBe(false)
  })

  it('a joiner inherits a withdrawn pen', () => {
    const { room, teacher, student } = table()
    room.connect(teacher)
    room.send(teacher, { t: 'pen', value: false })

    room.connect(student)

    expect(student.pen).toBe(false)
  })

  it('the lock and the pen do not move each other', () => {
    const { room, teacher, student } = table()
    room.connect(teacher)
    room.connect(student)

    room.send(teacher, { t: 'lock', value: true })
    expect(student.pen).toBe(true)

    room.send(teacher, { t: 'pen', value: false })
    expect(student.locked).toBe(true)
  })
})

describe('marks belong to the exercise they were made on (design D109)', () => {
  it('are still there when the lesson comes back to it', () => {
    const { room, teacher, student, lesson } = table()
    room.connect(teacher)
    room.connect(student)
    room.send(teacher, teacher.ink(mark('t1')))

    const second = lesson.blocks[1]
    if (second === undefined) throw new Error('the test lesson needs a second exercise')
    room.send(teacher, teacher.act({ t: 'nav', slide: 1 }))
    expect(student.board[second.id]).toBeUndefined()

    room.send(teacher, teacher.act({ t: 'nav', slide: 0 }))
    expect(boardIds(student)).toEqual(['t1'])
    expect(boardIds(teacher)).toEqual(['t1'])
  })

  it('survive a reset of the exercise they are on', () => {
    const { room, teacher, student } = table()
    room.connect(teacher)
    room.connect(student)
    room.send(teacher, teacher.ink(mark('t1')))

    room.send(teacher, teacher.act({ t: 'reset', block: BLOCK }))

    // A reset re-orders the exercise; it says nothing about what was drawn on it.
    expect(boardIds(teacher)).toEqual(['t1'])
    expect(boardIds(student)).toEqual(['t1'])
  })

  it('are discarded when the room changes lesson', () => {
    const { room, teacher, student, lesson } = table()
    room.connect(teacher)
    room.connect(student)
    room.send(teacher, teacher.ink(mark('t1')))

    room.send(teacher, { t: 'switch-lesson', lesson: { ...lesson, id: 'other', title: 'Other' } })

    expect(room.core.board).toEqual({})
  })
})
