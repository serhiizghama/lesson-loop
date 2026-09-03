import { z } from 'zod'
import type { Face, Item, ItemRef, Lesson } from './types'
import { tagOfFace, tagsUsedByTemplate } from './text'

const FIXED_FACES = ['emoji', 'en', 'l1', 'example'] as const

const faceSchema = z.custom<Face>(
  (v) =>
    typeof v === 'string' &&
    ((FIXED_FACES as readonly string[]).includes(v) || /^tag:[A-Za-z0-9_-]+$/.test(v)),
  { message: "must be 'emoji', 'en', 'l1', 'example' or 'tag:<name>'" },
)

const idSchema = z.string().min(1).regex(/^[a-z0-9-]+$/, 'must be lowercase kebab-case')

const itemSchema = z.object({
  id: idSchema,
  en: z.string().min(1),
  emoji: z.string().min(1),
  l1: z.object({ word: z.string().min(1), romaji: z.string().min(1).optional() }).optional(),
  example: z.string().min(1).optional(),
  plural: z.boolean().optional(),
  article: z.enum(['a', 'an', 'none']).optional(),
  tags: z.record(z.string(), z.string()).optional(),
})

const itemRefSchema = z.discriminatedUnion('select', [
  z.object({ select: z.literal('all') }),
  z.object({ select: z.literal('ids'), ids: z.array(idSchema).min(1) }),
  z.object({ select: z.literal('tag'), tag: z.string().min(1) }),
])

const blockBase = { id: idSchema, title: z.string().min(1), hint: z.string().min(1).optional() }

const blockSchema = z.discriminatedUnion('type', [
  z.object({
    ...blockBase,
    type: z.literal('cards'),
    items: itemRefSchema,
    front: faceSchema,
    back: z.array(faceSchema).min(1),
  }),
  z.object({
    ...blockBase,
    type: z.literal('match'),
    items: itemRefSchema,
    left: faceSchema,
    right: faceSchema,
    count: z.number().int().min(2).optional(),
  }),
  z.object({
    ...blockBase,
    type: z.literal('sentence'),
    items: itemRefSchema,
    levels: z
      .array(z.object({ label: z.string().min(1), template: z.string().min(1) }))
      .min(1),
  }),
  z.object({
    ...blockBase,
    type: z.literal('sort'),
    items: itemRefSchema,
    by: z.string().min(1),
    buckets: z
      .array(z.object({ key: z.string().min(1), label: z.string().min(1), emoji: z.string().min(1) }))
      .min(2),
  }),
  z.object({
    ...blockBase,
    type: z.literal('listen'),
    items: itemRefSchema,
    choices: z.number().int().min(2).optional(),
  }),
  z.object({ ...blockBase, type: z.literal('tpr'), items: itemRefSchema, prompt: z.string().min(1) }),
  z.object({ ...blockBase, type: z.literal('finish'), message: z.string().min(1) }),
])

const lessonSchema = z.object({
  id: idSchema,
  title: z.string().min(1),
  emoji: z.string().min(1),
  audience: z.enum(['kids', 'teens', 'adults']),
  l1: z.enum(['ja']).nullable(),
  items: z.array(itemSchema).min(1),
  blocks: z.array(blockSchema).min(1),
})

export type ValidationResult =
  | { ok: true; lesson: Lesson }
  | { ok: false; errors: string[] }

/** Resolves the items a block works on, in a stable, declared order. */
export function resolveItems(lesson: Lesson, ref: ItemRef): Item[] {
  if (ref.select === 'all') return lesson.items
  if (ref.select === 'tag') return lesson.items.filter((i) => i.tags?.[ref.tag] !== undefined)
  const byId = new Map(lesson.items.map((i) => [i.id, i]))
  return ref.ids.flatMap((id) => {
    const item = byId.get(id)
    return item ? [item] : []
  })
}

function missingIds(lesson: Lesson, ref: ItemRef): string[] {
  if (ref.select !== 'ids') return []
  const known = new Set(lesson.items.map((i) => i.id))
  return ref.ids.filter((id) => !known.has(id))
}

/**
 * Checks the lesson makes sense as a whole: shape validation cannot see that a block
 * points at an item that does not exist, or sorts by a tag nothing carries.
 */
function crossCheck(lesson: Lesson): string[] {
  const errors: string[] = []
  const seenItems = new Set<string>()
  for (const [i, item] of lesson.items.entries()) {
    if (seenItems.has(item.id)) errors.push(`items.${i}.id: duplicate item id "${item.id}"`)
    seenItems.add(item.id)
  }

  const seenBlocks = new Set<string>()
  for (const [i, block] of lesson.blocks.entries()) {
    const at = `blocks.${i}`
    if (seenBlocks.has(block.id)) errors.push(`${at}.id: duplicate block id "${block.id}"`)
    seenBlocks.add(block.id)

    if (block.type === 'finish') continue

    for (const id of missingIds(lesson, block.items)) {
      errors.push(`${at}.items: block "${block.id}" refers to unknown item "${id}"`)
    }
    const items = resolveItems(lesson, block.items)
    if (items.length === 0) {
      errors.push(`${at}.items: block "${block.id}" selects no items`)
      continue
    }

    const requireFace = (face: Face, field: string) => {
      const without = items.filter((it) => faceMissing(it, face, lesson))
      if (without.length > 0) {
        errors.push(
          `${at}.${field}: block "${block.id}" shows items by "${face}", but ` +
            `${without.map((it) => `"${it.id}"`).join(', ')} cannot render it`,
        )
      }
    }

    switch (block.type) {
      case 'cards':
        requireFace(block.front, 'front')
        break
      case 'match': {
        requireFace(block.left, 'left')
        requireFace(block.right, 'right')
        if (block.count !== undefined && block.count > items.length) {
          errors.push(
            `${at}.count: block "${block.id}" asks for ${block.count} pairs but selects ${items.length} items`,
          )
        }
        break
      }
      case 'sentence': {
        for (const [li, level] of block.levels.entries()) {
          for (const tag of tagsUsedByTemplate(level.template)) {
            const without = items.filter((it) => it.tags?.[tag] === undefined)
            if (without.length > 0) {
              errors.push(
                `${at}.levels.${li}.template: tag "${tag}" is missing on ` +
                  without.map((it) => `"${it.id}"`).join(', '),
              )
            }
          }
        }
        break
      }
      case 'sort': {
        const keys = new Set(block.buckets.map((b) => b.key))
        for (const [bi, bucket] of block.buckets.entries()) {
          if (!items.some((it) => it.tags?.[block.by] === bucket.key)) {
            errors.push(
              `${at}.buckets.${bi}.key: no selected item has ${block.by} = "${bucket.key}"`,
            )
          }
        }
        for (const item of items) {
          const value = item.tags?.[block.by]
          if (value === undefined) {
            errors.push(`${at}.by: item "${item.id}" has no "${block.by}" tag to sort by`)
          } else if (!keys.has(value)) {
            errors.push(
              `${at}.buckets: item "${item.id}" has ${block.by} = "${value}", which has no bucket`,
            )
          }
        }
        break
      }
      case 'listen': {
        const choices = block.choices ?? 4
        if (choices > items.length) {
          errors.push(
            `${at}.choices: block "${block.id}" offers ${choices} choices but selects ${items.length} items`,
          )
        }
        break
      }
      case 'tpr': {
        for (const tag of tagsUsedByTemplate(block.prompt)) {
          const without = items.filter((it) => it.tags?.[tag] === undefined)
          if (without.length > 0) {
            errors.push(
              `${at}.prompt: tag "${tag}" is missing on ` +
                without.map((it) => `"${it.id}"`).join(', '),
            )
          }
        }
        break
      }
    }
  }
  return errors
}

function faceMissing(item: Item, face: Face, lesson: Lesson): boolean {
  if (face === 'emoji') return item.emoji.length === 0
  if (face === 'en') return item.en.length === 0
  if (face === 'example') return item.example === undefined
  if (face === 'l1') return lesson.l1 === null || item.l1 === undefined
  const tag = tagOfFace(face)
  return tag === null || item.tags?.[tag] === undefined
}

/** Validates a lesson's shape and its internal references. Never throws. */
export function validateLesson(data: unknown): ValidationResult {
  const parsed = lessonSchema.safeParse(data)
  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.issues.map((issue) => {
        const path = issue.path.join('.')
        return path.length > 0 ? `${path}: ${issue.message}` : issue.message
      }),
    }
  }
  const lesson = parsed.data as Lesson
  const errors = crossCheck(lesson)
  return errors.length > 0 ? { ok: false, errors } : { ok: true, lesson }
}
