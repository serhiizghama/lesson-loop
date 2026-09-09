import { describe, expect, it } from 'vitest'
import {
  MAX_PARTICIPANTS, RoomCore, newClientView, reconcile, viewReceive, type RoomState,
} from './room'
import { newLessonState } from './reducer'
import { parseClientMessage, type ServerMessage } from './protocol'
import { testLesson, testState } from './__fixtures__/lesson'
import type { Lesson, LessonState } from './types'

const KEY = 'teacher-key'

function room(lesson: Lesson = testLesson(), state: LessonState = testState()): RoomCore {
  return RoomCore.open(lesson, state, KEY)
}

/** A second lesson, so switching has somewhere to go. */
function otherLesson(): Lesson {
  return { ...testLesson(), id: 'other', title: 'Other' }
}

function firstCard(core: RoomCore): string {
  // 'vocab' is the cards block; its order is derived from the state's seed.
  const state = core.snapshot.state
  const stored = state.blocks['vocab']
  if (stored !== undefined && 'order' in stored) return stored.order[0] as string
  return testLesson().items[0]!.id
}

describe('RoomCore admits and refuses joiners', () => {
  it('gives the teacher role only to a socket presenting the key', () => {
    const core = room()
    expect(core.join('a', KEY)).toEqual({ ok: true, role: 'teacher' })
    expect(core.join('b', null)).toEqual({ ok: true, role: 'student' })
    expect(core.join('c', 'wrong')).toEqual({ ok: true, role: 'student' })
  })

  it('refuses a joiner beyond the participant cap without disturbing the others', () => {
    const core = room()
    for (let i = 0; i < MAX_PARTICIPANTS; i++) core.join(`p${i}`, null)
    const before = core.participants.map((p) => p.id)

    expect(core.join('one-too-many', null)).toEqual({ ok: false, code: 'room-full' })
    expect(core.participants.map((p) => p.id)).toEqual(before)
    expect(core.roleOf('one-too-many')).toBeNull()
  })

  it('lets a participant rejoin under the same id without taking a second seat', () => {
    const core = room()
    core.join('a', KEY)
    expect(core.join('a', null)).toEqual({ ok: true, role: 'teacher' })
    expect(core.participants).toHaveLength(1)
  })

  it('reports who is present and notices when they leave', () => {
    const core = room()
    core.join('t', KEY)
    core.join('s', null)
    expect(core.peers()).toEqual({ teacher: true, students: 1 })

    core.leave('s')
    expect(core.peers()).toEqual({ teacher: true, students: 0 })
  })
})

describe('RoomCore opens on the lesson as it stands', () => {
  it('carries the progress the teacher had already made (spec: asking for a room mid-lesson)', () => {
    const lesson = testLesson()
    const inProgress = { ...testState(), v: 5, slide: 2, blocks: { vocab: { order: ['dog'], flipped: ['dog'] } } }
    const core = RoomCore.open(lesson, inProgress, KEY)

    expect(core.snapshot.state).toBe(inProgress)
    expect(core.locked).toBe(false)
    expect(core.participants).toHaveLength(0)
  })
})

describe('RoomCore applies actions from either role', () => {
  it('reaches the snapshot when the student acts', () => {
    const core = room()
    core.join('s', null)
    expect(core.handle('s', { t: 'action', action: { t: 'tap', block: 'vocab', target: 'dog' } })).toEqual({
      kind: 'applied',
    })
    expect(core.snapshot.state.blocks['vocab']).toBeDefined()
  })

  it('reaches the snapshot when the teacher acts', () => {
    const core = room()
    core.join('t', KEY)
    core.handle('t', { t: 'action', action: { t: 'tap', block: 'vocab', target: firstCard(core) } })
    expect(core.snapshot.state.v).toBe(1)
  })

  it('refuses an action the reducer will not apply, leaving the state alone', () => {
    const core = room()
    core.join('t', KEY)
    const before = core.snapshot.state
    expect(core.handle('t', { t: 'action', action: { t: 'nav', slide: 99 } })).toEqual({
      kind: 'refused',
      reason: 'no-effect',
    })
    expect(core.snapshot.state).toBe(before)
  })

  it('refuses anything from a socket that never joined', () => {
    const core = room()
    expect(core.handle('ghost', { t: 'action', action: { t: 'nav', slide: 1 } })).toEqual({
      kind: 'error',
      code: 'bad-message',
    })
  })
})

describe('RoomCore keeps pacing with the teacher (design D23)', () => {
  it("changes nothing on a student's attempt to move between exercises", () => {
    const core = room()
    core.join('t', KEY)
    core.join('s', null)
    const before = core.snapshot.state

    expect(core.handle('s', { t: 'action', action: { t: 'nav', slide: 2 } })).toEqual({
      kind: 'refused',
      reason: 'not-teacher',
    })
    expect(core.snapshot.state).toBe(before)
  })

  it("changes nothing on a student's attempt to reset an exercise", () => {
    const core = room()
    core.join('t', KEY)
    core.join('s', null)
    // Give the exercise something to lose, so a refusal is distinguishable from a no-op.
    core.handle('t', { t: 'action', action: { t: 'tap', block: 'vocab', target: 'dog' } })
    const before = core.snapshot.state

    expect(core.handle('s', { t: 'action', action: { t: 'reset', block: 'vocab' } })).toEqual({
      kind: 'refused',
      reason: 'not-teacher',
    })
    expect(core.snapshot.state).toBe(before)
  })

  it('still moves the lesson when the teacher navigates', () => {
    const core = room()
    core.join('t', KEY)
    expect(core.handle('t', { t: 'action', action: { t: 'nav', slide: 2 } })).toEqual({
      kind: 'applied',
    })
    expect(core.snapshot.state.slide).toBe(2)
  })

  it('still resets the exercise when the teacher asks', () => {
    const core = room()
    core.join('t', KEY)
    core.handle('t', { t: 'action', action: { t: 'tap', block: 'vocab', target: 'dog' } })
    expect(core.handle('t', { t: 'action', action: { t: 'reset', block: 'vocab' } })).toEqual({
      kind: 'applied',
    })
    expect(core.snapshot.state.blocks['vocab']).toBeUndefined()
    expect(core.snapshot.state.resets['vocab']).toBe(1)
  })

  // The two rules are separate: pacing is always the teacher's, the lock is the stronger
  // and temporary "hands off the exercise itself" (spec: "Steering is not the lock").
  it('leaves an unlocked student free inside the exercise and unable to leave it', () => {
    const core = room()
    core.join('t', KEY)
    core.join('s', null)
    expect(core.locked).toBe(false)

    expect(core.handle('s', { t: 'action', action: { t: 'tap', block: 'vocab', target: 'dog' } })).toEqual({
      kind: 'applied',
    })
    expect(core.handle('s', { t: 'action', action: { t: 'nav', slide: 1 } })).toEqual({
      kind: 'refused',
      reason: 'not-teacher',
    })
    expect(core.snapshot.state.slide).toBe(0)
  })
})

describe('RoomCore enforces the lock (design D14)', () => {
  it("changes nothing on a locked student's action", () => {
    const core = room()
    core.join('t', KEY)
    core.join('s', null)
    core.handle('t', { t: 'lock', value: true })
    const before = core.snapshot.state

    // Inside the exercise, so this measures the lock rather than the pacing rule.
    expect(core.handle('s', { t: 'action', action: { t: 'tap', block: 'vocab', target: 'dog' } })).toEqual({
      kind: 'refused',
      reason: 'locked',
    })
    expect(core.snapshot.state).toBe(before)
  })

  it("still applies the teacher's action while locked", () => {
    const core = room()
    core.join('t', KEY)
    core.handle('t', { t: 'lock', value: true })
    expect(core.handle('t', { t: 'action', action: { t: 'nav', slide: 2 } })).toEqual({
      kind: 'applied',
    })
    expect(core.snapshot.state.slide).toBe(2)
  })

  it("lets the student's next action through once unlocked", () => {
    const core = room()
    core.join('t', KEY)
    core.join('s', null)
    core.handle('t', { t: 'lock', value: true })
    core.handle('t', { t: 'lock', value: false })
    expect(core.handle('s', { t: 'action', action: { t: 'tap', block: 'vocab', target: 'dog' } })).toEqual({
      kind: 'applied',
    })
  })

  it('refuses the lock to a student', () => {
    const core = room()
    core.join('s', null)
    expect(core.handle('s', { t: 'lock', value: true })).toEqual({
      kind: 'refused',
      reason: 'not-teacher',
    })
    expect(core.locked).toBe(false)
  })
})

describe('RoomCore holds the room’s sound setting (design D66)', () => {
  it('parses a mute frame and rejects one that carries no value', () => {
    expect(parseClientMessage('{"t":"mute","value":true}')).toEqual({ t: 'mute', value: true })
    expect(parseClientMessage('{"t":"mute"}')).toBeNull()
    expect(parseClientMessage('{"t":"mute","value":"yes"}')).toBeNull()
  })

  it('opens with sound on', () => {
    const core = room()
    expect(core.muted).toBe(false)
    core.join('t', KEY)
    expect(core.stateMessage('teacher')).toEqual(expect.objectContaining({ muted: false }))
  })

  it("applies the teacher's mute and carries it out on the state message", () => {
    const core = room()
    core.join('t', KEY)
    expect(core.handle('t', { t: 'mute', value: true })).toEqual({ kind: 'applied' })
    expect(core.muted).toBe(true)
    expect(core.stateMessage('student')).toEqual(expect.objectContaining({ muted: true }))
  })

  it('reports no effect when the setting already holds', () => {
    const core = room()
    core.join('t', KEY)
    expect(core.handle('t', { t: 'mute', value: false })).toEqual({
      kind: 'refused',
      reason: 'no-effect',
    })
    core.handle('t', { t: 'mute', value: true })
    expect(core.handle('t', { t: 'mute', value: true })).toEqual({
      kind: 'refused',
      reason: 'no-effect',
    })
  })

  // Spec: "The setting is not the student's" — a student who could quieten the room would
  // be deciding how the lesson is taught.
  it('refuses the setting to a student and leaves it as it was', () => {
    const core = room()
    core.join('t', KEY)
    core.join('s', null)
    core.handle('t', { t: 'mute', value: true })

    expect(core.handle('s', { t: 'mute', value: false })).toEqual({
      kind: 'refused',
      reason: 'not-teacher',
    })
    expect(core.muted).toBe(true)
    expect(core.snapshot.muted).toBe(true)
  })

  // Spec: "Surviving a change of lesson".
  it('keeps the setting when the room changes lesson', () => {
    const core = room()
    core.join('t', KEY)
    core.handle('t', { t: 'mute', value: true })
    core.handle('t', { t: 'switch-lesson', lesson: otherLesson() })

    expect(core.lesson.id).toBe('other')
    expect(core.snapshot.state.slide).toBe(0)
    expect(core.muted).toBe(true)
  })

  // Spec: "The setting is not the lock" — one decides whether the app speaks, the other
  // whether the student may touch the exercise.
  it('is independent of the lock in both directions', () => {
    const core = room()
    core.join('t', KEY)
    core.join('s', null)

    core.handle('t', { t: 'mute', value: true })
    expect(core.locked).toBe(false)
    // The student still plays: quiet is not locked.
    expect(core.handle('s', { t: 'action', action: { t: 'tap', block: 'vocab', target: 'dog' } })).toEqual({
      kind: 'applied',
    })

    core.handle('t', { t: 'lock', value: true })
    expect(core.muted).toBe(true)
    core.handle('t', { t: 'lock', value: false })
    expect(core.muted).toBe(true)
  })
})

describe('a client view reads the room’s sound setting (design D74)', () => {
  const snapshot = testState()

  it('reads a snapshot that carries the setting', () => {
    const view = viewReceive(newClientView(snapshot), {
      t: 'state', state: snapshot, locked: false, muted: true, pen: true, role: 'student',
    })
    expect(view.muted).toBe(true)
  })

  // A Worker built before this change sends no `muted` at all, and sound on is what that
  // build behaves as.
  it('reads a snapshot from an older room as sound on', () => {
    const older = { t: 'state', state: snapshot, locked: false, role: 'student' } as ServerMessage
    expect(viewReceive(newClientView(snapshot), older).muted).toBe(false)
  })
})

describe('RoomCore outlives one lesson (spec: a room outlives any one lesson)', () => {
  it('starts the new lesson fresh at its first exercise', () => {
    const core = room()
    core.join('t', KEY)
    core.handle('t', { t: 'action', action: { t: 'nav', slide: 3 } })

    expect(core.handle('t', { t: 'switch-lesson', lesson: otherLesson() })).toEqual({
      kind: 'applied',
    })
    expect(core.lesson.id).toBe('other')
    expect(core.snapshot.state).toEqual(expect.objectContaining({ lessonId: 'other', slide: 0, v: 0 }))
    expect(core.snapshot.state.blocks).toEqual({})
  })

  it('starts fresh when returning to a lesson played earlier in the session', () => {
    const core = room()
    core.join('t', KEY)
    core.handle('t', { t: 'action', action: { t: 'nav', slide: 4 } })
    core.handle('t', { t: 'switch-lesson', lesson: otherLesson() })
    core.handle('t', { t: 'action', action: { t: 'nav', slide: 2 } })
    core.handle('t', { t: 'switch-lesson', lesson: testLesson() })

    expect(core.snapshot.state.slide).toBe(0)
    expect(core.snapshot.state.blocks).toEqual({})
  })

  it('draws a different presentation order each time it switches, without randomness', () => {
    const seeds = (): number => {
      const core = room()
      core.join('t', KEY)
      core.handle('t', { t: 'switch-lesson', lesson: otherLesson() })
      return core.snapshot.state.seed
    }
    // Deterministic: the same room history always yields the same seed.
    expect(seeds()).toBe(seeds())

    const core = room()
    core.join('t', KEY)
    core.handle('t', { t: 'switch-lesson', lesson: otherLesson() })
    const first = core.snapshot.state.seed
    core.handle('t', { t: 'action', action: { t: 'nav', slide: 1 } })
    core.handle('t', { t: 'switch-lesson', lesson: otherLesson() })
    expect(core.snapshot.state.seed).not.toBe(first)
  })

  it('refuses a lesson switch from a student', () => {
    const core = room()
    core.join('s', null)
    expect(core.handle('s', { t: 'switch-lesson', lesson: otherLesson() })).toEqual({
      kind: 'refused',
      reason: 'not-teacher',
    })
    expect(core.lesson.id).toBe('test')
  })
})

describe('reconcile settles divergence in the room’s favour', () => {
  const local = { ...newLessonState('test', 1), v: 3 }

  it('adopts a snapshot at least as new as the local state', () => {
    const incoming = { ...local, v: 3, slide: 2 }
    expect(reconcile(local, incoming)).toBe(incoming)
    expect(reconcile(local, { ...local, v: 9 }).v).toBe(9)
  })

  it('keeps the local state when a stale snapshot overtakes an action in flight', () => {
    expect(reconcile(local, { ...local, v: 2 })).toBe(local)
  })

  it('always adopts a snapshot for a different lesson', () => {
    const incoming = newLessonState('other', 7)
    expect(reconcile(local, incoming)).toBe(incoming)
  })
})

// ── Ink (design D101, D102, D106, D107) ──────────────────────────────────────

const BLOCK = 'vocab'

function wireStroke(id: string, by: 'teacher' | 'student', done = true, points = [100, 100]) {
  return { id, by, colour: '#ff0000', width: 20, points, done }
}

function joined(): RoomCore {
  const core = room()
  core.join('t', KEY)
  core.join('s', null)
  return core
}

describe('the teacher decides whether the student may draw (design D107)', () => {
  it('opens with the student’s pen granted', () => {
    expect(room().pen).toBe(true)
  })

  it('applies the teacher’s change', () => {
    const core = joined()
    expect(core.handle('t', { t: 'pen', value: false })).toEqual({ kind: 'applied' })
    expect(core.pen).toBe(false)
  })

  it('refuses a student’s attempt to grant herself the pen', () => {
    const core = joined()
    core.handle('t', { t: 'pen', value: false })
    expect(core.handle('s', { t: 'pen', value: true })).toEqual({
      kind: 'refused',
      reason: 'not-teacher',
    })
    expect(core.pen).toBe(false)
  })

  it('refuses a change that changes nothing', () => {
    const core = joined()
    expect(core.handle('t', { t: 'pen', value: true })).toEqual({
      kind: 'refused',
      reason: 'no-effect',
    })
  })

  it('is independent of the lock and of the sound setting', () => {
    const core = joined()
    core.handle('t', { t: 'lock', value: true })
    expect(core.pen).toBe(true)

    core.handle('t', { t: 'pen', value: false })
    expect(core.locked).toBe(true)
    expect(core.muted).toBe(false)

    core.handle('t', { t: 'mute', value: true })
    expect(core.pen).toBe(false)
  })

  it('travels in the state message', () => {
    const core = joined()
    core.handle('t', { t: 'pen', value: false })
    const message = core.stateMessage('student')
    expect(message.t === 'state' && message.pen).toBe(false)
  })
})

describe('a mark is relayed, never reduced (design D101)', () => {
  it('relays an applied stroke with the author the socket had', () => {
    const core = joined()
    const outcome = core.handle('s', {
      t: 'ink',
      op: { t: 'ink', block: BLOCK, stroke: wireStroke('s1', 'teacher') },
    })
    // The stroke claimed the teacher; the socket was the student's, and the socket wins.
    expect(outcome).toMatchObject({ kind: 'ink', by: 'student' })
    expect(core.board[BLOCK]?.[0]?.by).toBe('student')
  })

  it('does not advance the lesson’s version', () => {
    const core = joined()
    const before = core.snapshot.state.v
    core.handle('t', { t: 'ink', op: { t: 'ink', block: BLOCK, stroke: wireStroke('s1', 'teacher') } })
    expect(core.snapshot.state.v).toBe(before)
  })

  it('leaves the state message byte-identical (design D101)', () => {
    const core = joined()
    const before = JSON.stringify(core.stateMessage('student'))
    for (let i = 0; i < 20; i += 1) {
      core.handle('t', {
        t: 'ink',
        op: { t: 'ink', block: BLOCK, stroke: wireStroke(`s${i}`, 'teacher') },
      })
    }
    expect(JSON.stringify(core.stateMessage('student'))).toBe(before)
  })

  it('refuses a student’s mark while the teacher holds the pen', () => {
    const core = joined()
    core.handle('t', { t: 'pen', value: false })
    expect(
      core.handle('s', { t: 'ink', op: { t: 'ink', block: BLOCK, stroke: wireStroke('s1', 'student') } }),
    ).toEqual({ kind: 'refused', reason: 'no-pen' })
    expect(core.board[BLOCK]).toBeUndefined()
  })

  it('leaves the teacher’s own pen alone when the student’s is withdrawn', () => {
    const core = joined()
    core.handle('t', { t: 'pen', value: false })
    expect(
      core.handle('t', { t: 'ink', op: { t: 'ink', block: BLOCK, stroke: wireStroke('s1', 'teacher') } }),
    ).toMatchObject({ kind: 'ink', by: 'teacher' })
  })

  it('refuses an operation that changes nothing', () => {
    const core = joined()
    expect(core.handle('t', { t: 'ink', op: { t: 'ink-undo', block: BLOCK } })).toEqual({
      kind: 'refused',
      reason: 'no-effect',
    })
  })

  it('rejects a stroke whose points do not decode', () => {
    const core = joined()
    const offGrid = { t: 'ink' as const, block: BLOCK, stroke: wireStroke('s1', 'teacher', true, [10, 10, -50, 0]) }
    expect(core.handle('t', { t: 'ink', op: offGrid })).toEqual({
      kind: 'error',
      code: 'bad-message',
    })
  })

  it('discards the marks when the room changes lesson', () => {
    const core = joined()
    core.handle('t', { t: 'ink', op: { t: 'ink', block: BLOCK, stroke: wireStroke('s1', 'teacher') } })
    core.handle('t', { t: 'switch-lesson', lesson: otherLesson() })
    expect(core.board).toEqual({})
  })
})

describe('an unfinished stroke does not outlive the hand drawing it (design D106)', () => {
  it('keeps a completed stroke when its author leaves', () => {
    const core = joined()
    core.handle('t', { t: 'ink', op: { t: 'ink', block: BLOCK, stroke: wireStroke('s1', 'teacher', true) } })
    core.leave('t')
    expect(core.board[BLOCK]?.map((s) => s.id)).toEqual(['s1'])
  })

  it('drops an in-flight stroke when its author leaves', () => {
    const core = joined()
    core.handle('t', { t: 'ink', op: { t: 'ink', block: BLOCK, stroke: wireStroke('s1', 'teacher', false) } })
    core.leave('t')
    expect(core.board[BLOCK]).toBeUndefined()
  })

  it('leaves the other participant’s in-flight stroke alone', () => {
    const core = joined()
    core.handle('t', { t: 'ink', op: { t: 'ink', block: BLOCK, stroke: wireStroke('s1', 'teacher', false) } })
    core.handle('s', { t: 'ink', op: { t: 'ink', block: BLOCK, stroke: wireStroke('s2', 'student', false) } })
    core.leave('t')
    expect(core.board[BLOCK]?.map((s) => s.id)).toEqual(['s2'])
  })

  it('stores only what was finished', () => {
    const core = joined()
    core.handle('t', { t: 'ink', op: { t: 'ink', block: BLOCK, stroke: wireStroke('s1', 'teacher', true) } })
    core.handle('t', { t: 'ink', op: { t: 'ink', block: BLOCK, stroke: wireStroke('s2', 'teacher', false) } })
    expect(core.storable.board[BLOCK]?.map((s) => s.id)).toEqual(['s1'])
    // The live room still shows the one being drawn.
    expect(core.board[BLOCK]).toHaveLength(2)
  })
})

describe('the board reaches a joiner (spec synced-rooms)', () => {
  it('carries the marks made before they arrived', () => {
    const core = room()
    core.join('t', KEY)
    core.handle('t', { t: 'ink', op: { t: 'ink', block: BLOCK, stroke: wireStroke('s1', 'teacher') } })

    core.join('s', null)
    const message = core.boardMessage()
    expect(message.t === 'board' && message.board[BLOCK]?.[0]?.id).toBe('s1')
  })

  it('is empty for a room nobody has drawn on', () => {
    const message = joined().boardMessage()
    expect(message.t === 'board' && message.board).toEqual({})
  })
})

describe('the ink messages parse (design D105)', () => {
  function parsed(value: unknown): ReturnType<typeof parseClientMessage> {
    return parseClientMessage(JSON.stringify(value))
  }

  it('accepts each ink operation', () => {
    expect(parsed({ t: 'ink', op: { t: 'ink', block: 'b', stroke: wireStroke('s1', 'teacher') } })).not.toBeNull()
    expect(parsed({ t: 'ink', op: { t: 'ink-erase', block: 'b', ids: ['s1'] } })).not.toBeNull()
    expect(parsed({ t: 'ink', op: { t: 'ink-undo', block: 'b' } })).not.toBeNull()
    expect(parsed({ t: 'ink', op: { t: 'ink-clear', block: 'b' } })).not.toBeNull()
    expect(parsed({ t: 'pen', value: false })).not.toBeNull()
  })

  it('refuses a colour that is not a colour', () => {
    // It ends up in an SVG attribute; an arbitrary string would be arbitrary CSS.
    const stroke = { ...wireStroke('s1', 'teacher'), colour: 'red; background: url(x)' }
    expect(parsed({ t: 'ink', op: { t: 'ink', block: 'b', stroke } })).toBeNull()
  })

  it('refuses a malformed operation', () => {
    expect(parsed({ t: 'ink' })).toBeNull()
    expect(parsed({ t: 'ink', op: { t: 'ink-undo' } })).toBeNull()
    expect(parsed({ t: 'ink', op: { t: 'nonsense', block: 'b' } })).toBeNull()
    expect(parsed({ t: 'pen' })).toBeNull()
    expect(parsed({ t: 'pen', value: 'yes' })).toBeNull()
  })

  it('refuses a non-integer coordinate at the schema', () => {
    const stroke = { ...wireStroke('s1', 'teacher'), points: [1, 2.5] }
    expect(parsed({ t: 'ink', op: { t: 'ink', block: 'b', stroke } })).toBeNull()
  })

  it('refuses an unbounded stroke', () => {
    const stroke = { ...wireStroke('s1', 'teacher'), points: new Array(20000).fill(1) }
    expect(parsed({ t: 'ink', op: { t: 'ink', block: 'b', stroke } })).toBeNull()
  })

  it('parses an off-grid coordinate but the room refuses it', () => {
    // The schema checks shape; only the running sums can tell that a point lands off the
    // board, and that is the room's answer to give.
    const stroke = wireStroke('s1', 'teacher', true, [10, 10, -50, 0])
    expect(parsed({ t: 'ink', op: { t: 'ink', block: 'b', stroke } })).not.toBeNull()
  })
})

describe('a room stored before drawing existed (design D110)', () => {
  /**
   * The Durable Object's constructor fills in what an older build never wrote. The values
   * below are what that build behaved as: no marks, and the student's pen granted. The
   * adapter's line is `{ ...stored, pen: stored.pen ?? true, board: stored.board ?? {} }`;
   * this exercises the core it hands the result to.
   */
  function storedBeforeInk(): Omit<RoomState, 'pen' | 'board'> {
    return {
      lesson: testLesson(),
      state: testState(),
      locked: false,
      muted: false,
      teacherKey: KEY,
      participants: [],
    }
  }

  it('loads with an empty board and the pen granted', () => {
    const stored = storedBeforeInk() as Partial<RoomState>
    const core = new RoomCore({
      ...(stored as RoomState),
      muted: stored.muted ?? false,
      pen: stored.pen ?? true,
      board: stored.board ?? {},
    })

    expect(core.pen).toBe(true)
    expect(core.board).toEqual({})
  })

  it('reads a snapshot from an older room as the pen granted', () => {
    const snapshot = testState()
    const older = {
      t: 'state', state: snapshot, locked: false, muted: false, role: 'student',
    } as unknown as ServerMessage
    expect(viewReceive(newClientView(snapshot), older).pen).toBe(true)
  })
})
