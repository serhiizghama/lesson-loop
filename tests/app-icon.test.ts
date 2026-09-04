import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * The identity is four static files and four lines of markup (design D31). Nothing in the
 * app imports them, so a rename or a wrong raster breaks nothing a build or a type check
 * would notice — it breaks the tab, months later, on someone else's screen. This reads
 * what the app declares about itself and checks the files behind those declarations.
 */
const root = process.cwd()
const publicDir = join(root, 'public')
const html = readFileSync(join(root, 'index.html'), 'utf8')
const manifestHref = '/manifest.webmanifest'
const manifest = JSON.parse(readFileSync(join(publicDir, manifestHref.slice(1)), 'utf8'))

/** The `href` of the first `<link>` carrying this `rel`, as the browser would take it. */
function linkHref(rel: string): string {
  const tag = html.match(new RegExp(`<link[^>]*\\brel="${rel}"[^>]*>`))
  expect(tag, `index.html declares no <link rel="${rel}">`).not.toBeNull()
  const href = tag![0].match(/\bhref="([^"]*)"/)
  expect(href, `<link rel="${rel}"> has no href`).not.toBeNull()
  return href![1]
}

/**
 * A PNG's real size. The IHDR chunk is always the first after the 8-byte signature, and
 * opens with the two dimensions: bytes 16-20 are the width, 20-24 the height. Reading
 * them directly is what keeps an image library out of the project (design D28).
 */
function pngSize(file: string): { width: number; height: number } {
  const bytes = readFileSync(file)
  expect(bytes.subarray(1, 4).toString('ascii'), `${file} is not a PNG`).toBe('PNG')
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) }
}

/** A root-relative reference, resolved to the file that has to be there to serve it. */
function fileFor(href: string): string {
  expect(href.startsWith('/'), `"${href}" is not root-relative`).toBe(true)
  return join(publicDir, href.slice(1))
}

describe('every icon the page declares exists', () => {
  for (const [slot, rel] of [
    ['the tab', 'icon'],
    ['an iOS home screen', 'apple-touch-icon'],
  ] as const) {
    it(`${slot}: <link rel="${rel}"> names a file in public/`, () => {
      const href = linkHref(rel)
      expect(existsSync(fileFor(href)), `${href} is declared but missing from public/`).toBe(true)
    })
  }

  it('the manifest: <link rel="manifest"> names a file in public/', () => {
    const href = linkHref('manifest')
    expect(href).toBe(manifestHref)
    expect(existsSync(fileFor(href))).toBe(true)
  })
})

describe('every icon the manifest declares exists and is the size it claims', () => {
  const icons = manifest.icons as Array<{ src: string; sizes?: string; type?: string }>

  it('the manifest declares icons at all', () => {
    expect(icons.length).toBeGreaterThan(0)
  })

  for (const icon of icons) {
    it(`${icon.src} exists`, () => {
      expect(existsSync(fileFor(icon.src)), `${icon.src} is declared but missing`).toBe(true)
    })

    if (icon.src.endsWith('.png')) {
      it(`${icon.src} really is ${icon.sizes}`, () => {
        const { width, height } = pngSize(fileFor(icon.src))
        expect(`${width}x${height}`, `${icon.src} is declared ${icon.sizes}`).toBe(icon.sizes)
      })
    }
  }
})

describe('no third party is asked for the identity', () => {
  const references = [
    ...['icon', 'apple-touch-icon', 'manifest'].map(linkHref),
    ...(manifest.icons as Array<{ src: string }>).map((icon) => icon.src),
  ]

  for (const href of references) {
    it(`${href} is served from the app's own origin`, () => {
      expect(href, `${href} points at another origin`).not.toMatch(/:\/\//)
      expect(href.startsWith('/'), `${href} is not root-relative`).toBe(true)
    })
  }
})
