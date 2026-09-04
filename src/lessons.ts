import { validateLesson } from './shared/validate'
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

export const lessons: readonly Lesson[] = loaded
export const lessonFailures: readonly LessonLoadFailure[] = failures

export function lessonById(id: string): Lesson | undefined {
  return loaded.find((l) => l.id === id)
}
