/**
 * The socket to a room, and its reconnection (design D18).
 *
 * Every dependency on the world — the socket constructor, the timer, the source of
 * jitter — is injected, because the thing worth testing here is the retry schedule and
 * a schedule tested through a real socket is a schedule tested with a stopwatch.
 */

import { parseServerMessage, type ClientMessage, type ServerMessage } from '@/shared/protocol'

/** From about half a second… */
export const BACKOFF_BASE_MS = 500
/** …to about ten, and never further. A lesson lasts an hour; connections come back. */
export const BACKOFF_CEILING_MS = 10_000
/** "Working without sync" appears on the third failure, not the first (design D18). */
export const FAILURES_BEFORE_WARNING = 3

/** The part of `WebSocket` this module uses, so a test can be a plain object. */
export type SocketLike = {
  send(data: string): void
  close(): void
  onopen: ((this: unknown, ev: unknown) => unknown) | null
  onclose: ((this: unknown, ev: unknown) => unknown) | null
  onerror: ((this: unknown, ev: unknown) => unknown) | null
  onmessage: ((this: unknown, ev: { data: unknown }) => unknown) | null
}

export type Connection = {
  /** Whether a socket is open right now. */
  connected: boolean
  /** Consecutive failures since the last successful connection. */
  failures: number
  /** Whether the participant should be told they are working unsynced. */
  unsynced: boolean
}

export type RoomSocketOptions = {
  url: string
  /** Sent the moment the socket opens; it is what claims a role. */
  hello: ClientMessage
  onMessage: (message: ServerMessage) => void
  onConnection: (connection: Connection) => void
  /** Everything below is injected for testing and defaults to the browser's own. */
  open?: (url: string) => SocketLike
  setTimer?: (fn: () => void, ms: number) => number
  clearTimer?: (handle: number) => void
  random?: () => number
}

/**
 * Exponential with jitter. The jitter is a band around the delay rather than a draw
 * from zero to it: two devices reconnecting together should not collide, and a teacher
 * watching a dead room should not see an unpredictable wait.
 */
export function backoffDelay(attempt: number, random: () => number): number {
  const step = Math.min(BACKOFF_CEILING_MS, BACKOFF_BASE_MS * 2 ** Math.max(0, attempt))
  return Math.round(step * (0.75 + random() * 0.5))
}

export function connectionOf(connected: boolean, failures: number): Connection {
  return { connected, failures, unsynced: !connected && failures >= FAILURES_BEFORE_WARNING }
}

export class RoomSocket {
  #options: RoomSocketOptions
  #open: (url: string) => SocketLike
  #setTimer: (fn: () => void, ms: number) => number
  #clearTimer: (handle: number) => void
  #random: () => number

  #socket: SocketLike | null = null
  #timer: number | null = null
  #failures = 0
  #closed = false

  constructor(options: RoomSocketOptions) {
    this.#options = options
    this.#open = options.open ?? ((url) => new WebSocket(url) as unknown as SocketLike)
    this.#setTimer = options.setTimer ?? ((fn, ms) => globalThis.setTimeout(fn, ms) as unknown as number)
    this.#clearTimer = options.clearTimer ?? ((handle) => globalThis.clearTimeout(handle))
    this.#random = options.random ?? Math.random
  }

  get connected(): boolean {
    return this.#socket !== null
  }

  start(): void {
    this.#closed = false
    this.#connect()
  }

  /**
   * A message is dropped rather than queued while the socket is down. The room is the
   * authority, and on reconnect its state is adopted whole — a queue would replay taps
   * into a lesson that has moved on.
   */
  send(message: ClientMessage): void {
    this.#socket?.send(JSON.stringify(message))
  }

  /** Deliberate closing: no reconnect follows. */
  stop(): void {
    this.#closed = true
    if (this.#timer !== null) this.#clearTimer(this.#timer)
    this.#timer = null
    const socket = this.#socket
    this.#socket = null
    socket?.close()
  }

  #connect(): void {
    if (this.#closed) return

    let socket: SocketLike
    try {
      socket = this.#open(this.#options.url)
    } catch {
      this.#lost()
      return
    }

    socket.onopen = () => {
      if (this.#closed) {
        socket.close()
        return
      }
      this.#socket = socket
      this.#failures = 0
      socket.send(JSON.stringify(this.#options.hello))
      this.#options.onConnection(connectionOf(true, 0))
    }

    socket.onmessage = (event) => {
      if (typeof event.data !== 'string') return
      const message = parseServerMessage(event.data)
      if (message !== null) this.#options.onMessage(message)
    }

    socket.onclose = () => {
      if (this.#socket === socket) this.#socket = null
      this.#lost()
    }

    socket.onerror = () => {
      // A failure to open arrives as an error with no close on some browsers.
      if (this.#socket === socket) return
      socket.onopen = null
      socket.onclose = null
      socket.onerror = null
      this.#lost()
    }
  }

  /** Retries for as long as the page is open: a lesson outlasts most outages. */
  #lost(): void {
    if (this.#closed) return
    if (this.#timer !== null) return

    this.#failures++
    this.#options.onConnection(connectionOf(false, this.#failures))
    const delay = backoffDelay(this.#failures - 1, this.#random)
    this.#timer = this.#setTimer(() => {
      this.#timer = null
      this.#connect()
    }, delay)
  }
}
