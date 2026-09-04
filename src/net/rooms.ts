import type { Lesson, LessonState } from '@/shared/types'

/**
 * Opening a room. This is the only request the app makes that is not a socket, and it
 * happens exactly once per room — when the teacher asks to invite a student, never on
 * opening a lesson (spec: "A room is opened deliberately, never imposed").
 */
export type OpenedRoom = { code: string; teacherKey: string }

export async function createRoom(lesson: Lesson, state: LessonState): Promise<OpenedRoom> {
  // The lesson travels with the request: the Worker has no catalogue of its own, which
  // is what keeps a new lesson a file in `lessons/` rather than a deploy.
  const response = await fetch('/api/rooms', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ lesson, state }),
  })
  if (!response.ok) throw new Error(`the room service answered ${response.status}`)

  const body = (await response.json()) as Partial<OpenedRoom>
  if (typeof body.code !== 'string' || typeof body.teacherKey !== 'string') {
    throw new Error('the room service answered with something unexpected')
  }
  return { code: body.code, teacherKey: body.teacherKey }
}
