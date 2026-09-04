/**
 * The Worker: a router and nothing more (design D9). Every rule about how a room
 * behaves lives in `src/shared/room.ts`, which this file only wires a socket to.
 *
 * The same Worker now also serves the built client, through the assets binding in
 * wrangler.jsonc (design D46). Anything that is not one of the paths below is answered
 * by the assets layer — a file if there is one, otherwise the app's own page, which is
 * what makes a student's link work when it is opened cold (design D47).
 */

import { Room } from './room'
import { newRoomCode, TEACHER_KEY_BYTES, randomToken } from './codes'
import type { Lesson, LessonState } from '../src/shared/types'

export { Room }

/** The platform's rate limiter, as much of it as this Worker uses (design D49). */
export type RateLimiter = { limit(options: { key: string }): Promise<{ success: boolean }> }

export type Env = {
  ROOMS: DurableObjectNamespace
  /** Bounds how often rooms may be asked for from one address (design D49). */
  ROOM_LIMIT: RateLimiter
  /** Overridable so the alarm can be watched expiring without waiting three hours. */
  ROOM_TTL_MS?: string
}

/** A code is claimed, not merely generated, so two rooms can never share one. */
const CLAIM_ATTEMPTS = 8

/**
 * Whether this caller may open a room now (design D49). Asked before a code is claimed,
 * so a refused request never makes the Durable Object the limit exists to protect.
 *
 * **It fails open.** A limiter that is unavailable, or that throws, lets the room through:
 * this guards a quota, and a mechanism guarding a quota may never become the reason a
 * lesson cannot start (principle 4). The exposure is a rare error path; the loss is
 * bounded by the quota it was guarding.
 */
async function mayOpenARoom(request: Request, env: Env): Promise<boolean> {
  try {
    const key = request.headers.get('CF-Connecting-IP') ?? 'unknown'
    const { success } = await env.ROOM_LIMIT.limit({ key })
    return success
  } catch {
    return true
  }
}

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  })

const notFound = (): Response => new Response('not found', { status: 404 })

type Handler = (request: Request, env: Env, url: URL) => Response | Promise<Response>

/**
 * Every path this Worker answers on, and what answers it.
 *
 * Routing from a table rather than from a chain of comparisons is what lets a test see
 * the list at all, and a route cannot be added without appearing in it. That matters
 * because the assets layer answers anything `run_worker_first` has not been told about
 * with the app's own page and a 200 (design D47): a route added here but not there would
 * never reach this file, and the caller would get HTML where it expected JSON — with
 * every page still loading perfectly. `tests/worker-routes.test.ts` holds the two lists
 * in step (design D48).
 */
const ROUTES: Record<string, Handler> = {
  '/api/rooms': (request, env) => (request.method === 'POST' ? createRoom(request, env) : notFound()),

  '/ws': (request, env, url) => {
    const code = (url.searchParams.get('room') ?? '').toUpperCase()
    if (code === '') return new Response('room code required', { status: 400 })
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('expected a websocket upgrade', { status: 426 })
    }
    const stub = env.ROOMS.get(env.ROOMS.idFromName(code))
    return stub.fetch(new Request('https://room/ws', request))
  },
}

/** The paths above, for the test that checks wrangler.jsonc lets every one of them through. */
export const WORKER_PATHS: readonly string[] = Object.keys(ROUTES)

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    const route = ROUTES[url.pathname]
    return route === undefined ? notFound() : route(request, env, url)
  },
} satisfies ExportedHandler<Env>

/**
 * A room opens on the lesson the teacher already has open, carrying the progress made
 * so far (spec: "Asking for a room mid-lesson"). The lesson travels with the request
 * because the Worker has no lesson catalogue — see `src/shared/protocol.ts`.
 */
export async function createRoom(request: Request, env: Env): Promise<Response> {
  if (!(await mayOpenARoom(request, env))) {
    return json({ error: 'too-many-rooms' }, 429)
  }

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
