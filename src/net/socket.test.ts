import { describe, expect, it } from 'vitest'
import {
  BACKOFF_BASE_MS, BACKOFF_CEILING_MS, FAILURES_BEFORE_WARNING, RoomSocket, backoffDelay,
  type Connection, type SocketLike,
} from './socket'
import type { ClientMessage, ServerMessage } from '@/shared/protocol'

/** A socket that opens, closes and delivers only when the test says so. */
class FakeSocket implements SocketLike {
  sent: string[] = []
  closed = false
  onopen: SocketLike['onopen'] = null
  onclose: SocketLike['onclose'] = null
  onerror: SocketLike['onerror'] = null
  onmessage: SocketLike['onmessage'] = null

  send(data: string): void {
    this.sent.push(data)
  }

  close(): void {
    this.closed = true
  }

  arrive(): void {
    this.onopen?.call(this, {})
  }

  drop(): void {
    this.onclose?.call(this, {})
  }

  deliver(message: ServerMessage): void {
    this.onmessage?.call(this, { data: JSON.stringify(message) })
  }
}

/** A clock that only moves when the test moves it. */
function harness(hello: ClientMessage = { t: 'hello', room: 'AB12' }) {
  const sockets: FakeSocket[] = []
  const delays: number[] = []
  const messages: ServerMessage[] = []
  const connections: Connection[] = []
  let pending: (() => void) | null = null

  const socket = new RoomSocket({
    url: 'wss://room/ws?room=AB12',
    hello,
    onMessage: (m) => messages.push(m),
    onConnection: (c) => connections.push(c),
    open: () => {
      const fake = new FakeSocket()
      sockets.push(fake)
      return fake
    },
    setTimer: (fn, ms) => {
      delays.push(ms)
      pending = fn
      return delays.length
    },
    clearTimer: () => {
      pending = null
    },
    // No jitter, so the schedule can be read exactly. Jitter has its own test.
    random: () => 0.5,
  })

  return {
    socket,
    sockets,
    delays,
    messages,
    connections,
    latest: () => sockets[sockets.length - 1]!,
    tick: () => {
      const fn = pending
      pending = null
      fn?.()
    },
  }
}

describe('backoffDelay', () => {
  it('doubles from half a second to a ten-second ceiling', () => {
    const plain = (attempt: number) => backoffDelay(attempt, () => 0.5)
    expect(plain(0)).toBe(BACKOFF_BASE_MS)
    expect(plain(1)).toBe(1000)
    expect(plain(2)).toBe(2000)
    expect(plain(3)).toBe(4000)
    expect(plain(4)).toBe(8000)
    expect(plain(5)).toBe(BACKOFF_CEILING_MS)
    expect(plain(50)).toBe(BACKOFF_CEILING_MS)
  })

  it('jitters within a quarter either side, so two devices do not collide', () => {
    expect(backoffDelay(2, () => 0)).toBe(1500)
    expect(backoffDelay(2, () => 1)).toBe(2500)
  })
})

describe('RoomSocket', () => {
  it('claims its role the moment the socket opens', () => {
    const h = harness({ t: 'hello', room: 'AB12', key: 'secret' })
    h.socket.start()
    h.latest().arrive()

    expect(JSON.parse(h.latest().sent[0]!)).toEqual({ t: 'hello', room: 'AB12', key: 'secret' })
    expect(h.connections.at(-1)).toEqual({ connected: true, failures: 0, unsynced: false })
  })

  it('hands on a room message and ignores a frame it cannot read', () => {
    const h = harness()
    h.socket.start()
    h.latest().arrive()

    h.latest().deliver({ t: 'peers', peers: { teacher: true, students: 1 } })
    h.latest().onmessage?.call(null, { data: 'not json' })
    h.latest().onmessage?.call(null, { data: JSON.stringify({ t: 'nonsense' }) })

    expect(h.messages).toEqual([{ t: 'peers', peers: { teacher: true, students: 1 } }])
  })

  it('follows the backoff schedule across repeated failures', () => {
    const h = harness()
    h.socket.start()

    for (let i = 0; i < 6; i++) {
      h.latest().drop()
      h.tick()
    }
    expect(h.delays).toEqual([500, 1000, 2000, 4000, 8000, 10000])
  })

  it('never stops retrying (design D18)', () => {
    const h = harness()
    h.socket.start()

    for (let i = 0; i < 200; i++) {
      h.latest().drop()
      h.tick()
    }
    expect(h.sockets).toHaveLength(201)
    expect(h.delays.at(-1)).toBe(BACKOFF_CEILING_MS)
  })

  it('says nothing about sync until the third consecutive failure', () => {
    const h = harness()
    h.socket.start()

    for (let i = 0; i < FAILURES_BEFORE_WARNING; i++) {
      h.latest().drop()
      h.tick()
    }
    expect(h.connections.map((c) => c.unsynced)).toEqual([false, false, true])
    expect(h.connections.at(-1)?.failures).toBe(FAILURES_BEFORE_WARNING)
  })

  it('clears the warning and starts the schedule over on a successful connection', () => {
    const h = harness()
    h.socket.start()
    for (let i = 0; i < 4; i++) {
      h.latest().drop()
      h.tick()
    }
    h.latest().arrive()
    expect(h.connections.at(-1)).toEqual({ connected: true, failures: 0, unsynced: false })

    h.latest().drop()
    expect(h.delays.at(-1)).toBe(BACKOFF_BASE_MS)
  })

  it('drops a message sent while the socket is down rather than queueing it', () => {
    const h = harness()
    h.socket.start()
    h.latest().arrive()
    const open = h.latest()
    open.drop()

    h.socket.send({ t: 'lock', value: true })
    h.tick()
    h.latest().arrive()

    expect(h.latest().sent.map((s) => JSON.parse(s).t)).toEqual(['hello'])
  })

  it('stops for good when told to', () => {
    const h = harness()
    h.socket.start()
    h.latest().arrive()
    h.socket.stop()

    expect(h.latest().closed).toBe(true)
    h.latest().drop()
    h.tick()
    expect(h.sockets).toHaveLength(1)
  })
})
