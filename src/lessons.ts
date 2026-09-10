import { validateLesson } from './shared/validate'
import { WHOLE, narrow, offersChoice, topicOf } from './shared/narrow'
import type { Lesson } from './shared/types'

/** Every lesson file in `lessons/`, picked up at build time. Adding one is a file, not code. */
const modules = import.meta.glob('../lessons/*.json', { eager: true, import: 'default' })

export type LessonLoadFailure = { file: string; errors: string[] }

const loaded: Lesson[] = []
const failures: LessonLoadFailure[] = []

for (const [file, data] of Object.entries(modules)) {
  const result = validateLesson(data)
  if (result.ok) loaded.push(result.lesson)
  else failures.push({ file, errors: result.errors })
}

loaded.sort((a, b) => a.title.localeCompare(b.title))

/** The topics, as written: what the home screen lists and what declares the sizes. */
export const lessons: readonly Lesson[] = loaded
export const lessonFailures: readonly LessonLoadFailure[] = failures

/** A topic by its own id — the file, parts and all. */
export function topicById(id: string): Lesson | undefined {
  return loaded.find((l) => l.id === id)
}

/**
 * A *playable* lesson by its full id: `animals/wild`, or `greetings` for a topic that
 * declares no parts. Narrowing happens here, so what comes back is an ordinary lesson.
 *
 * This is the lookup a room relies on. Both participants resolve the lesson the room is
 * on from their own copy of `lessons/` by the id in the state — the lesson itself never
 * travels over the socket — so every size a teacher can open has to be findable by name.
 */
export function lessonById(id: string): Lesson | undefined {
  const topic = topicById(topicOf(id))
  if (topic === undefined) return undefined
  const choice = id.slice(topic.id.length + 1)
  if (choice === '') return topic.parts === undefined ? narrow(topic) : undefined
  return offersChoice(topic, choice) ? narrow(topic, choice) : undefined
}

/** Every lesson a teacher can open, in the order the home screen offers them. */
export function playableLessons(): Lesson[] {
  return loaded.flatMap((topic) =>
    topic.parts === undefined
      ? [narrow(topic)]
      : [...topic.parts.map((p) => narrow(topic, p.id)), narrow(topic, WHOLE)],
  )
}
