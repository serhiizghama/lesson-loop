import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { narrow } from '../src/shared/narrow'
import { createLessonState } from '../src/shared/reducer'
import { RoomCore } from '../src/shared/room'
import { resolveItems, validateLesson } from '../src/shared/validate'
import type { Block, Lesson } from '../src/shared/types'
import { loadLesson } from './support/play'

/**
 * The migration from four files to two, verified by equality rather than by eye
 * (design D9).
 *
 * `animals-1`, `animals-2`, `shapes-1` and `shapes-2` are kept under
 * `src/shared/__fixtures__/` as they shipped. Narrowing the merged topic to each size
 * must reproduce them — every word, every exercise, every hint — bar the handful of
 * differences named below, each of which is applied to the fixture here so that it is
 * visible in the test rather than hidden in a loose comparison.
 */

const FIXTURES = join(process.cwd(), 'src/shared/__fixtures__')

function fixture(name: string): Lesson {
  const result = validateLesson(JSON.parse(readFileSync(join(FIXTURES, `${name}.json`), 'utf8')))
  if (!result.ok) throw new Error(`${name}\n  ${result.errors.join('\n  ')}`)
  return result.lesson
}

/**
 * A lesson with its selections resolved to the words they name.
 *
 * `{select:'all'}` over a five-word lesson and `{select:'ids'}` naming those same five
 * are one selection written two ways, and a merged topic writes it the second way
 * because the block has to serve both halves. Comparing the words rather than the
 * wording is what makes the comparison about content.
 */
function content(lesson: Lesson): unknown {
  return {
    id: lesson.id,
    title: lesson.title,
    emoji: lesson.emoji,
    audience: lesson.audience,
    l1: lesson.l1,
    items: lesson.items,
    blocks: lesson.blocks.map((block) => ({
      ...block,
      ...('items' in block ? { items: resolveItems(lesson, block.items).map((i) => i.id) } : {}),
    })),
  }
}

/** Applies one recorded difference to a fixture, failing loudly if it is already gone. */
function patch(lesson: Lesson, id: string, change: Partial<Block>): Lesson {
  const index = lesson.blocks.findIndex((b) => b.id === id)
  expect(index, `${lesson.id} has no block "${id}" to patch`).toBeGreaterThanOrEqual(0)
  const blocks = [...lesson.blocks]
  blocks[index] = { ...blocks[index], ...change } as Block
  return { ...lesson, blocks }
}

/** Moves a block to the end, which is where the merged file's order puts it. */
function moveLast(lesson: Lesson, id: string): Lesson {
  const block = lesson.blocks.find((b) => b.id === id) as Block
  const rest = lesson.blocks.filter((b) => b.id !== id)
  // The closing send-off stays last of all; the moved block goes in front of it.
  const done = rest[rest.length - 1] as Block
  return { ...lesson, blocks: [...rest.slice(0, -1), block, done] }
}

/** Renames a block, for the one case where two sittings' versions must be told apart. */
function rename(lesson: Lesson, from: string, to: string): Lesson {
  return {
    ...lesson,
    blocks: lesson.blocks.map((b) => (b.id === from ? ({ ...b, id: to } as Block) : b)),
  }
}

describe('animals.json replaces animals-1 and animals-2', () => {
  const topic = loadLesson('animals.json')

  it('narrows to the lesson animals-1 was', () => {
    /*
     * Three recorded differences:
     *  · `hear` sat fifth in animals-1 and eighth in animals-2. One file has one order,
     *    and the merged topic takes animals-2's, so part one's listening moves to the end.
     *    It is the same exercise over the same five words (design D9).
     *  · `hear` listens over everything the sitting carries, so its hint is worded once
     *    for every size — animals-2's wording, which is true of five words as of ten.
     *  · The closing message is written for every size, because one topic has one closing
     *    screen and the whole-topic choice carries it too.
     */
    let expected = fixture('animals-1')
    expected = moveLast(expected, 'hear')
    expected = patch(expected, 'hear', {
      hint: 'Every animal you know. Listen, then tap the one you heard.',
    })
    expected = patch(expected, 'done', { message: 'Great job! You know your animals now!' })
    expect(content(narrow(topic, 'known'))).toEqual(
      content({ ...expected, id: 'animals/known', title: 'Animals 1 · You Know These', emoji: '🐶' }),
    )
  })

  it('narrows to the lesson animals-2 was', () => {
    /*
     * One recorded difference: the closing message, as above. Everything else — ten
     * animals in their order, the memory game, the homes, the listening over all of them —
     * is what the file said.
     */
    const expected = patch(fixture('animals-2'), 'done', {
      message: 'Great job! You know your animals now!',
    })
    expect(content(narrow(topic, 'wild'))).toEqual(
      content({ ...expected, id: 'animals/wild', title: 'Animals 2 · Wild Animals', emoji: '🦁' }),
    )
  })

  it('teaches five words in each part and carries ten in the second', () => {
    expect(narrow(topic, 'known').items).toHaveLength(5)
    expect(narrow(topic, 'wild').items).toHaveLength(10)
    expect(narrow(topic).items).toHaveLength(10)
  })
})

describe('shapes.json replaces shapes-1 and shapes-2', () => {
  const topic = loadLesson('shapes.json')

  it('narrows to the lesson shapes-1 was', () => {
    const expected = patch(fixture('shapes-1'), 'done', {
      message: 'Great job! You know your shapes now!',
    })
    expect(content(narrow(topic, 'basic'))).toEqual(
      content({ ...expected, id: 'shapes/basic', title: 'Shapes 1 · Basic Shapes', emoji: '🔵' }),
    )
  })

  it('narrows to the lesson shapes-2 was', () => {
    /*
     * Two recorded differences beyond the closing message:
     *  · The two halves' model phrases differ — they quote their own half's words — so
     *    the file carries both, and the second half's needs an id of its own.
     *  · `both` describes whatever the sitting carries, so its hint is worded once for
     *    every size rather than twice.
     */
    let expected = fixture('shapes-2')
    expected = rename(expected, 'talk', 'talk-more')
    expected = patch(expected, 'both', { hint: 'Two things about one shape. Answer both.' })
    expected = patch(expected, 'done', { message: 'Great job! You know your shapes now!' })
    expect(content(narrow(topic, 'more'))).toEqual(
      content({ ...expected, id: 'shapes/more', title: 'Shapes 2 · More Shapes', emoji: '⭐' }),
    )
  })

  it('keeps each half’s own phrases with that half', () => {
    const basic = narrow(topic, 'basic').blocks.map((b) => b.id)
    const more = narrow(topic, 'more').blocks.map((b) => b.id)
    expect(basic).toContain('talk')
    expect(basic).not.toContain('talk-more')
    expect(more).toContain('talk-more')
    expect(more).not.toContain('talk')
  })

  it('teaches four words in each part and carries eight in the second', () => {
    expect(narrow(topic, 'basic').items).toHaveLength(4)
    expect(narrow(topic, 'more').items).toHaveLength(8)
  })
})

describe('a room is opened on the lesson the size produced', () => {
  const topic = loadLesson('animals.json')

  /**
   * The room, the Durable Object and the wire were not touched by this change, and this
   * is why: what a room opens on is an ordinary lesson. The size is not a setting that
   * travels — it is a lesson that was built before anything was played (design D1).
   */
  it('holds that lesson, with nothing in it about parts', () => {
    const lesson = narrow(topic, 'wild')
    const core = RoomCore.open(lesson, createLessonState(lesson.id), 'key')

    expect(core.lesson.items).toHaveLength(10)
    expect(core.lesson.parts).toBeUndefined()
    const travelled = JSON.stringify(core.lesson)
    expect(travelled).not.toContain('"parts"')
    expect(travelled).not.toContain('"only"')
    expect(travelled).not.toContain('"select":"new"')
  })

  it('puts the topic’s other words in front of nobody when a part is taught', () => {
    const lesson = narrow(topic, 'known')
    const core = RoomCore.open(lesson, createLessonState(lesson.id), 'key')
    expect(core.lesson.items.map((i) => i.id)).toEqual(['dog', 'cat', 'rabbit', 'duck', 'fish'])
  })

  /**
   * The one thing about the size that does travel is the lesson's *name*, and it has to:
   * the lesson itself never crosses the socket, so both participants resolve it from
   * their own copy of `lessons/` by the id in the state, and the reducer refuses an
   * action whose state names a different lesson than the one being played. `animals-2`
   * named a size in exactly the same way when it was a file.
   */
  it('names the lesson being played, and says nothing else about the size', () => {
    const lesson = narrow(topic, 'known')
    const core = RoomCore.open(lesson, createLessonState(lesson.id), 'key')
    const message = core.stateMessage('student')

    expect(message).toMatchObject({ t: 'state', state: { lessonId: 'animals/known' } })
    // The message carries what it always carried, and no field about parts.
    expect(Object.keys(message).sort()).toEqual(
      ['locked', 'muted', 'pen', 'role', 'state', 't'].sort(),
    )
  })
})
