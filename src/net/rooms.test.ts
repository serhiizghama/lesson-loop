import { afterEach, describe, expect, it, vi } from 'vitest'
import { createRoom } from './rooms'
import { createLessonState } from '@/shared/reducer'
import type { Lesson } from '@/shared/types'

/**
 * Opening a room can be refused rather than broken (design D49). The teacher sees
 * whatever this throws, so the two cases must not read alike: one is "wait a moment", the
 * other is "something is wrong with the service" (spec: "A refusal does not cost the
 * lesson").
 */
const lesson = { id: 'colours', title: 'Colours', audience: 'kids', l1: null, items: [], blocks: [] } as unknown as Lesson
const state = createLessonState('colours')

function answering(status: number, body: unknown = {}): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })),
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('opening a room', () => {
  it('returns the code and the key when the room is opened', async () => {
    answering(201, { code: 'AB12', teacherKey: 'k' })

    await expect(createRoom(lesson, state)).resolves.toEqual({ code: 'AB12', teacherKey: 'k' })
  })

  it('reports being asked to wait as being asked to wait', async () => {
    answering(429, { error: 'too-many-rooms' })

    await expect(createRoom(lesson, state)).rejects.toThrow(/too quickly/)
  })

  it('does not report a refusal as the service answering with a number', async () => {
    answering(429, { error: 'too-many-rooms' })

    await expect(createRoom(lesson, state)).rejects.not.toThrow(/429/)
  })

  it('still reports a real service failure with its status', async () => {
    answering(503)

    await expect(createRoom(lesson, state)).rejects.toThrow(/503/)
  })

  it('reports an answer it cannot read as unexpected', async () => {
    answering(201, { nothing: 'useful' })

    await expect(createRoom(lesson, state)).rejects.toThrow(/unexpected/)
  })
})
