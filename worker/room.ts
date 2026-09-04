/**
 * The Durable Object: a socket adapter over `RoomCore` (design D9).
 *
 * It owns three things the room core deliberately does not — the sockets, the storage,
 * and the clock — and no rules at all. Everything it decides, it decides by asking
 * `RoomCore` and doing what the returned `Outcome` says.
 */

import { RoomCore, type RoomState } from '../src/shared/room'
import { parseClientMessage, type ServerMessage } from '../src/shared/protocol'
import type { Env } from './index'
import { randomToken } from './codes'

/** A teaching session is an hour; three hours is comfortably past the end of one. */
const DEFAULT_TTL_MS = 3 * 60 * 60 * 1000

const STORAGE_KEY = 'room'

type Socket = { id: string; ws: WebSocket; gone: boolean }

export class Room implements DurableObject {
  #ctx: DurableObjectState
  #env: Env
  #core: RoomCore | null = null
  #sockets: Socket[] = []

  constructor(ctx: DurableObjectState, env: Env) {
    this.#ctx = ctx
    this.#env = env
    // A Durable Object with no open socket is evicted, and a teacher reloading her tab
    // is the likeliest thing to happen in a first real lesson (design D11).
    ctx.blockConcurrencyWhile(async () => {
      const stored = await ctx.storage.get<RoomState>(STORAGE_KEY)
      if (stored !== undefined) this.#core = new RoomCore(stored)
    })
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    if (url.pathname === '/claim') return this.#claim(request)
    if (url.pathname === '/ws') return this.#open()
    return new Response('not found', { status: 404 })
  }

  /** The room's lifetime, rescheduled on every action (design D11). */
  async alarm(): Promise<void> {
    for (const socket of this.#sockets) this.#close(socket, 'no-such-room')
    this.#sockets = []
    this.#core = null
    await this.#ctx.storage.deleteAll()
  }

  /**
   * Claiming is what makes `idFromName` safe to use for a short code: a second claim of
   * a code already in play is refused, and the Worker tries another one.
   */
  async #claim(request: Request): Promise<Response> {
    if (this.#core !== null) return new Response('taken', { status: 409 })

    const body = (await request.json()) as Pick<RoomState, 'lesson' | 'state' | 'teacherKey'>
    this.#core = RoomCore.open(body.lesson, body.state, body.teacherKey)
    await this.#persist()
    return new Response('created', { status: 201 })
  }

  #open(): Response {
    const pair = new WebSocketPair()
    const client = pair[0]
    const server = pair[1]
    server.accept()

    // An unknown or expired code is answered on the socket rather than as a failed
    // upgrade, so the page can tell "no such room" from "the network is down" (3.5).
    if (this.#core === null) {
      send(server, { t: 'error', code: 'no-such-room' })
      server.close(4404, 'no-such-room')
      return new Response(null, { status: 101, webSocket: client })
    }

    const socket: Socket = { id: randomToken(8), ws: server, gone: false }
    server.addEventListener('message', (event) => {
      void this.#receive(socket, event.data)
    })
    server.addEventListener('close', () => void this.#gone(socket))
    server.addEventListener('error', () => void this.#gone(socket))

    return new Response(null, { status: 101, webSocket: client })
  }

  async #receive(socket: Socket, data: string | ArrayBuffer): Promise<void> {
    const core = this.#core
    if (core === null) return

    const message = parseClientMessage(typeof data === 'string' ? data : '')
    if (message === null) {
      send(socket.ws, { t: 'error', code: 'bad-message' })
      return
    }

    // `hello` is the join: the role comes from the key it carries, never from the route.
    if (message.t === 'hello') {
      const joined = core.join(socket.id, message.key ?? null)
      if (!joined.ok) {
        send(socket.ws, { t: 'error', code: joined.code })
        this.#close(socket, joined.code)
        return
      }
      this.#sockets.push(socket)
      send(socket.ws, core.stateMessage(joined.role))
      this.#broadcast(core.peersMessage())
      await this.#persist()
      return
    }

    const outcome = core.handle(socket.id, message)
    if (outcome.kind === 'applied') {
      this.#broadcastState()
      await this.#persist()
      return
    }
    if (outcome.kind === 'refused') {
      send(socket.ws, { t: 'refused', reason: outcome.reason })
      // A refusal is also how a device that ran ahead learns the truth, so the room's
      // account of the state goes back with it.
      const role = core.roleOf(socket.id)
      if (role !== null) send(socket.ws, core.stateMessage(role))
      return
    }
    if (outcome.kind === 'error') send(socket.ws, { t: 'error', code: outcome.code })
  }

  async #gone(socket: Socket): Promise<void> {
    // `close` and `error` both fire for a tab that simply went away.
    if (socket.gone) return
    socket.gone = true
    const core = this.#core
    this.#sockets = this.#sockets.filter((s) => s !== socket)
    if (core === null) return
    core.leave(socket.id)
    this.#broadcast(core.peersMessage())
    await this.#persist()
  }

  /** Every participant gets the whole state, addressed to their own role (design D10). */
  #broadcastState(): void {
    const core = this.#core
    if (core === null) return
    for (const socket of this.#sockets) {
      const role = core.roleOf(socket.id)
      if (role !== null) send(socket.ws, core.stateMessage(role))
    }
  }

  #broadcast(message: ServerMessage): void {
    for (const socket of this.#sockets) send(socket.ws, message)
  }

  #close(socket: Socket, reason: string): void {
    try {
      socket.ws.close(4404, reason)
    } catch {
      // Already gone; nothing to close.
    }
  }

  async #persist(): Promise<void> {
    if (this.#core === null) return
    await this.#ctx.storage.put(STORAGE_KEY, this.#core.snapshot)
    await this.#ctx.storage.setAlarm(Date.now() + this.#ttl())
  }

  #ttl(): number {
    const configured = Number(this.#env.ROOM_TTL_MS)
    return Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_TTL_MS
  }
}

function send(ws: WebSocket, message: ServerMessage): void {
  try {
    ws.send(JSON.stringify(message))
  } catch {
    // A socket that closed between the decision and the write; `close` will clean up.
  }
}
