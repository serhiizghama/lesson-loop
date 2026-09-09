import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Picture, pictureSrc, preloadPictures } from './Picture'
import { PICTURE_DIR, pictures } from './pictures'
import { testLesson } from '@/shared/__fixtures__/lesson'
import type { Item, Lesson } from '@/shared/types'

/**
 * Pictures are a generated asset over a hand-written lesson, so the two can disagree.
 * These tests are about what happens when they do: an item with no drawing still teaches,
 * and a lesson never ships half-drawn.
 */
const lessons = readdirSync(join(process.cwd(), 'lessons'))
  .filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(readFileSync(join(process.cwd(), 'lessons', f), 'utf8')) as Lesson)

const animals = lessons.find((l) => l.id === 'animals') as Lesson
const colours = lessons.find((l) => l.id === 'colours') as Lesson
const item = (lesson: Lesson, id: string): Item => lesson.items.find((i) => i.id === id) as Item

describe('picture lookup', () => {
  it('resolves a drawn item to a file under the picture directory', () => {
    expect(pictureSrc(animals, item(animals, 'dog'))).toBe(`${PICTURE_DIR}/animals/dog.jpg`)
  })

  it('resolves a colour to its swatch', () => {
    expect(pictureSrc(colours, item(colours, 'red'))).toBe(`${PICTURE_DIR}/colours/red.svg`)
  })

  it('has nothing for an item no lesson has drawn', () => {
    const lesson = testLesson()
    expect(pictureSrc(lesson, item(lesson, 'dog'))).toBeNull()
  })
})

describe('picture rendering', () => {
  it('draws the picture when there is one', () => {
    const html = renderToStaticMarkup(<Picture lesson={animals} item={item(animals, 'dog')} />)
    expect(html).toContain('src="/pics/animals/dog.jpg"')
  })

  // The emoji is a required field of an item; the drawing is not. A lesson written today
  // has to play before anything is drawn for it (design D94).
  it('falls back to the emoji when there is none', () => {
    const lesson = testLesson()
    const html = renderToStaticMarkup(<Picture lesson={lesson} item={item(lesson, 'dog')} />)
    expect(html).toBe('🐶')
    expect(html).not.toContain('<img')
  })

  // Naming the picture would read the answer out in the blocks where the picture is the
  // question (design D98).
  it('never names the picture', () => {
    const html = renderToStaticMarkup(<Picture lesson={animals} item={item(animals, 'dog')} />)
    expect(html).toContain('alt=""')
    expect(html).not.toContain('dog"')
  })

  // A drawing is blended so its white ground disappears on a coloured tile; a swatch is
  // transparent already and blending would erase the white one (design D99).
  it('blends a drawing but not a swatch', () => {
    const drawn = renderToStaticMarkup(<Picture lesson={animals} item={item(animals, 'dog')} />)
    const swatch = renderToStaticMarkup(<Picture lesson={colours} item={item(colours, 'red')} />)
    const classOf = (html: string) => /class="([^"]+)"/.exec(html)?.[1]
    expect(classOf(drawn)).toBeDefined()
    expect(classOf(swatch)).toBeDefined()
    expect(classOf(drawn)).not.toBe(classOf(swatch))
  })
})

describe('preloading', () => {
  // A lesson is promised to run with the network gone once it is open, so its pictures are
  // fetched at that moment rather than when a block first renders one (design D56).
  it('warms every picture in the lesson', () => {
    const asked: string[] = []
    preloadPictures(colours, (src) => asked.push(src))
    expect(asked).toHaveLength(colours.items.length)
    expect(asked).toContain(`${PICTURE_DIR}/colours/red.svg`)
  })

  it('asks for each picture once, however often a lesson is opened', () => {
    const asked: string[] = []
    preloadPictures(animals, (src) => asked.push(src))
    const first = asked.length
    preloadPictures(animals, (src) => asked.push(src))
    expect(first).toBe(animals.items.length)
    expect(asked).toHaveLength(first)
  })

  it('asks for nothing when the lesson has no pictures', () => {
    const asked: string[] = []
    preloadPictures(testLesson(), (src) => asked.push(src))
    expect(asked).toEqual([])
  })
})

describe('the shipped set', () => {
  it.each(Object.entries(pictures))('%s is on disk', (_key, file) => {
    expect(existsSync(join(process.cwd(), 'public', 'pics', file))).toBe(true)
  })

  /**
   * Half a lesson is worse than none of it: a match grid where three tiles are drawings
   * and three are emoji reads as a bug to the child looking at it. A lesson is either
   * illustrated or it is not — `numbers` is the deliberate "not" (design D97).
   */
  it.each(lessons.map((l) => l.id))('%s is drawn for every item or for none', (id) => {
    const lesson = lessons.find((l) => l.id === id) as Lesson
    const drawn = lesson.items.filter((i) => pictures[`${id}/${i.id}`] !== undefined)
    expect([0, lesson.items.length]).toContain(drawn.length)
  })
})
