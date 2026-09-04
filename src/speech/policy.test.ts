import { describe, expect, it, vi } from 'vitest'
import { quietable } from './policy'
import type { Speech, SpeechState } from './speech'

/**
 * The sound setting is one rule in one place (design D67), so this is where it is pinned.
 * What matters is the split: what the app volunteers stops, what the learner asked for
 * does not, and nothing else about speech is touched.
 */

const state: SpeechState = { status: 'working', speaking: false, enableAttempted: false }

function fakeSpeech(): Speech {
  return {
    speak: vi.fn(),
    quiet: false,
    enable: vi.fn(),
    getState: () => state,
    subscribe: () => () => {},
    cancel: vi.fn(),
    preload: vi.fn(),
  }
}

describe('quietable suppresses only what the app volunteers', () => {
  it('drops a volunteered line while muted', () => {
    const base = fakeSpeech()
    quietable(base, true).speak('dog', 'auto')
    expect(base.speak).not.toHaveBeenCalled()
  })

  // The default is the safe one: a call that says nothing about itself is the app
  // volunteering, so a block type added later is covered rather than exempt.
  it('drops a line that declares no intent while muted', () => {
    const base = fakeSpeech()
    quietable(base, true).speak('dog')
    expect(base.speak).not.toHaveBeenCalled()
  })

  it('speaks a line the learner asked for while muted', () => {
    const base = fakeSpeech()
    quietable(base, true).speak('dog', 'demand')
    expect(base.speak).toHaveBeenCalledWith('dog', 'demand')
  })

  it('speaks both while sound is on', () => {
    const base = fakeSpeech()
    const speech = quietable(base, false)
    speech.speak('dog')
    speech.speak('cat', 'demand')
    expect(base.speak).toHaveBeenNthCalledWith(1, 'dog', 'auto')
    expect(base.speak).toHaveBeenNthCalledWith(2, 'cat', 'demand')
  })

  it('reports whether it is suppressing, so a control can word itself', () => {
    expect(quietable(fakeSpeech(), true).quiet).toBe(true)
    expect(quietable(fakeSpeech(), false).quiet).toBe(false)
  })

  // `useSyncExternalStore` compares snapshots by identity, and `enable` is the offer a
  // device that will not speak needs — neither may be rebuilt or intercepted here.
  it('delegates everything but speak to the base, by reference, in both states', () => {
    const base = fakeSpeech()
    for (const speech of [quietable(base, true), quietable(base, false)]) {
      expect(speech.enable).toBe(base.enable)
      expect(speech.getState).toBe(base.getState)
      expect(speech.subscribe).toBe(base.subscribe)
      expect(speech.cancel).toBe(base.cancel)
      expect(speech.preload).toBe(base.preload)
    }
  })

  // Design D70: the identity is what re-runs the views' speaking effects when the setting
  // changes, so it must not be shared between the two states.
  it('is a different object for each setting', () => {
    const base = fakeSpeech()
    expect(quietable(base, true)).not.toBe(quietable(base, false))
    expect(quietable(base, false)).not.toBe(base)
  })
})
