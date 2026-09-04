import { describe, expect, it } from 'vitest'
import {
  RoomCore, newClientView, viewAct, viewConnected, viewReceive, type ClientView,
} from './room'
import { hello, type ClientMessage, type Role, type ServerMessage } from './protocol'
import { testLesson, testState } from './__fixtures__/lesson'
import type { Action, Lesson, LessonState } from './types'

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

  /** The optimistic half of design D13: the tap lands here before it is ever sent. */
  act(action: Action): ClientMessage {
    this.view = viewAct(this.view, this.lesson, action)
    return { t: 'action', action }
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
    if (outcome.kind === 'refused') {
      client.receive({ t: 'refused', reason: outcome.reason })
      // A refusal is also where a stale device learns the truth, so the state goes back.
      client.receive(this.core.stateMessage(this.#roleOf(client)))
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
    student.receive({ t: 'state', state: { ...ahead, v: ahead.v - 1, slide: 0 }, locked: false, role: 'student' })
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
})
