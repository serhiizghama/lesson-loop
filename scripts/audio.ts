/**
 * Synthesises one audio clip per line the lessons can speak, and writes the manifest the
 * app reads (design D53, D54, D55).
 *
 * Run it after editing a lesson:
 *
 *     npm run audio                        # default voice
 *     LESSONLOOP_VOICE="Samantha (Enhanced)" npm run audio
 *
 * Clips are named by a hash of the line and the voice, so editing a line in JSON — or
 * changing voice — simply misses in the manifest and falls back to the device voice. It
 * never plays the old wording, or the old voice, under a name that looks current.
 * Existing clips are left alone, so a re-run after adding one lesson does only that lesson.
 *
 * It runs through `vite-node` rather than plain `node` because it imports the enumerator
 * out of `src/shared`, which is the point: the list of lines the app can speak must have
 * exactly one definition, and it is the one the block views are held to.
 */
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { speakableLines } from '../src/shared/blocks'
import type { Lesson } from '../src/shared/types'

const LESSONS = 'lessons'
const CLIPS = join('public', 'audio')
const MANIFEST = join('src', 'speech', 'clips.ts')
const VOICE = process.env['LESSONLOOP_VOICE'] ?? 'Samantha'
/**
 * Matches the rate the device synthesiser uses, so a line falling back to the browser does
 * not sound like a different app.
 *
 * Samantha's default is ~172 wpm (measured: `-r 170`, `172` and `175` all reproduce the
 * duration of an unrated run), so 145 wpm is 0.843x of default against `speech.ts`'s
 * 0.85x — under a percentage point apart. Change one and the other wants recomputing.
 */
const RATE = 145

/**
 * Identifies a line *as spoken by a particular voice*, not just the line (design D55).
 *
 * The voice has to be in here. Without it, installing a better voice and re-running would
 * find every hash already on disk and regenerate nothing — the clips would stay in the old
 * voice for good, with no sign that anything was wrong. Including it means changing voice
 * produces a fresh set and the previous one falls out as stale.
 *
 * Sixteen hex characters is unambiguous for a vocabulary of this size and short enough to
 * read in a directory listing.
 */
export function clipId(line: string, voice: string): string {
  return createHash('sha256').update(`${voice}\n${line}`, 'utf8').digest('hex').slice(0, 16)
}

function die(message: string): never {
  console.error(`\n  ✗ ${message}\n`)
  process.exit(1)
}

/**
 * `say` accepts an unknown voice, exits 0 and quietly substitutes the default — so a typo
 * in LESSONLOOP_VOICE would otherwise produce a full set of clips in the wrong voice with
 * no indication. The only safe check is to ask for the list first.
 */
function requireVoice(name: string): void {
  const listed = spawnSync('say', ['-v', '?'], { encoding: 'utf8' })
  if (listed.error !== undefined || listed.status !== 0) {
    die(`cannot run \`say\` — clips can only be generated on macOS (design D54).`)
  }
  const names = listed.stdout
    .split('\n')
    .map((row) => row.split(/\s{2,}/)[0]?.trim() ?? '')
    .filter((n) => n.length > 0)
  if (!names.includes(name)) {
    const english = names.filter((n) => /^[A-Z]/.test(n)).slice(0, 12).join(', ')
    die(
      `voice "${name}" is not installed.\n` +
        `    Install it in System Settings → Accessibility → Spoken Content →\n` +
        `    System Voice → Manage Voices, or set LESSONLOOP_VOICE to one of:\n` +
        `    ${english}…`,
    )
  }
}

/**
 * Two steps rather than `say --file-format=m4af`: asking `say` for AAC directly produces
 * roughly five times the bytes (38 KB against 8 KB for the same sentence), because it
 * ignores the low bitrate that speech at 22 kHz mono is perfectly served by.
 */
function synthesise(line: string, target: string): void {
  const scratch = join(tmpdir(), `lessonloop-${process.pid}.aiff`)
  try {
    const said = spawnSync('say', ['-v', VOICE, '-r', String(RATE), '-o', scratch, line])
    if (said.status !== 0) die(`\`say\` failed on ${JSON.stringify(line)}`)

    const converted = spawnSync('afconvert', [scratch, target, '-f', 'm4af', '-d', 'aac'])
    if (converted.status !== 0) die(`\`afconvert\` failed on ${JSON.stringify(line)}`)

    // A zero-length clip is worse than none: it would hit in the manifest and play silence,
    // which is exactly the failure this whole change exists to remove.
    if (statSync(target).size === 0) {
      rmSync(target, { force: true })
      die(`produced an empty clip for ${JSON.stringify(line)}`)
    }
  } finally {
    rmSync(scratch, { force: true })
  }
}

function lessons(): Array<{ file: string; lesson: Lesson }> {
  return readdirSync(LESSONS)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((file) => ({ file, lesson: JSON.parse(readFileSync(join(LESSONS, file), 'utf8')) as Lesson }))
}

function main(): void {
  const all = new Map<string, string>()
  console.log()
  for (const { file, lesson } of lessons()) {
    const lines = speakableLines(lesson)
    for (const line of lines) all.set(line, clipId(line, VOICE))
    console.log(`  ${file.padEnd(20)} ${String(lines.length).padStart(4)} lines`)
  }
  const chars = [...all.keys()].reduce((n, l) => n + l.length, 0)
  console.log(`  ${'distinct'.padEnd(20)} ${String(all.size).padStart(4)} lines, ${chars} chars\n`)

  mkdirSync(CLIPS, { recursive: true })
  const present = new Set(readdirSync(CLIPS).filter((f) => f.endsWith('.m4a')).map((f) => f.slice(0, -4)))
  const missing = [...all].filter(([, id]) => !present.has(id))

  if (missing.length === 0) {
    console.log(`  Every line already has a clip. Nothing to do.`)
  } else {
    requireVoice(VOICE)
    console.log(`  Synthesising ${missing.length} clip(s) in "${VOICE}"…\n`)
    let done = 0
    for (const [line, id] of missing) {
      synthesise(line, join(CLIPS, `${id}.m4a`))
      done += 1
      console.log(`  ${String(done).padStart(4)}/${missing.length}  ${id}  ${JSON.stringify(line)}`)
    }
  }

  // Clips whose line no longer exists. Left in place rather than deleted: they cost bytes,
  // not correctness, and deleting an author's files unasked is the wrong default.
  const wanted = new Set(all.values())
  const stale = [...present].filter((id) => !wanted.has(id))
  if (stale.length > 0) {
    console.log(
      `\n  ${stale.length} clip(s) match no current line — a changed line, or a previous` +
        `\n  voice. Safe to delete; nothing reads them:`,
    )
    for (const id of stale) console.log(`    public/audio/${id}.m4a`)
  }

  writeManifest(all)
  const bytes = readdirSync(CLIPS)
    .filter((f) => f.endsWith('.m4a'))
    .reduce((n, f) => n + statSync(join(CLIPS, f)).size, 0)
  console.log(`\n  ${MANIFEST} → ${all.size} entries`)
  console.log(`  ${CLIPS} → ${(bytes / 1024).toFixed(0)} KB\n`)
}

/**
 * Line text → clip id. This direction, so the browser never has to hash anything: the
 * only hashing implementation stays here, and a lookup is a plain object read.
 */
function writeManifest(all: Map<string, string>): void {
  const entries = [...all]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([line, id]) => `  ${JSON.stringify(line)}: '${id}',`)
    .join('\n')

  writeFileSync(
    MANIFEST,
    `/**
 * Generated by \`npm run audio\` — do not edit.
 *
 * Maps a spoken line to the clip that says it. Bundled rather than fetched: knowing
 * whether a clip exists must not itself cost a network call (design D55).
 *
 * Voice: ${VOICE}
 */
export const CLIP_DIR = '/audio'

export const clips: Readonly<Record<string, string>> = {
${entries}
}
`,
  )
}

main()
