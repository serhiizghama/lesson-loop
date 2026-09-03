import type { Face, Item, Lesson } from './types'

/**
 * The article for an item. Declared beats guessed (design D5) — the vowel-letter
 * heuristic is only the fallback, because "an hour" and "a unicorn" defeat it.
 */
export function articleFor(item: Item): string {
  if (item.plural) return ''
  if (item.article === 'none') return ''
  if (item.article) return item.article
  return /^[aeiou]/i.test(item.en) ? 'an' : 'a'
}

/** The text an item shows through a given face, or null when it has none. */
export function faceValue(item: Item, face: Face): string | null {
  if (face === 'emoji') return item.emoji
  if (face === 'en') return item.en
  if (face === 'example') return item.example ?? null
  if (face === 'l1') return item.l1?.word ?? null
  const tag = face.slice('tag:'.length)
  return item.tags?.[tag] ?? null
}

const TAG_PLACEHOLDER = /\{tag:([A-Za-z0-9_-]+)\}/g

/**
 * Fills a sentence or prompt template for one item.
 * Placeholders: {en} {article} {it} {be} {this} {l1} {tag:name}
 */
export function renderTemplate(template: string, item: Item): string {
  const plural = item.plural === true
  const filled = template
    .replace(TAG_PLACEHOLDER, (_m, tag: string) => item.tags?.[tag] ?? '')
    .replaceAll('{en}', item.en)
    .replaceAll('{article}', articleFor(item))
    .replaceAll('{it}', plural ? 'They' : 'It')
    .replaceAll('{be}', plural ? 'are' : 'is')
    .replaceAll('{this}', plural ? 'These' : 'This')
    .replaceAll('{l1}', item.l1?.word ?? '')
  // An empty article leaves a double space; punctuation must stay tight.
  return filled
    .replace(/\s+/g, ' ')
    .replace(/\s+([.!?,])/g, '$1')
    .trim()
}

/** Every tag name a template reads, so a lesson can be validated against it. */
export function tagsUsedByTemplate(template: string): string[] {
  return [...template.matchAll(TAG_PLACEHOLDER)].map((m) => m[1] as string)
}

/** The tag name a face reads, if it reads one. */
export function tagOfFace(face: Face): string | null {
  return face.startsWith('tag:') ? face.slice('tag:'.length) : null
}

export function itemById(lesson: Lesson, id: string): Item | undefined {
  return lesson.items.find((i) => i.id === id)
}
