import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createSpeech } from './speech'

class FakeUtterance {
  lang = ''
  rate = 1
  volume = 1
  voice: unknown = null
  constructor(public text: string) {}
}

function fakeHost() {
  const queue: FakeUtterance[] = []
  const listeners: Record<string, () => void> = {}
  const speechSynthesis = {
    speak: vi.fn((u: FakeUtterance) => queue.push(u)),
    cancel: vi.fn(() => {
      queue.length = 0
    }),
    getVoices: vi.fn(() => [
      { lang: 'ja-JP', name: 'Kyoko' },
      { lang: 'en-US', name: 'Samantha' },
    ]),
  }
  return {
    queue,
    listeners,
    host: {
      speechSynthesis: speechSynthesis as unknown as SpeechSynthesis,
      SpeechSynthesisUtterance: FakeUtterance as unknown as new (t: string) => SpeechSynthesisUtterance,
      addEventListener: ((type: string, handler: () => void) => {
        listeners[type] = handler
      }) as unknown as Window['addEventListener'],
    },
    synth: speechSynthesis,
  }
}

describe('speaking', () => {
  let fake: ReturnType<typeof fakeHost>

  beforeEach(() => {
    fake = fakeHost()
  })

  it('speaks English at a learner-friendly rate', () => {
    const speech = createSpeech(fake.host)
    speech.speak('dog')
    const spoken = fake.queue.at(-1)
    expect(spoken?.text).toBe('dog')
    expect(spoken?.lang).toBe('en-US')
    expect(spoken?.rate).toBeLessThan(1)
  })

  it('prefers an English voice when one has arrived', () => {
    const speech = createSpeech(fake.host)
    speech.speak('dog')
    expect((fake.queue.at(-1)?.voice as { name: string } | null)?.name).toBe('Samantha')
  })

  it('cancels what is speaking before starting the next word', () => {
    const speech = createSpeech(fake.host)
    speech.speak('dog')
    speech.speak('cat')
    expect(fake.synth.cancel).toHaveBeenCalled()
  })

  it('leaves exactly one utterance queued after four rapid taps', () => {
    const speech = createSpeech(fake.host)
    for (const word of ['dog', 'cat', 'lion', 'bear']) speech.speak(word)
    expect(fake.queue).toHaveLength(1)
    expect(fake.queue[0]?.text).toBe('bear')
  })

  it('ignores empty text', () => {
    const speech = createSpeech(fake.host)
    speech.speak('   ')
    expect(fake.synth.speak).not.toHaveBeenCalled()
  })
})

describe('priming', () => {
  it('unlocks on the first gesture and only once, however many arrive', () => {
    const fake = fakeHost()
    const speech = createSpeech(fake.host)
    speech.prime()
    speech.prime()

    const onGesture = fake.listeners['pointerdown']
    expect(onGesture).toBeDefined()
    onGesture?.()
    onGesture?.()
    onGesture?.()

    // One silent unlock utterance, not three.
    expect(fake.synth.speak).toHaveBeenCalledTimes(1)
    expect(fake.queue[0]?.volume).toBe(0)
  })

  it('makes the first real word audible right after the gesture', () => {
    const fake = fakeHost()
    const speech = createSpeech(fake.host)
    speech.prime()
    fake.listeners['pointerdown']?.()
    speech.speak('dog')
    expect(fake.queue).toHaveLength(1)
    expect(fake.queue[0]?.text).toBe('dog')
    expect(fake.queue[0]?.volume).toBe(1)
  })
})

describe('a device that cannot speak', () => {
  it('reports itself unavailable', () => {
    expect(createSpeech({}).isAvailable()).toBe(false)
  })

  it('stays silent instead of throwing', () => {
    const speech = createSpeech({})
    expect(() => {
      speech.prime()
      speech.speak('dog')
      speech.cancel()
    }).not.toThrow()
  })
})
