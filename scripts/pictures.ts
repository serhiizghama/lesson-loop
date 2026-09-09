/**
 * Draws one picture per lesson item and writes the manifest the app reads.
 *
 * Run it after adding an item to a lesson:
 *
 *     npm run pictures
 *
 * Pictures live at `public/pics/<lesson>/<item>.<ext>` and are looked up by
 * `<lesson>/<item>`. An item with no picture is not an error: the block views fall back
 * to its emoji, so a half-drawn lesson still plays (design D94).
 *
 * Two kinds of picture, because one generator is wrong for both jobs:
 *
 *   • Drawings come from the Gemini web app through `gimg` — a real network call of about
 *     a minute each, so existing files are never redrawn. The first animal is drawn from
 *     the style description alone and every later one is drawn *against it* as a
 *     reference, which is what keeps fifty pictures looking like one set (design D95).
 *
 *   • Colours are written here as SVG, not drawn. "Red" has to be red: a diffusion model
 *     gets the hue approximately right, which is precisely the one thing this lesson
 *     teaches. A shape with a declared fill is exact, weighs 400 bytes and scales
 *     (design D96).
 *
 * Numbers keep their keycap emoji deliberately — see NUMBERS_STAY_EMOJI below.
 */
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import type { Lesson } from '../src/shared/types'

const LESSONS = 'lessons'
const PICS = join('public', 'pics')
const MANIFEST = join('src', 'blocks', 'pictures.ts')
/** Full-size generator output, kept out of git: 2 MB a picture against 35 KB shipped. */
const ORIGINALS = '.pics-src'
const GIMG = process.env['LESSONLOOP_GIMG'] ?? '../gemini-img/gimg'

/** What the browser is served. 512 is twice the largest slot the layout ever gives one. */
const WEB_PX = 512

/** Attempts against a cookie rotating underneath the run. Four covers a busy Chrome. */
const RETRIES = 4

/**
 * The style, written once. Everything after it is one noun phrase, so a new item is one
 * line in SUBJECTS and never a new opinion about how the set should look.
 */
const STYLE =
  'Flat vector illustration for a small child, drawn with thick dark-navy outlines of even ' +
  'weight, flat colours, no gradients, no texture, simple rounded friendly shapes. ' +
  'Centred with generous empty margin, on a plain solid white background. ' +
  'Absolutely no text, no letters, no numbers, no speech bubbles, no frame, no border, ' +
  'no drop shadow, no background scenery and no other objects.'

/**
 * The anchor. Drawn from STYLE alone; every other drawing is generated with this file
 * attached, which holds line weight and palette together far better than repeating
 * adjectives does. Delete it and the whole set redraws — that is the intent.
 */
const ANCHOR = 'animals/dog'

type Recipe = {
  /** The subject, as the model is asked for it. */
  subject: string
}

/** Ordered only in that the anchor is drawn first; everything else is drawn against it. */
const SUBJECTS: Record<string, Recipe> = {
  // ── animals ───────────────────────────────────────────────────────────────
  'animals/dog': { subject: 'a happy dog, whole body, sitting, seen from the front' },
  'animals/cat': { subject: 'a happy cat, whole body, sitting, seen from the front' },
  'animals/bird': { subject: 'a happy little bird with bright feathers, whole body, perched, seen from the front' },
  'animals/fish': { subject: 'a happy orange fish, whole body, seen from the side, no water around it' },
  'animals/rabbit': { subject: 'a happy white rabbit with long ears, whole body, sitting, seen from the front' },
  'animals/elephant': { subject: 'a happy grey elephant, whole body, standing, seen from the front' },
  'animals/lion': { subject: 'a happy lion with a golden mane, whole body, sitting, seen from the front' },
  'animals/monkey': { subject: 'a happy brown monkey, whole body, sitting, seen from the front' },
  'animals/bear': { subject: 'a happy brown bear, whole body, sitting, seen from the front' },
  'animals/duck': { subject: 'a happy yellow duck, whole body, standing, seen from the side' },

  // ── my body ───────────────────────────────────────────────────────────────
  //
  // Parts on their own, never the same head six times with a different part emphasised.
  // That was drawn first and thrown away: at the size a match tile gives it, "eyes",
  // "nose" and "mouth" came out as three copies of one boy's face, and an exercise whose
  // whole question is *which part is this* stops having an answer. The emoji they replace
  // were already isolated parts, and for exactly this reason (design D100).
  'body-parts/eyes': {
    subject:
      'a pair of big friendly cartoon eyes with eyebrows above them, side by side, alone ' +
      'in the picture — no face and no head around them',
  },
  'body-parts/ears': {
    subject: 'one human ear seen from the side, alone in the picture — no face and no head',
  },
  'body-parts/nose': {
    subject: 'one human nose seen from the front, alone in the picture — no face and no head',
  },
  'body-parts/mouth': {
    subject:
      'one smiling closed mouth with soft pink lips, alone in the picture — no face and no head',
  },
  'body-parts/teeth': {
    subject: 'one big clean white tooth, alone in the picture',
  },
  // The one head in the set, so it stays tellable from everything else at tile size.
  'body-parts/hair': {
    subject:
      "a child's head seen from the front with a big bouncy head of thick hair as the clear " +
      'focus, cropped just below the chin',
  },
  'body-parts/hand': { subject: "a child's open hand with five fingers spread, palm towards the viewer" },
  'body-parts/foot': { subject: "a child's bare foot with five toes, seen from the side" },
  'body-parts/leg': { subject: "a child's whole leg from hip to bare foot, seen from the side" },
  'body-parts/arm': { subject: "a child's whole arm from shoulder to open hand, seen from the side" },

  // ── yummy food ────────────────────────────────────────────────────────────
  'food/apple': { subject: 'one shiny red apple with a green leaf' },
  'food/banana': { subject: 'one ripe yellow banana' },
  'food/egg': { subject: 'one white chicken egg standing in a little egg cup' },
  'food/rice': { subject: 'a bowl of white rice' },
  'food/bread': { subject: 'one golden loaf of bread' },
  'food/noodles': { subject: 'a bowl of noodles with a pair of chopsticks lifting some of them' },
  'food/milk': { subject: 'one tall glass of white milk' },
  'food/water': { subject: 'one tall glass of clear water' },
  'food/cake': { subject: 'one slice of birthday cake with pink icing and a lit candle' },
  'food/ice-cream': { subject: 'one ice cream cone with two scoops' },
}

/**
 * Colour swatches, written not drawn. Hues are the ones a children's book uses — a real
 * scarlet rather than #ff0000, which reads as a warning light next to the drawings.
 */
const COLOURS: Record<string, string> = {
  red: '#e04338',
  blue: '#3a7bd5',
  yellow: '#f5c518',
  green: '#4caf62',
  orange: '#f08a24',
  purple: '#8e5bc4',
  pink: '#f27ba8',
  brown: '#9a6234',
  black: '#2b2b33',
  white: '#ffffff',
}

/** The outline the drawings use, so a swatch sits in the same set as a drawn animal. */
const INK = '#1f2a52'

/**
 * Numbers keep 1️⃣…🔟 and get no picture at all.
 *
 * A drawn numeral is the one thing this generator is worst at — a four that reads as a
 * nine is not a style problem, it is a wrong answer in front of a child — and an SVG
 * numeral would have to trust a rounded font that only Apple devices have. Counting
 * pictures already exist as the `dots` tag, which the "How Many Apples?" block shows.
 * Left here as a decision rather than an omission (design D97).
 */
const NUMBERS_STAY_EMOJI = 'numbers'

function die(message: string): never {
  console.error(`\n  ✗ ${message}\n`)
  process.exit(1)
}

function lessons(): Array<{ file: string; lesson: Lesson }> {
  return readdirSync(LESSONS)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((file) => ({ file, lesson: JSON.parse(readFileSync(join(LESSONS, file), 'utf8')) as Lesson }))
}

/**
 * `gimg` reads a Chrome cookie that Chrome itself rotates every few minutes, so a long run
 * would fail somewhere in the middle on a session captured at the start. Recapturing costs
 * a second and no network, so it is done before every single drawing.
 *
 * Recapturing is still not a guarantee: a Chrome that is open and signed in rotates the
 * cookie in the background, and a rotation landing between this call and the request that
 * follows it invalidates the copy just taken. That race is what RETRIES exists for. Set
 * GEMINI_IMG_CHROME_PROFILE to a profile that is signed in but never opened to avoid it.
 */
function refreshSession(): void {
  const auth = spawnSync(GIMG, ['auth'], { encoding: 'utf8' })
  if (auth.error !== undefined) {
    die(
      `cannot run \`${GIMG}\`.\n` +
        `    Pictures are drawn through the gemini-img CLI; set LESSONLOOP_GIMG to its path.`,
    )
  }
  // exit 3 is a stale session, which is what this call just fixed; anything else is real.
  if (auth.status !== 0 && auth.status !== 3) {
    die(`\`gimg auth\` failed (exit ${auth.status}):\n${auth.stderr}`)
  }
}

/** Synchronous, because this script is a queue of one-at-a-time calls, not a pipeline. */
function pause(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)
}

/** One capture-then-ask attempt. Separated only so the retry above reads as one line. */
function generate(prompt: string, refs: string[], stem: string) {
  refreshSession()
  return spawnSync(
    GIMG,
    ['gen', prompt, ...refs.flatMap((r) => ['--ref', r]), '-o', resolve(ORIGINALS), '--name', stem],
    { encoding: 'utf8' },
  )
}

function draw(key: string, recipe: Recipe, target: string): void {
  // Absolute, always: the gimg entry point cds into its own directory before running, so
  // a path relative to this repo would be looked up inside the generator's checkout.
  const refs: string[] = []
  if (key !== ANCHOR) refs.push(resolve(PICS, `${ANCHOR}.jpg`))

  const attached =
    refs.length === 0
      ? ''
      : ' Match the attached reference image EXACTLY in drawing style — the same outline ' +
        'weight, the same flat colouring, the same proportions and the same size in frame — ' +
        'while giving the subject its own natural colours.'

  const prompt = `Generate a square image (1:1) of ${recipe.subject}. ${STYLE}${attached}`
  const stem = key.replace('/', '-')

  mkdirSync(ORIGINALS, { recursive: true })
  let run = generate(prompt, refs, stem)
  // Everything except a real account limit is retried. A rotated cookie (exit 3) and a
  // "something went wrong" from the far end are both routine over a run this long, and a
  // prompt that is genuinely wrong fails the same way every time — so it exhausts the
  // retries and is reported anyway, a minute later than it could have been.
  for (let attempt = 1; attempt <= RETRIES && run.status !== 0 && run.status !== 4; attempt += 1) {
    const why = run.status === 3 ? 'session rotated mid-request' : 'generator refused'
    console.log(`        ${why}, retrying ${key} (${attempt}/${RETRIES})`)
    pause(5_000)
    run = generate(prompt, refs, stem)
  }
  if (run.status === 4) die(`the Gemini account is limited — stopping.\n${run.stdout}${run.stderr}`)
  if (run.status !== 0) die(`\`gimg gen\` failed on ${key} (exit ${run.status}):\n${run.stdout}${run.stderr}`)

  const original = join(ORIGINALS, `${stem}.jpg`)
  if (!existsSync(original)) die(`\`gimg gen\` reported success but wrote no file for ${key}`)

  mkdirSync(join(PICS, key.split('/')[0] ?? ''), { recursive: true })
  const resized = spawnSync('sips', ['-Z', String(WEB_PX), '-s', 'format', 'jpeg', original, '--out', target])
  if (resized.status !== 0) die(`\`sips\` failed on ${original}`)
  if (statSync(target).size === 0) {
    rmSync(target, { force: true })
    die(`produced an empty picture for ${key}`)
  }
}

/**
 * The swatch shape: a closed curve through six points at deliberately uneven radii, so a
 * colour arrives looking drawn by the same hand as everything beside it rather than as
 * the geometric circle its emoji already was. Fixed numbers, so every hue is the same
 * shape and the set reads as one object in ten colours.
 */
const RADII = [205, 182, 214, 188, 206, 193]

function blobPath(): string {
  const cx = 256
  const cy = 256
  const points = RADII.map((r, i) => {
    const angle = (i / RADII.length) * 2 * Math.PI
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)] as const
  })

  // Catmull-Rom through the points, converted to cubics: the shape has to close on itself
  // without a visible corner, which a polyline of quadratics does not manage.
  const at = (i: number) => points[(i + points.length) % points.length] as readonly [number, number]
  const round = (n: number) => Math.round(n * 10) / 10
  let d = `M${round(at(0)[0])} ${round(at(0)[1])}`
  for (let i = 0; i < points.length; i += 1) {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)]
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]
    d += `C${round(c1[0] ?? 0)} ${round(c1[1] ?? 0)} ${round(c2[0] ?? 0)} ${round(c2[1] ?? 0)} ${round(p2[0])} ${round(p2[1])}`
  }
  return `${d}Z`
}

function swatch(fill: string): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">` +
    `<path d="${blobPath()}" fill="${fill}" stroke="${INK}" stroke-width="22" stroke-linejoin="round"/>` +
    `</svg>\n`
  )
}

function main(): void {
  console.log()
  const wanted = new Map<string, string>()

  for (const { file, lesson } of lessons()) {
    let drawn = 0
    for (const item of lesson.items) {
      const key = `${lesson.id}/${item.id}`
      if (lesson.id === NUMBERS_STAY_EMOJI) continue
      if (lesson.id === 'colours') {
        wanted.set(key, `${key}.svg`)
        drawn += 1
        continue
      }
      if (SUBJECTS[key] === undefined) {
        die(`lessons/${file} has item "${item.id}" with no recipe.\n` + `    Add "${key}" to SUBJECTS in ${MANIFEST.replace('src/blocks/pictures.ts', 'scripts/pictures.ts')}.`)
      }
      wanted.set(key, `${key}.jpg`)
      drawn += 1
    }
    const note = lesson.id === NUMBERS_STAY_EMOJI ? 'keycap emoji, by decision' : `${drawn} pictures`
    console.log(`  ${file.padEnd(20)} ${String(lesson.items.length).padStart(4)} items   ${note}`)
  }
  console.log()

  // Colours first: they cost nothing and a failed drawing run should not leave the cheap
  // half of the set unwritten.
  mkdirSync(join(PICS, 'colours'), { recursive: true })
  for (const [id, fill] of Object.entries(COLOURS)) {
    writeFileSync(join(PICS, 'colours', `${id}.svg`), swatch(fill))
  }
  console.log(`  ${Object.keys(COLOURS).length} colour swatches written\n`)

  const missing = [...wanted]
    .filter(([, file]) => file.endsWith('.jpg'))
    .filter(([, file]) => !existsSync(join(PICS, file)))
    // The anchor has to exist before anything can be drawn against it.
    .sort(([a], [b]) => (a === ANCHOR ? -1 : b === ANCHOR ? 1 : 0))

  if (missing.length === 0) {
    console.log(`  Every item already has a picture. Nothing to draw.`)
  } else {
    console.log(`  Drawing ${missing.length} picture(s) — about a minute each…\n`)
    let done = 0
    for (const [key, file] of missing) {
      const recipe = SUBJECTS[key]
      if (recipe === undefined) continue
      draw(key, recipe, join(PICS, file))
      done += 1
      const kb = (statSync(join(PICS, file)).size / 1024).toFixed(0)
      console.log(`  ${String(done).padStart(4)}/${missing.length}  ${key.padEnd(24)} ${kb.padStart(4)} KB`)
    }
  }

  writeManifest(wanted)

  const bytes = [...wanted.values()].reduce((n, f) => n + statSync(join(PICS, f)).size, 0)
  console.log(`\n  ${MANIFEST} → ${wanted.size} entries`)
  console.log(`  ${PICS} → ${(bytes / 1024).toFixed(0)} KB\n`)
}

/**
 * `<lesson>/<item>` → the file that draws it. Bundled rather than fetched, for the same
 * reason the clip manifest is: knowing whether a picture exists must not itself cost a
 * network call, and a lesson with no pictures must fall back to emoji without one either.
 */
function writeManifest(wanted: Map<string, string>): void {
  const entries = [...wanted]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, file]) => `  ${JSON.stringify(key)}: '${file}',`)
    .join('\n')

  writeFileSync(
    MANIFEST,
    `/**
 * Generated by \`npm run pictures\` — do not edit.
 *
 * Maps \`<lesson>/<item>\` to the picture that shows it. An item missing from here is
 * drawn as its emoji instead, which is what lets a lesson be illustrated one at a time
 * (design D94).
 */
export const PICTURE_DIR = '/pics'

export const pictures: Readonly<Record<string, string>> = {
${entries}
}
`,
  )
}

main()
