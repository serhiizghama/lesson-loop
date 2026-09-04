import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { createRoom, type Env, type RateLimiter } from '../worker/index'
import { createLessonState } from '../src/shared/reducer'
import { loadLesson, lessonFiles } from './support/play'

/**
 * Opening a room takes no account and no name (spec `synced-rooms`), and each request
 * makes a Durable Object, so the endpoint is bounded (design D49). The limiter is faked
 * here the way the speech engine is faked in its own tests: the point is the decision
 * this Worker makes about the answer, not the platform's counter.
 */
const lesson = loadLesson(lessonFiles[0]!)
const body = () => JSON.stringify({ lesson, state: createLessonState(lesson.id) })

const ask = (ip = '203.0.113.7') =>
  new Request('https://lesson-loop.example/api/rooms', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'CF-Connecting-IP': ip },
    body: body(),
  })

/** A room namespace that claims any code first time, so the limiter is what is under test. */
function fakeRooms(claimed: string[] = []): Env['ROOMS'] {
  return {
    idFromName: (name: string) => name,
    get: (name: string) => ({
      fetch: async () => {
        claimed.push(String(name))
        return new Response(null, { status: 201 })
      },
    }),
  } as unknown as Env['ROOMS']
}

const limiter = (impl: RateLimiter['limit']): RateLimiter => ({ limit: impl })

const allows = limiter(async () => ({ success: true }))
const refuses = limiter(async () => ({ success: false }))
const broken = limiter(async () => {
  throw new Error('the limiter is unavailable')
})

describe('a room may be opened at a teaching pace', () => {
  it('creates the room when the limiter allows it', async () => {
    const response = await createRoom(ask(), { ROOMS: fakeRooms(), ROOM_LIMIT: allows })

    expect(response.status).toBe(201)
    const opened = (await response.json()) as { code?: string; teacherKey?: string }
    expect(typeof opened.code).toBe('string')
    expect(typeof opened.teacherKey).toBe('string')
  })

  it('keys the limit on the calling address, so one caller cannot spend another’s', async () => {
    const keys: string[] = []
    const watching = limiter(async ({ key }) => {
      keys.push(key)
      return { success: true }
    })

    await createRoom(ask('203.0.113.7'), { ROOMS: fakeRooms(), ROOM_LIMIT: watching })
    await createRoom(ask('198.51.100.4'), { ROOMS: fakeRooms(), ROOM_LIMIT: watching })

    expect(keys).toEqual(['203.0.113.7', '198.51.100.4'])
  })
})

describe('asking far faster than a lesson could need is refused', () => {
  it('answers 429 rather than opening the room', async () => {
    const response = await createRoom(ask(), { ROOMS: fakeRooms(), ROOM_LIMIT: refuses })

    expect(response.status).toBe(429)
  })

  it('says why, in a body the client can tell from a service failure', async () => {
    const response = await createRoom(ask(), { ROOMS: fakeRooms(), ROOM_LIMIT: refuses })

    expect(await response.json()).toEqual({ error: 'too-many-rooms' })
  })

  it('does not touch the Durable Object it is protecting', async () => {
    const claimed: string[] = []
    await createRoom(ask(), { ROOMS: fakeRooms(claimed), ROOM_LIMIT: refuses })

    expect(claimed, 'a refused request must not create the thing the limit protects').toEqual([])
  })
})

describe('the limit never becomes the reason a lesson cannot start', () => {
  it('opens the room anyway when the limiter itself throws (design D49, fails open)', async () => {
    const response = await createRoom(ask(), { ROOMS: fakeRooms(), ROOM_LIMIT: broken })

    expect(response.status).toBe(201)
  })

  it('opens the room anyway when the binding is missing altogether', async () => {
    const env = { ROOMS: fakeRooms() } as unknown as Env
    const response = await createRoom(ask(), env)

    expect(response.status).toBe(201)
  })
})

describe('the limit is declared where the platform will read it', () => {
  const config = readFileSync(join(process.cwd(), 'wrangler.jsonc'), 'utf8')

  it('wrangler.jsonc binds ROOM_LIMIT', () => {
    expect(config).toContain('"name": "ROOM_LIMIT"')
  })

  it('at a period the platform accepts', () => {
    // The binding takes 10 or 60 seconds and nothing else; a typo here is silent.
    expect(config).toMatch(/"period":\s*(10|60)\b/)
  })
})
