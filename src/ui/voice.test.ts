import { describe, expect, it, vi } from 'vitest'
import { withEffects } from './voice'
import type { Speech } from '@/speech/speech'
import type { Sound } from '@/sound/sound'

function fakeVoice() {
  return {
    speak: vi.fn(),
      quiet: false,
    enable: vi.fn(),
    getState: vi.fn(),
    subscribe: vi.fn(),
    cancel: vi.fn(),
    preload: vi.fn(),
  } as unknown as Speech & Record<string, ReturnType<typeof vi.fn>>
}

function fakeEffects() {
  return {
    chime: vi.fn(),
    notes: vi.fn(),
    stop: vi.fn(),
    enable: vi.fn(),
    isAvailable: vi.fn(() => true),
  } as unknown as Sound & Record<string, ReturnType<typeof vi.fn>>
}

describe('one offer, both outputs', () => {
  it('wakes the audio output as well as retrying speech', () => {
    const voice = fakeVoice()
    const effects = fakeEffects()

    withEffects(voice, effects).enable('dog')

    expect(effects.enable).toHaveBeenCalledTimes(1)
    expect(voice.enable).toHaveBeenCalledWith('dog')
  })

  it('leaves everything else pointing at the speech it wrapped', () => {
    const voice = fakeVoice()
    const wrapped = withEffects(voice, fakeEffects())

    // By reference on purpose: `ListenView` hands these to `useSyncExternalStore`, which
    // compares by identity and would resubscribe on every render otherwise.
    expect(wrapped.getState).toBe(voice.getState)
    expect(wrapped.subscribe).toBe(voice.subscribe)
    expect(wrapped.speak).toBe(voice.speak)
    expect(wrapped.cancel).toBe(voice.cancel)
    expect(wrapped.enable).not.toBe(voice.enable)
  })

  it('makes no sound of its own — it only wakes the output', () => {
    const effects = fakeEffects()
    withEffects(fakeVoice(), effects).enable('dog')

    expect(effects.chime).not.toHaveBeenCalled()
    expect(effects.notes).not.toHaveBeenCalled()
  })
})
