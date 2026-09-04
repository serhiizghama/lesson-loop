/**
 * The Worker: a router and nothing more (design D9). Every rule about how a room
 * behaves lives in `src/shared/room.ts`, which this file only wires a socket to.
 *
 * In this change the Worker serves no client assets — `vite dev` does that and proxies
 * `/api` and `/ws` here (design D17). Publishing is `add-cloudflare-deploy`.
 */

import { Room } from './room'
import { newRoomCode, TEACHER_KEY_BYTES, randomToken } from './codes'
import type { Lesson, LessonState } from '../src/shared/types'

export { Room }

export type Env = {
  ROOMS: DurableObjectNamespace
  /** Overridable so the alarm can be watched expiring without waiting three hours. */
  ROOM_TTL_MS?: string
}

/** A code is claimed, not merely generated, so two rooms can never share one. */
const CLAIM_ATTEMPTS = 8

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  })

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    if (url.pathname === '/api/rooms' && request.method === 'POST') {
      return createRoom(request, env)
    }

    if (url.pathname === '/ws') {
      const code = (url.searchParams.get('room') ?? '').toUpperCase()
      if (code === '') return new Response('room code required', { status: 400 })
      if (request.headers.get('Upgrade') !== 'websocket') {
        return new Response('expected a websocket upgrade', { status: 426 })
      }
      const stub = env.ROOMS.get(env.ROOMS.idFromName(code))
      return stub.fetch(new Request('https://room/ws', request))
    }

    return new Response('not found', { status: 404 })
  },
} satisfies ExportedHandler<Env>

/**
 * A room opens on the lesson the teacher already has open, carrying the progress made
 * so far (spec: "Asking for a room mid-lesson"). The lesson travels with the request
 * because the Worker has no lesson catalogue — see `src/shared/protocol.ts`.
 */
async function createRoom(request: Request, env: Env): Promise<Response> {
  let body: { lesson?: Lesson; state?: LessonState }
  try {
    body = (await request.json()) as typeof body
  } catch {
    return json({ error: 'bad-request' }, 400)
  }
  if (body.lesson === undefined || body.state === undefined) {
    return json({ error: 'lesson and state are required' }, 400)
  }

  const teacherKey = randomToken(TEACHER_KEY_BYTES)

  for (let attempt = 0; attempt < CLAIM_ATTEMPTS; attempt++) {
    const code = newRoomCode()
    const stub = env.ROOMS.get(env.ROOMS.idFromName(code))
    const claimed = await stub.fetch('https://room/claim', {
      method: 'POST',
      body: JSON.stringify({ lesson: body.lesson, state: body.state, teacherKey }),
    })
    if (claimed.status === 201) return json({ code, teacherKey }, 201)
    // 409: that code is a room already. Try another rather than take it over.
  }

  return json({ error: 'could not claim a room code' }, 503)
}
