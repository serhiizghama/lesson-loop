import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { validateLesson } from '../src/shared/validate'

/** Every shipped lesson must validate, so a broken lesson fails in CI, not in a call. */
const dir = join(process.cwd(), 'lessons')
const files = readdirSync(dir).filter((f) => f.endsWith('.json'))

describe('shipped lessons', () => {
  it('there are lessons to ship', () => {
    expect(files.length).toBeGreaterThan(0)
  })

  it.each(files)('%s is valid', (file) => {
    const data = JSON.parse(readFileSync(join(dir, file), 'utf8')) as unknown
    const result = validateLesson(data)
    if (!result.ok) throw new Error(`${file}\n  ${result.errors.join('\n  ')}`)
    expect(result.ok).toBe(true)
  })

  // A file is a topic; `<topic>/<size>` is what `narrow` builds and never what is written.
  it.each(files)('%s declares a topic id, not a size', (file) => {
    const data = JSON.parse(readFileSync(join(dir, file), 'utf8')) as { id: string }
    expect(data.id).not.toContain('/')
  })

  it('lesson ids are unique across files', () => {
    const ids = files.map((f) => {
      const data = JSON.parse(readFileSync(join(dir, f), 'utf8')) as { id: string }
      return data.id
    })
    expect(new Set(ids).size).toBe(ids.length)
  })
})
