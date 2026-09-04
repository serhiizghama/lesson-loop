/**
 * Which build this is (design D57).
 *
 * The number is derived, never maintained: `package.json` keeps the human half — the
 * major and minor someone decides by editing it — and the build appends how many commits
 * the history carries. So every revision that reaches the published app is a different
 * number, and nothing has to be bumped, committed or tagged to make that true (D-26).
 *
 * This module is pure and knows nothing about git. `vite.config.ts` runs the command,
 * catches its failure, and hands the result here (design D59). The strings it produces are
 * baked into the bundle at build time; nothing is computed or fetched while the app runs.
 */

/** What the app is called where the version is shown. */
export const APP_NAME = 'lesson-loop'

/**
 * `0.1.0` plus 16 commits is `0.1.16`. The base's last part is replaced rather than
 * appended to, so a base of `0.2.0` gives `0.2.<count>` and the count is always the
 * patch.
 *
 * A missing count means the build could not read the history — no repository, no git, a
 * shallow clone. It is said out loud rather than hidden behind the base version, because
 * a version that names a build it is not is worse than one that admits it does not know
 * (design D60).
 */
export function buildVersion(base: string, commits: number | null): string {
  if (commits === null) return `${base}-unknown`

  const parts = base.split('.')
  if (parts.length < 2) return `${base}.${commits}`
  return [...parts.slice(0, 2), String(commits)].join('.')
}

/** The one line the home screen shows: `lesson-loop@0.1.16 · 2026-09-04 18:42`. */
export function buildLine(version: string, builtAt: string): string {
  return `${APP_NAME}@${version} · ${builtAt}`
}

/** A build time a person can read, in the builder's own timezone. */
export function buildStamp(at: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  const date = [at.getFullYear(), pad(at.getMonth() + 1), pad(at.getDate())].join('-')
  return `${date} ${pad(at.getHours())}:${pad(at.getMinutes())}`
}
