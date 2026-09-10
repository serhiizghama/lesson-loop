import { z } from 'zod'
import type { Face, Item, ItemRef, Lesson, Spot } from './types'
import { WHOLE, choicesOf, narrow } from './narrow'
import { SCENE_IDS, SCENES } from './scenes'
import { faceValue, renderTemplate, tagOfFace, tagsUsedByTemplate } from './text'

const FIXED_FACES = ['emoji', 'en', 'l1', 'example'] as const

const faceSchema = z.custom<Face>(
  (v) =>
    typeof v === 'string' &&
    ((FIXED_FACES as readonly string[]).includes(v) || /^tag:[A-Za-z0-9_-]+$/.test(v)),
  { message: "must be 'emoji', 'en', 'l1', 'example' or 'tag:<name>'" },
)

const idSchema = z.string().min(1).regex(/^[a-z0-9-]+$/, 'must be lowercase kebab-case')

/**
 * A lesson's own id: a topic's, or a topic's plus the size it was built to — `animals`
 * or `animals/wild`. The second form never appears in a file; it is what `narrow` gives
 * the lesson it builds, and a built lesson is validated like any other when it arrives
 * over the wire (`protocol.ts`).
 */
const lessonIdSchema = z
  .string()
  .min(1)
  .regex(/^[a-z0-9-]+(?:\/[a-z0-9-]+)?$/, 'must be lowercase kebab-case, optionally <topic>/<size>')

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
  z.object({ select: z.literal('new') }),
])

const blockBase = {
  id: idSchema,
  title: z.string().min(1),
  hint: z.string().min(1).optional(),
  // The parts a block belongs to. Absent means every sitting; empty would mean none,
  // which is a block nobody could reach.
  only: z.array(idSchema).min(1).optional(),
}

/**
 * A part names its own items; whether those names mean anything is `checkParts`' job,
 * which reports a part naming nothing, or naming an item the topic does not declare, by
 * name (design D6).
 */
const partSchema = z.object({
  id: idSchema,
  title: z.string().min(1),
  emoji: z.string().min(1),
  items: z.array(idSchema),
})

const questionSchema = z.object({ label: z.string().min(1), face: faceSchema })

/** A place on a drawing: x, y, width, height as fractions of it (design D126). */
const spotSchema = z.tuple([z.number(), z.number(), z.number(), z.number()])

const blockSchema = z.discriminatedUnion('type', [
  z.object({
    ...blockBase,
    type: z.literal('cards'),
    items: itemRefSchema,
    front: faceSchema,
    back: z.array(faceSchema).min(1),
    speak: z.string().min(1).optional(),
  }),
  z.object({
    ...blockBase,
    type: z.literal('match'),
    items: itemRefSchema,
    left: faceSchema,
    right: faceSchema,
    count: z.number().int().min(2).optional(),
    speak: z.string().min(1).optional(),
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
  z.object({
    ...blockBase,
    type: z.literal('phrases'),
    lines: z.array(z.string().min(1)).min(1),
  }),
  z.object({
    ...blockBase,
    type: z.literal('quiz'),
    items: itemRefSchema,
    ask: faceSchema,
    show: faceSchema,
    count: z.number().int().min(2).optional(),
    speak: z.string().min(1).optional(),
  }),
  z.object({
    ...blockBase,
    type: z.literal('describe'),
    items: itemRefSchema,
    questions: z.tuple([questionSchema, questionSchema]),
    sentence: z.string().min(1),
  }),
  z.object({
    ...blockBase,
    type: z.literal('hotspot'),
    items: itemRefSchema,
    scene: z.enum(SCENE_IDS),
    spots: z.record(idSchema, spotSchema),
    speak: z.string().min(1).optional(),
  }),
  z.object({
    ...blockBase,
    type: z.literal('memory'),
    items: itemRefSchema,
    left: faceSchema,
    right: faceSchema,
    count: z.number().int().min(2).optional(),
    speak: z.string().min(1).optional(),
  }),
  z.object({
    ...blockBase,
    type: z.literal('scramble'),
    items: itemRefSchema,
    template: z.string().min(1),
  }),
  z.object({ ...blockBase, type: z.literal('finish'), message: z.string().min(1) }),
])

const lessonSchema = z.object({
  id: lessonIdSchema,
  title: z.string().min(1),
  emoji: z.string().min(1),
  audience: z.enum(['kids', 'teens', 'adults']),
  l1: z.enum(['ja']).nullable(),
  items: z.array(itemSchema).min(1),
  blocks: z.array(blockSchema).min(1),
  // Two or more, because one part is no division of a topic: it would offer the teacher
  // the same lesson under two names.
  parts: z.array(partSchema).min(2).optional(),
})

export type ValidationResult =
  | { ok: true; lesson: Lesson }
  | { ok: false; errors: string[] }

/**
 * Resolves the items a block works on, in a stable, declared order.
 *
 * `select: 'new'` never reaches here: it is a topic's way of saying "the words this
 * sitting teaches", and `narrow` has resolved it to identifiers before anything is
 * played. Reaching it is a bug, so it throws rather than guessing (design D1).
 */
export function resolveItems(lesson: Lesson, ref: ItemRef, block?: string): Item[] {
  if (ref.select === 'all') return lesson.items
  if (ref.select === 'tag') return lesson.items.filter((i) => i.tags?.[ref.tag] !== undefined)
  if (ref.select === 'new') {
    throw new Error(
      `block "${block ?? '?'}" selects the words the sitting teaches, but this lesson was ` +
        `never narrowed to a size`,
    )
  }
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

    // Neither works on vocabulary: the closing slide has none, and a phrase list carries
    // its own literal text (design D119).
    if (block.type === 'finish' || block.type === 'phrases') continue

    for (const id of missingIds(lesson, block.items)) {
      errors.push(`${at}.items: block "${block.id}" refers to unknown item "${id}"`)
    }
    const items = resolveItems(lesson, block.items, block.id)
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

    const requireTemplateTags = (template: string, field: string) => {
      for (const tag of tagsUsedByTemplate(template)) {
        const without = items.filter((it) => it.tags?.[tag] === undefined)
        if (without.length > 0) {
          errors.push(
            `${at}.${field}: tag "${tag}" is missing on ` +
              without.map((it) => `"${it.id}"`).join(', '),
          )
        }
      }
    }

    switch (block.type) {
      case 'cards':
        requireFace(block.front, 'front')
        if (block.speak !== undefined) requireTemplateTags(block.speak, 'speak')
        break
      case 'match': {
        requireFace(block.left, 'left')
        requireFace(block.right, 'right')
        if (block.count !== undefined && block.count > items.length) {
          errors.push(
            `${at}.count: block "${block.id}" asks for ${block.count} pairs but selects ${items.length} items`,
          )
        }
        if (block.speak !== undefined) requireTemplateTags(block.speak, 'speak')
        break
      }
      case 'sentence': {
        for (const [li, level] of block.levels.entries()) {
          requireTemplateTags(level.template, `levels.${li}.template`)
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
        requireTemplateTags(block.prompt, 'prompt')
        break
      }
      case 'quiz': {
        requireFace(block.ask, 'ask')
        requireFace(block.show, 'show')
        if (block.ask === block.show) {
          errors.push(
            `${at}.ask: block "${block.id}" asks and shows by the same face "${block.ask}", ` +
              `which prints the answer in the question`,
          )
        }
        const choices = block.count ?? 4
        if (choices > items.length) {
          errors.push(
            `${at}.count: block "${block.id}" offers ${choices} choices but selects ${items.length} items`,
          )
        }
        if (block.speak !== undefined) requireTemplateTags(block.speak, 'speak')
        break
      }
      case 'hotspot': {
        for (const item of items) {
          const spot = block.spots[item.id]
          if (spot === undefined) {
            errors.push(
              `${at}.spots: block "${block.id}" selects "${item.id}" but gives it no place ` +
                `on the drawing`,
            )
            continue
          }
          const [x, y, w, h] = spot
          if (w <= 0 || h <= 0) {
            errors.push(
              `${at}.spots.${item.id}: block "${block.id}" gives "${item.id}" a place with ` +
                `no width or height`,
            )
          } else if (x < 0 || y < 0 || x + w > 1 || y + h > 1) {
            errors.push(
              `${at}.spots.${item.id}: block "${block.id}" puts "${item.id}" outside the drawing`,
            )
          }
        }
        // Two words on one place cannot both be placed, so one of them could never be
        // answered — and nothing else in the format would catch it (design D126).
        for (const [ai, a] of items.entries()) {
          for (const b of items.slice(ai + 1)) {
            const one = block.spots[a.id]
            const two = block.spots[b.id]
            if (one === undefined || two === undefined) continue
            if (tooClose(one, two, block.scene)) {
              errors.push(
                `${at}.spots: block "${block.id}" puts "${a.id}" and "${b.id}" in the same ` +
                  `place on the drawing, so one of them could never be placed`,
              )
            }
          }
        }
        if (block.speak !== undefined) requireTemplateTags(block.speak, 'speak')
        break
      }
      case 'memory': {
        requireFace(block.left, 'left')
        requireFace(block.right, 'right')
        if (block.count !== undefined && block.count > items.length) {
          errors.push(
            `${at}.count: block "${block.id}" asks for ${block.count} pairs but selects ${items.length} items`,
          )
        }
        if (block.speak !== undefined) requireTemplateTags(block.speak, 'speak')
        break
      }
      case 'scramble': {
        requireTemplateTags(block.template, 'template')
        for (const item of items) {
          const words = renderTemplate(block.template, item).split(' ').filter((w) => w.length > 0)
          if (words.length < 2) {
            errors.push(
              `${at}.template: block "${block.id}" renders to "${words.join(' ')}" for ` +
                `"${item.id}" — a one-word sentence is nothing to assemble`,
            )
          }
        }
        break
      }
      case 'describe': {
        for (const [qi, question] of block.questions.entries()) {
          requireFace(question.face, `questions.${qi}.face`)
          const values = new Set(items.map((it) => faceValue(it, question.face)))
          if (values.size === 1) {
            errors.push(
              `${at}.questions.${qi}.face: every selected item has "${question.face}" = ` +
                `"${[...values][0]}" — a question with one answer is not a question`,
            )
          }
        }
        const [first, second] = block.questions
        if (first.face === second.face) {
          errors.push(
            `${at}.questions: block "${block.id}" asks the same thing twice, by "${first.face}"`,
          )
        }
        requireTemplateTags(block.sentence, 'sentence')
        break
      }
    }
  }
  return errors
}

/**
 * Whether two places would land under one finger. Uses the same separation the views rely
 * on to tell enlarged targets apart (design D128), measured in the scene's own space.
 */
function tooClose(a: Spot, b: Spot, scene: keyof typeof SCENES): boolean {
  const size = SCENES[scene]
  const dx = (a[0] + a[2] / 2 - (b[0] + b[2] / 2)) * size.width
  const dy = (a[1] + a[3] / 2 - (b[1] + b[3] / 2)) * size.height
  return Math.hypot(dx, dy) < MIN_APART
}

/** How far apart two places must be, in a scene's own coordinates (design D128). */
const MIN_APART = 110

function faceMissing(item: Item, face: Face, lesson: Lesson): boolean {
  if (face === 'emoji') return item.emoji.length === 0
  if (face === 'en') return item.en.length === 0
  if (face === 'example') return item.example === undefined
  if (face === 'l1') return lesson.l1 === null || item.l1 === undefined
  const tag = tagOfFace(face)
  return tag === null || item.tags?.[tag] === undefined
}

/**
 * Checks the parts themselves, before anything is narrowed: a malformed `parts` makes
 * every size derived from it meaningless, so these run first and alone (design D6).
 */
function checkParts(lesson: Lesson): string[] {
  const errors: string[] = []
  const parts = lesson.parts ?? []
  const partIds = new Set<string>()
  const known = new Set(lesson.items.map((i) => i.id))
  const claimed = new Map<string, string>()

  for (const [i, part] of parts.entries()) {
    const at = `parts.${i}`
    if (partIds.has(part.id)) errors.push(`${at}.id: duplicate part id "${part.id}"`)
    partIds.add(part.id)

    if (part.items.length === 0) {
      errors.push(`${at}.items: part "${part.id}" names no items, so it is no sitting at all`)
    }
    for (const id of part.items) {
      if (!known.has(id)) {
        errors.push(`${at}.items: part "${part.id}" names unknown item "${id}"`)
        continue
      }
      const owner = claimed.get(id)
      if (owner === undefined) claimed.set(id, part.id)
      else {
        errors.push(
          `${at}.items: item "${id}" is named by part "${owner}" as well as part "${part.id}"`,
        )
      }
    }
  }

  for (const [i, block] of lesson.blocks.entries()) {
    for (const id of block.only ?? []) {
      if (!partIds.has(id)) {
        errors.push(
          `blocks.${i}.only: block "${block.id}" belongs to part "${id}", which the topic ` +
            `does not declare`,
        )
      }
    }
  }
  return errors
}

/**
 * Validates a lesson's shape and its internal references, at every size it offers.
 *
 * A topic can be sound as written and unsound as a sitting — a sorting exercise whose
 * buckets all fill from one part is no question at all once that part is played alone —
 * so the cross-checks run over each derived lesson rather than over the file (design D6).
 * Never throws.
 */
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

  const structural = checkParts(lesson)
  if (structural.length > 0) return { ok: false, errors: structural }

  const sizes = lesson.parts === undefined ? [WHOLE] : choicesOf(lesson).map((c) => c.id)
  const errors = sizes.flatMap((size) => {
    const built = crossCheck(narrow(lesson, size))
    // An un-parted topic has one size and no name for it: its errors read as they always did.
    if (lesson.parts === undefined) return built
    return built.map((error) => `size "${size}": ${error}`)
  })
  return errors.length > 0 ? { ok: false, errors } : { ok: true, lesson }
}
