import { describe, expect, it } from 'vitest'
import { articleFor, faceSpeech, faceValue, renderTemplate, tagsUsedByTemplate } from './text'
import type { Item } from './types'

const dog: Item = { id: 'dog', en: 'dog', emoji: '🐶', l1: { word: '犬' }, tags: { move: 'Run!' } }
const elephant: Item = { id: 'elephant', en: 'elephant', emoji: '🐘' }
const eyes: Item = { id: 'eyes', en: 'eyes', emoji: '👁️', plural: true }
const hour: Item = { id: 'hour', en: 'hour', emoji: '🕐', article: 'an' }
const unicorn: Item = { id: 'unicorn', en: 'unicorn', emoji: '🦄', article: 'a' }

const IT_IS = '{it} {be} {article} {en}.'

describe('sentence grammar', () => {
  it('uses "an" before a vowel', () => {
    expect(renderTemplate(IT_IS, elephant)).toBe('It is an elephant.')
  })

  it('uses "a" before a consonant', () => {
    expect(renderTemplate(IT_IS, dog)).toBe('It is a dog.')
  })

  it('uses the plural verb and drops the article', () => {
    expect(renderTemplate(IT_IS, eyes)).toBe('They are eyes.')
  })

  it('lets a declared article beat the vowel heuristic, both ways', () => {
    expect(renderTemplate(IT_IS, hour)).toBe('It is an hour.')
    expect(renderTemplate(IT_IS, unicorn)).toBe('It is a unicorn.')
    expect(articleFor(hour)).toBe('an')
    expect(articleFor(unicorn)).toBe('a')
  })

  it('agrees on this/these', () => {
    expect(renderTemplate('{this} {be} my {en}.', eyes)).toBe('These are my eyes.')
    expect(renderTemplate('{this} {be} my {en}.', dog)).toBe('This is my dog.')
  })

  it('renders the bare word at the first level', () => {
    expect(renderTemplate('{en}', dog)).toBe('dog')
  })
})

describe('templates over tags', () => {
  it('substitutes a tag', () => {
    expect(renderTemplate('{tag:move}', dog)).toBe('Run!')
  })

  it('reports the tags it reads, so a lesson can be validated', () => {
    expect(tagsUsedByTemplate('Say {tag:sound} like a {en}, then {tag:move}')).toEqual(['sound', 'move'])
  })

  it('leaves nothing behind for a tag the item lacks', () => {
    expect(renderTemplate('Go! {tag:move}', elephant)).toBe('Go!')
  })
})

describe('faces', () => {
  it('reads each fixed face', () => {
    expect(faceValue(dog, 'emoji')).toBe('🐶')
    expect(faceValue(dog, 'en')).toBe('dog')
    expect(faceValue(dog, 'l1')).toBe('犬')
  })

  it('reads a tag face', () => {
    expect(faceValue(dog, 'tag:move')).toBe('Run!')
  })

  it('returns null for a face the item cannot show', () => {
    expect(faceValue(elephant, 'l1')).toBeNull()
    expect(faceValue(elephant, 'example')).toBeNull()
    expect(faceValue(elephant, 'tag:move')).toBeNull()
  })
})

describe('uncountable nouns', () => {
  const hair: Item = { id: 'hair', en: 'hair', emoji: '💇', article: 'none' }

  it('takes no article and stays singular', () => {
    expect(renderTemplate(IT_IS, hair)).toBe('It is hair.')
    expect(articleFor(hair)).toBe('')
  })
})

describe('what a face says out loud', () => {
  it('names a picture by its English word', () => {
    expect(faceSpeech(dog, 'emoji')).toBe('dog')
  })

  it('reads a tag, which is the point of a themed exercise', () => {
    expect(faceSpeech(dog, 'tag:move')).toBe('Run!')
  })

  it('never reads the first-language gloss, which an English voice would mangle', () => {
    expect(faceSpeech(dog, 'l1')).toBeNull()
  })

  it('stays silent on a face the item cannot show', () => {
    expect(faceSpeech(elephant, 'tag:move')).toBeNull()
  })
})
