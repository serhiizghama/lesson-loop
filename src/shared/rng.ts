/**
 * Deterministic randomness (design D3).
 *
 * Every shuffled order in the app is derived from the lesson state's seed, never from
 * `Math.random` at render time. Two devices holding the same state must lay the cards
 * out in the same order — that is the whole point of this file.
 */

/** Small, fast, well-distributed PRNG. Returns values in [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** FNV-1a, so a block id can contribute to a seed. */
export function hashString(text: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

/**
 * The seed a given block uses. `generation` is the block's reset count, so resetting
 * yields a genuinely different order while the transition stays pure.
 */
export function seedFor(seed: number, blockId: string, generation: number, salt = ''): number {
  return (seed ^ hashString(`${blockId}#${generation}#${salt}`)) >>> 0
}

/** Fisher-Yates, driven by the seed. Never mutates its input. */
export function shuffleWithSeed<T>(items: readonly T[], seed: number): T[] {
  const random = mulberry32(seed)
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    const a = out[i] as T
    const b = out[j] as T
    out[i] = b
    out[j] = a
  }
  return out
}
