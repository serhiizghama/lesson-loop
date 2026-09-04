import { describe, expect, it, vi } from 'vitest'
import { quietSound } from './policy'
import type { Sound } from './sound'

function fakeSound(): Sound & { [K in keyof Sound]: ReturnType<typeof vi.fn> } {
  return {
    chime: vi.fn(),
    notes: vi.fn(),
    stop: vi.fn(),
    enable: vi.fn(),
    isAvailable: vi.fn(() => true),
  } as unknown as Sound & { [K in keyof Sound]: ReturnType<typeof vi.fn> }
}

describe('a quiet lesson makes no effects', () => {
  it('drops the chime while muted', () => {
    const base = fakeSound()
    quietSound(base, true).chime()
    expect(base.chime).not.toHaveBeenCalled()
  })

  it("drops the closing screen's notes while muted", () => {
    const base = fakeSound()
    quietSound(base, true).notes(5, 250)
    expect(base.notes).not.toHaveBeenCalled()
  })

  it('lets both through while the sound is on', () => {
    const base = fakeSound()
    const sound = quietSound(base, false)
    sound.chime()
    sound.notes(5, 250)

    expect(base.chime).toHaveBeenCalledTimes(1)
    expect(base.notes).toHaveBeenCalledWith(5, 250)
  })
})

describe('what the setting deliberately does not suppress', () => {
  it('still stops a sound already in the air, which is how the setting takes effect', () => {
    const base = fakeSound()
    quietSound(base, true).stop()
    expect(base.stop).toHaveBeenCalled()
  })

  it('still wakes the output when the learner takes the offer to turn sound on', () => {
    const base = fakeSound()
    quietSound(base, true).enable()
    expect(base.enable).toHaveBeenCalled()
  })

  it('reports the device the same way whether or not the lesson is quiet', () => {
    const base = fakeSound()
    expect(quietSound(base, true).isAvailable()).toBe(true)
    expect(quietSound(base, false).isAvailable()).toBe(true)
  })
})

describe('the wrapper carries the setting in its identity', () => {
  it('is a different object for each setting, so memoising on `muted` re-runs its users', () => {
    const base = fakeSound()
    expect(quietSound(base, true)).not.toBe(quietSound(base, false))
    expect(quietSound(base, true)).not.toBe(quietSound(base, true))
  })

  it('delegates everything but the two effects to the base, by reference', () => {
    const base = fakeSound()
    const sound = quietSound(base, true)

    expect(sound.stop).toBe(base.stop)
    expect(sound.enable).toBe(base.enable)
    expect(sound.isAvailable).toBe(base.isAvailable)
    expect(sound.chime).not.toBe(base.chime)
    expect(sound.notes).not.toBe(base.notes)
  })
})
