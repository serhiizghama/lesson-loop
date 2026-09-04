import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * `src/shared` is bundled into the Cloudflare Worker in the next change (design D1).
 * Nothing in it may reach for React or the DOM. No compiler enforces that, so this does.
 */
const SHARED = join(process.cwd(), 'src/shared')

const FORBIDDEN_IMPORTS = [/from\s+['"]react['"]/, /from\s+['"]react-dom/, /from\s+['"]@\/ui/]
const FORBIDDEN_GLOBALS = [
  /\bdocument\s*\./,
  /\bwindow\s*\./,
  /\bnavigator\s*\./,
  /\blocalStorage\b/,
  /\bspeechSynthesis\b/,
]

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) return sourceFiles(path)
    if (!path.endsWith('.ts') && !path.endsWith('.tsx')) return []
    if (path.endsWith('.test.ts')) return []
    return [path]
  })
}

/** Comments may talk about the browser; code may not touch it. */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
}

describe('src/shared stays runnable in a Worker', () => {
  const files = sourceFiles(SHARED)

  it('has files to check', () => {
    expect(files.length).toBeGreaterThan(5)
  })

  // The glob is recursive and extension-based, so it is easy to believe it covers a new
  // file when it does not. The room core is the one that would hurt most to miss.
  it('covers the room core and the protocol', () => {
    const covered = files.map((f) => f.slice(SHARED.length + 1))
    expect(covered).toContain('room.ts')
    expect(covered).toContain('protocol.ts')
  })

  it.each(files)('%s imports no UI framework', (file) => {
    const code = stripComments(readFileSync(file, 'utf8'))
    for (const pattern of FORBIDDEN_IMPORTS) {
      expect(pattern.test(code), `${file} must not import ${pattern}`).toBe(false)
    }
  })

  it.each(files)('%s touches no DOM global', (file) => {
    const code = stripComments(readFileSync(file, 'utf8'))
    for (const pattern of FORBIDDEN_GLOBALS) {
      expect(pattern.test(code), `${file} must not use ${pattern}`).toBe(false)
    }
  })
})
