import { describe, expect, it } from 'vitest'
import { hashString, mulberry32, seedFor, shuffleWithSeed } from './rng'

const DECK = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j']

describe('seeded shuffling', () => {
  it('gives the same permutation for the same seed, every time', () => {
    const first = shuffleWithSeed(DECK, 12345)
    for (let i = 0; i < 100; i++) {
      expect(shuffleWithSeed(DECK, 12345)).toEqual(first)
    }
  })

  it('gives a different permutation for a different seed', () => {
    expect(shuffleWithSeed(DECK, 1)).not.toEqual(shuffleWithSeed(DECK, 2))
  })

  it('returns a permutation, losing and inventing nothing', () => {
    const shuffled = shuffleWithSeed(DECK, 777)
    expect([...shuffled].sort()).toEqual([...DECK].sort())
    expect(shuffled).toHaveLength(DECK.length)
  })

  it('does not mutate its input', () => {
    const original = [...DECK]
    shuffleWithSeed(DECK, 42)
    expect(DECK).toEqual(original)
  })

  it('handles empty and single-item inputs', () => {
    expect(shuffleWithSeed([], 1)).toEqual([])
    expect(shuffleWithSeed(['only'], 1)).toEqual(['only'])
  })
})

describe('seedFor', () => {
  it('separates blocks from one another', () => {
    expect(seedFor(99, 'match', 0)).not.toBe(seedFor(99, 'cards', 0))
  })

  it('separates reset generations, so a reset re-orders', () => {
    expect(seedFor(99, 'match', 0)).not.toBe(seedFor(99, 'match', 1))
  })

  it('separates salted uses within one block', () => {
    expect(seedFor(99, 'match', 0, 'a')).not.toBe(seedFor(99, 'match', 0, 'b'))
  })

  it('is stable for identical inputs', () => {
    expect(seedFor(99, 'match', 3, 'a')).toBe(seedFor(99, 'match', 3, 'a'))
  })
})

describe('mulberry32', () => {
  it('stays within [0, 1)', () => {
    const random = mulberry32(hashString('lesson-loop'))
    for (let i = 0; i < 1000; i++) {
      const value = random()
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(1)
    }
  })
})
