/**
 * Turning a topic plus a choice into an ordinary lesson.
 *
 * This is the one place where a size becomes a lesson (design D1). It runs before
 * anything is played, so nothing downstream — the player, the reducer, the room, the
 * Durable Object or the wire — learns what a part is: what comes out of `narrow` is the
 * same `Lesson` a hand-written file would have been.
 */

import type { Block, ItemRef, Lesson, Part } from './types'

/** The whole topic, as opposed to one of its parts. Its own address segment (design D5). */
export const WHOLE = 'all'

/** A part's id, or {@link WHOLE}. */
export type Choice = string

/**
 * The identifier of the lesson a choice produces — `animals/wild`, or `animals` for a
 * topic that declares no parts. It is the address without its `/l/` prefix, and it is
 * what `state.lessonId` carries.
 *
 * A built lesson has to be *findable by name*: both participants of a room resolve the
 * lesson it is on from their own copy of `lessons/` by that id, and the reducer refuses
 * an action whose state names a different lesson than the one being played. A part is a
 * lesson, so it needs a name — exactly as `animals-2` had one when it was a file.
 */
export function lessonIdOf(topic: Lesson, choice: Choice = WHOLE): string {
  return topic.parts === undefined ? topic.id : `${topic.id}/${choice}`
}

/** The topic a built lesson came from: what its pictures and its recipes are filed under. */
export function topicOf(lessonId: string): string {
  return lessonId.split('/')[0] ?? lessonId
}

/** One size a topic offers, as the home screen shows it. */
export type SizeChoice = {
  /** The address segment: a part's id, or `all`. */
  id: Choice
  /** What the sitting is called — the part's title, or the topic's. */
  title: string
  emoji: string
  /** How many words the sitting introduces. */
  teaches: number
  /** How many words the lesson carries, which for a later part is more than it teaches. */
  carries: number
}

/**
 * The sizes a topic offers: each of its parts, then the whole of it. A topic that
 * declares no parts offers nothing to choose — it is already one sitting (spec).
 */
export function choicesOf(lesson: Lesson): SizeChoice[] {
  const parts = lesson.parts
  if (parts === undefined) return []
  const choices = parts.map((part, index) => ({
    id: part.id,
    title: part.title,
    emoji: part.emoji,
    teaches: part.items.length,
    // Cumulative: a part carries the words of the parts before it, to revise them.
    carries: parts.slice(0, index + 1).reduce((n, p) => n + p.items.length, 0),
  }))
  return [
    ...choices,
    {
      id: WHOLE,
      title: lesson.title,
      emoji: lesson.emoji,
      teaches: lesson.items.length,
      carries: lesson.items.length,
    },
  ]
}

/** Whether a topic offers this size. `all` is always on offer, parts or no parts. */
export function offersChoice(lesson: Lesson, choice: Choice): boolean {
  if (choice === WHOLE) return true
  return lesson.parts?.some((p) => p.id === choice) ?? false
}

/**
 * Builds the lesson one choice produces.
 *
 * Items are cumulative — parts 1..k, in the order the file declares its items, so a
 * later part carries the earlier ones to revise them. Blocks are not: a block belongs to
 * the sittings its `only` names, and to every sitting when it names none (design D3).
 * The whole topic carries every item and every block, in file order.
 *
 * Throws only on a choice the topic does not offer; every other way a topic can be
 * malformed is caught by `validateLesson` before anything is narrowed.
 */
export function narrow(lesson: Lesson, choice: Choice = WHOLE): Lesson {
  const parts = lesson.parts
  if (parts === undefined || choice === WHOLE) {
    return built(lesson, choice, lesson.items.map((i) => i.id), lesson.blocks, lesson.title, lesson.emoji)
  }

  const index = parts.findIndex((p) => p.id === choice)
  if (index < 0) throw new Error(`lesson "${lesson.id}" has no part "${choice}"`)
  const part = parts[index] as Part

  const carried = new Set(parts.slice(0, index + 1).flatMap((p) => p.items))
  const carries = lesson.items.filter((i) => carried.has(i.id)).map((i) => i.id)
  const blocks = lesson.blocks.filter((b) => b.only === undefined || b.only.includes(choice))
  return built(lesson, choice, carries, blocks, part.title, part.emoji, part.items)
}

/**
 * Assembles the lesson, erasing every trace of the topic: no `parts`, no `only`, and no
 * `select: 'new'`. That absence is the guarantee that replaces a separate `Topic` type,
 * and `narrow.test.ts` holds it (design D2).
 */
function built(
  lesson: Lesson,
  choice: Choice,
  carries: string[],
  blocks: Block[],
  title: string,
  emoji: string,
  teaches: string[] = carries,
): Lesson {
  const carried = new Set(carries)
  const { parts: _parts, ...rest } = lesson
  return {
    ...rest,
    id: lessonIdOf(lesson, choice),
    title,
    emoji,
    items: lesson.items.filter((i) => carried.has(i.id)),
    blocks: blocks.map((block) => resolveBlock(block, teaches)),
  }
}

function resolveBlock(block: Block, teaches: string[]): Block {
  const { only: _only, ...rest } = block
  if (!('items' in rest)) return rest as Block
  return { ...rest, items: resolveRef(rest.items, teaches) } as Block
}

function resolveRef(ref: ItemRef, teaches: string[]): ItemRef {
  return ref.select === 'new' ? { select: 'ids', ids: teaches } : ref
}
