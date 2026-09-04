import { describe, expect, it } from 'vitest'
import { APP_NAME, buildLine, buildStamp, buildVersion } from './version'

/**
 * The version is derived at build time and there is no second place that records it, so
 * the only thing that can be wrong is the shape of the string — and what happens when the
 * history it counts is not there. Both are testable without a repository, which is why
 * the git call lives in `vite.config.ts` and not here (design D59).
 */
describe('the version counts the commits behind it', () => {
  it('puts the count where the patch goes', () => {
    expect(buildVersion('0.1.0', 16)).toBe('0.1.16')
  })

  it('replaces the base’s last part rather than appending to it', () => {
    // `0.1.0` + 16 is `0.1.16`, never `0.1.0.16`.
    expect(buildVersion('0.1.7', 16)).toBe('0.1.16')
  })

  it('follows the base when its minor is raised by hand', () => {
    expect(buildVersion('0.2.0', 400)).toBe('0.2.400')
  })

  it('handles the first commit of an empty history', () => {
    expect(buildVersion('0.1.0', 0)).toBe('0.1.0')
  })

  it('keeps a base that carries more than three parts from losing them silently', () => {
    expect(buildVersion('1.2.3.4', 9)).toBe('1.2.9')
  })

  it('appends when the base is a single number', () => {
    expect(buildVersion('1', 9)).toBe('1.9')
  })
})

describe('a build that cannot read the history says so', () => {
  it('marks the version unknown rather than naming one', () => {
    expect(buildVersion('0.1.0', null)).toBe('0.1.0-unknown')
  })

  it('never passes for a real version', () => {
    // The failure this guards: a fallback that quietly reads `0.1.0` would name a build
    // this is not (design D60).
    expect(buildVersion('0.1.0', null)).not.toBe('0.1.0')
  })
})

describe('the line the teacher reads', () => {
  it('is the name, the version and when it was built', () => {
    expect(buildLine('0.1.16', '2026-09-04 18:42')).toBe('lesson-loop@0.1.16 · 2026-09-04 18:42')
  })

  it('names the app', () => {
    expect(buildLine('0.1.16', '2026-09-04 18:42').startsWith(`${APP_NAME}@`)).toBe(true)
  })
})

describe('the build stamp', () => {
  it('pads every part, so the width never jumps', () => {
    expect(buildStamp(new Date(2026, 8, 4, 9, 5))).toBe('2026-09-04 09:05')
  })

  it('reads as a date and a time, not as a machine timestamp', () => {
    expect(buildStamp(new Date(2026, 11, 31, 23, 59))).toBe('2026-12-31 23:59')
  })
})
