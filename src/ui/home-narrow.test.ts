import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * The home screen with a card expanded, at the narrowest window the app supports (380px).
 *
 * jsdom lays nothing out, so this reads the rules rather than the pixels: the ways a card
 * *can* push a page sideways are a fixed width, a minimum wider than the screen, or a
 * label that will not wrap. What the rules cannot show — that it also looks right — is
 * the manual check the change closes on.
 */
const css = readFileSync(join(process.cwd(), 'src/ui/app.module.css'), 'utf8')

/** One rule's declarations, by selector, as written. */
function rule(selector: string): string {
  const at = css.indexOf(`${selector} {`)
  expect(at, `no rule for ${selector}`).toBeGreaterThan(-1)
  return css.slice(at, css.indexOf('}', at))
}

const NARROWEST_PX = 380
const ROOT_FONT_PX = 16

describe('an expanded card at 380px', () => {
  it('lets a size fill the card rather than setting a width of its own', () => {
    const size = rule('.lessonSize')
    expect(size).toContain('width: 100%')
    expect(size).not.toMatch(/min-width:/)
  })

  it('wraps the longest label instead of pushing the card wider', () => {
    // "5 new words · Animals 2 · Wild Animals" is longer than any topic's name.
    expect(rule('.lessonSizeName')).toContain('overflow-wrap: anywhere')
  })

  it('lays the sizes out down the card, never across it', () => {
    const sizes = rule('.lessonSizes')
    expect(sizes).toContain('flex-direction: column')
  })

  it('leaves the cards beside an expanded one their own height', () => {
    expect(rule('.lessonGrid')).toContain('align-items: start')
  })

  it('keeps the grid’s own column narrower than the screen', () => {
    const grid = rule('.lessonGrid')
    const min = /minmax\((\d+(?:\.\d+)?)rem/.exec(grid)?.[1]
    expect(min, 'the grid must declare a minimum column').toBeDefined()
    expect(Number(min) * ROOT_FONT_PX).toBeLessThan(NARROWEST_PX)
  })

  it('closes the marks and the padding up on a narrow window', () => {
    const narrow = css.slice(css.indexOf('@media (max-width: 30rem)'))
    expect(narrow).toContain('.lessonSize {')
    expect(narrow).toContain('.lessonSizeEmoji {')
  })

  it('gives every tappable size at least a finger’s height', () => {
    // `--tap` is the project's finger-sized minimum; a size is as tappable as a card.
    expect(rule('.lessonSize')).toContain('min-height: var(--tap)')
    expect(rule('.lessonCardHead')).toContain('min-height: var(--tap)')
  })
})
