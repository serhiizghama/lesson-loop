import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { speakableLines } from '../src/shared/blocks'
import { CLIP_DIR, clips } from '../src/speech/clips'
import type { Lesson } from '../src/shared/types'

/**
 * What the recordings cover, reported rather than enforced.
 *
 * A lesson without clips is allowed by design (D52): it speaks through the device's
 * synthesiser until someone runs `npm run audio`. So a missing clip must not fail the
 * build — it would block shipping a lesson that works. What it must not do is pass
 * *silently*, because a line edited in JSON drops back to the device voice without any
 * visible sign, and that drift is exactly what an author needs told.
 */
const lessonsDir = join(process.cwd(), 'lessons')
const clipsDir = join(process.cwd(), 'public', 'audio')

const lessons = readdirSync(lessonsDir)
  .filter((f) => f.endsWith('.json'))
  .map((file) => ({
    file,
    lesson: JSON.parse(readFileSync(join(lessonsDir, file), 'utf8')) as Lesson,
  }))

describe('clip coverage', () => {
  it.each(lessons.map(({ file, lesson }) => [file, lesson] as const))(
    '%s — every line it speaks is reported',
    (file, lesson) => {
      const lines = speakableLines(lesson)
      const missing = lines.filter((line) => clips[line] === undefined)

      if (missing.length > 0) {
        console.warn(
          `\n  ${file}: ${missing.length} of ${lines.length} lines have no clip and will ` +
            `use the device voice.\n  Run \`npm run audio\` to record them:\n` +
            missing.map((l) => `    ${JSON.stringify(l)}`).join('\n'),
        )
      }
      // Deliberately not an assertion on `missing`: see the note above.
      expect(lines.length).toBeGreaterThan(0)
    },
  )
})

describe('the clips that do exist are usable', () => {
  const ids = Object.values(clips)

  it('the manifest points only at files that are present', () => {
    if (!existsSync(clipsDir)) return
    const orphans = ids.filter((id) => !existsSync(join(clipsDir, `${id}.m4a`)))
    expect(orphans, 'manifest entries with no file — re-run `npm run audio`').toEqual([])
  })

  it('no clip is empty, since a silent hit is worse than a miss', () => {
    if (!existsSync(clipsDir)) return
    const empty = ids.filter((id) => {
      const path = join(clipsDir, `${id}.m4a`)
      return existsSync(path) && statSync(path).size === 0
    })
    expect(empty).toEqual([])
  })

  it('names each clip once, so two lines never share a recording', () => {
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('serves clips from a path the assets layer will handle, not the bundle', () => {
    // `public/` is copied verbatim into `dist/`, which the Worker serves through its
    // assets binding — bundled bytes would count against its size limit instead.
    expect(CLIP_DIR).toBe('/audio')
  })
})
