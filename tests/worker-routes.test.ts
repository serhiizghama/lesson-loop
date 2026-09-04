import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { WORKER_PATHS } from '../worker/index'

/**
 * One Worker serves the client and the room (design D46), and anything the assets layer
 * has not been told to leave alone is answered with the app's own page and a 200 — which
 * is exactly what makes a pasted student link work (design D47).
 *
 * That leaves one silent failure: a route added to the Worker but not to
 * `run_worker_first`. Nothing throws, nothing fails to build, every page still loads, and
 * `createRoom` receives HTML where it expected JSON. It would be found by a teacher whose
 * Invite button stopped working. So the two lists are checked against each other here
 * (design D48, spec "A new room address cannot be quietly lost").
 */
const root = process.cwd()

/** JSONC minus its comments. String literals are left alone, so `https://` survives. */
function stripComments(source: string): string {
  let out = ''
  let inString = false
  let inLine = false
  let inBlock = false
  for (let i = 0; i < source.length; i++) {
    const c = source[i]
    const next = source[i + 1]
    if (inLine) {
      if (c === '\n') {
        inLine = false
        out += c
      }
    } else if (inBlock) {
      if (c === '*' && next === '/') {
        inBlock = false
        i++
      }
    } else if (inString) {
      out += c
      if (c === '\\') {
        out += next
        i++
      } else if (c === '"') inString = false
    } else if (c === '"') {
      inString = true
      out += c
    } else if (c === '/' && next === '/') {
      inLine = true
      i++
    } else if (c === '/' && next === '*') {
      inBlock = true
      i++
    } else out += c
  }
  return out
}

/** A Cloudflare route pattern, as a matcher over a path. `*` stands for any run. */
function matches(pattern: string, path: string): boolean {
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')
  return new RegExp(`^${escaped}$`).test(path)
}

const config = JSON.parse(stripComments(readFileSync(join(root, 'wrangler.jsonc'), 'utf8')))
const runWorkerFirst: unknown = config.assets?.run_worker_first

describe('the assets layer is told to let the room through', () => {
  it('wrangler.jsonc serves the built client', () => {
    expect(config.assets?.directory).toBe('./dist')
  })

  it('an address with no file behind it returns the app', () => {
    expect(config.assets?.not_found_handling).toBe('single-page-application')
  })

  it('run_worker_first is a list of paths, not a blanket true', () => {
    // `true` would work and would route every icon through the Worker (design D47).
    expect(Array.isArray(runWorkerFirst), 'run_worker_first must be a list of patterns').toBe(true)
  })

  it('the Worker answers on at least one path', () => {
    expect(WORKER_PATHS.length).toBeGreaterThan(0)
  })

  for (const path of WORKER_PATHS) {
    it(`${path} reaches the Worker rather than the app's page`, () => {
      const patterns = (runWorkerFirst as string[]) ?? []
      const covering = patterns.filter((pattern) => matches(pattern, path))
      expect(
        covering.length,
        `the Worker answers on ${path}, but no run_worker_first pattern in wrangler.jsonc covers it — ` +
          `the assets layer would answer it with index.html and a 200`,
      ).toBeGreaterThan(0)
    })
  }
})
