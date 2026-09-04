import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createSpeech } from './speech'

/**
 * The fake is event-accurate on purpose: the bug this module exists to prevent is only
 * visible in the gap between "the engine took the utterance" and "the engine started
 * speaking it", so a fake that starts instantly would hide it. Nothing here fires an
 * event on its own — every test says exactly when the engine responds, including the
 * wedged case, which responds never.
 */
class FakeUtterance {
  lang = ''
  rate = 1
  voice: unknown = null
  private handlers: Record<string, Array<() => void>> = {}

  constructor(public text: string) {}

  addEventListener(type: string, handler: () => void): void {
    ;(this.handlers[type] ??= []).push(handler)
  }

  emit(type: 'start' | 'end' | 'error'): void {
    for (const handler of this.handlers[type] ?? []) handler()
  }
}

function fakeHost() {
  const spoken: FakeUtterance[] = []
  const speechSynthesis = {
    speak: vi.fn((u: FakeUtterance) => spoken.push(u)),
    cancel: vi.fn(),
    resume: vi.fn(),
    getVoices: vi.fn(() => [
      { lang: 'ja-JP', name: 'Kyoko' },
      { lang: 'en-US', name: 'Samantha' },
    ]),
  }
  return {
    spoken,
    synth: speechSynthesis,
    /** The utterance the engine is currently holding. */
    last: () => spoken.at(-1) as FakeUtterance,
    host: {
      speechSynthesis: speechSynthesis as unknown as SpeechSynthesis,
      SpeechSynthesisUtterance: FakeUtterance as unknown as new (t: string) => SpeechSynthesisUtterance,
    },
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
    expect(fake.last().text).toBe('dog')
    expect(fake.last().lang).toBe('en-US')
    expect(fake.last().rate).toBeLessThan(1)
  })

  it('prefers an English voice when one has arrived', () => {
    const speech = createSpeech(fake.host)
    speech.speak('dog')
    expect((fake.last().voice as { name: string } | null)?.name).toBe('Samantha')
  })

  it('ignores empty text', () => {
    const speech = createSpeech(fake.host)
    speech.speak('   ')
    expect(fake.synth.speak).not.toHaveBeenCalled()
  })

  it('speaks the next word once the previous one has finished', () => {
    const speech = createSpeech(fake.host)
    speech.speak('dog')
    fake.last().emit('start')
    fake.last().emit('end')
    speech.speak('cat')
    expect(fake.spoken.map((u) => u.text)).toEqual(['dog', 'cat'])
  })
})

describe('replacing a word already in progress', () => {
  let fake: ReturnType<typeof fakeHost>

  beforeEach(() => {
    fake = fakeHost()
  })

  it('cancels one that has started, because that is the safe moment', () => {
    const speech = createSpeech(fake.host)
    speech.speak('dog')
    fake.last().emit('start')
    speech.speak('cat')
    expect(fake.synth.cancel).toHaveBeenCalled()
    expect(fake.last().text).toBe('cat')
  })

  /**
   * The regression test for the bug this change exists to fix: cancelling an utterance
   * the engine has accepted but not started wedges Chrome's speech engine for the rest of
   * the session, and nothing — in this app or outside it — speaks again.
   */
  it('never cancels one that has not started', () => {
    const speech = createSpeech(fake.host)
    speech.speak('dog')
    // No `start` yet: the engine has it, but has not begun.
    speech.speak('cat')

    expect(fake.synth.cancel).not.toHaveBeenCalled()
    expect(fake.spoken).toHaveLength(1)
    expect(fake.spoken[0]?.text).toBe('dog')
  })

  it('never cancels an unstarted utterance however many words arrive', () => {
    const speech = createSpeech(fake.host)
    for (const word of ['dog', 'cat', 'lion', 'bear']) speech.speak(word)
    expect(fake.synth.cancel).not.toHaveBeenCalled()
    expect(fake.spoken).toHaveLength(1)
  })

  it('hands over to the word held back, as soon as starting makes it safe', () => {
    const speech = createSpeech(fake.host)
    speech.speak('dog')
    speech.speak('cat')

    fake.last().emit('start')

    expect(fake.synth.cancel).toHaveBeenCalledTimes(1)
    expect(fake.last().text).toBe('cat')
  })

  it('leaves exactly one word after four rapid taps — the last', () => {
    const speech = createSpeech(fake.host)
    for (const word of ['dog', 'cat', 'lion', 'bear']) speech.speak(word)

    fake.last().emit('start')

    expect(fake.spoken.map((u) => u.text)).toEqual(['dog', 'bear'])
    expect(fake.last().text).toBe('bear')
  })

  it('speaks the held word directly when the first one ends on its own', () => {
    const speech = createSpeech(fake.host)
    speech.speak('dog')
    speech.speak('cat')

    fake.last().emit('end')

    expect(fake.synth.cancel).not.toHaveBeenCalled()
    expect(fake.last().text).toBe('cat')
  })

  it('does not read a word it cancelled itself as proof the device is mute', () => {
    const speech = createSpeech(fake.host)
    speech.speak('dog')
    const dog = fake.last()
    dog.emit('start')
    speech.speak('cat')
    // Chrome reports `error: canceled` on the utterance we replaced.
    dog.emit('error')

    expect(speech.getState().status).not.toBe('silent')
  })
})

describe('noticing that the device did not speak', () => {
  let fake: ReturnType<typeof fakeHost>

  beforeEach(() => {
    fake = fakeHost()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts out having proven nothing either way', () => {
    const speech = createSpeech(fake.host)
    expect(speech.getState().status).toBe('untested')
  })

  it('calls a device mute when the word never starts', () => {
    const speech = createSpeech(fake.host)
    speech.speak('dog')
    expect(speech.getState().status).toBe('untested')

    vi.advanceTimersByTime(1500)

    expect(speech.getState().status).toBe('silent')
    expect(speech.getState().speaking).toBe(false)
  })

  it('calls a device working the moment a word actually starts', () => {
    const speech = createSpeech(fake.host)
    speech.speak('dog')
    fake.last().emit('start')

    expect(speech.getState().status).toBe('working')

    vi.advanceTimersByTime(5000)

    // The watchdog must not fire behind a word that did start.
    expect(speech.getState().status).toBe('working')
  })

  it('calls a device mute when the word reports a failure', () => {
    const speech = createSpeech(fake.host)
    speech.speak('dog')
    fake.last().emit('error')
    expect(speech.getState().status).toBe('silent')
  })
})

describe('reporting what it is doing', () => {
  let fake: ReturnType<typeof fakeHost>

  beforeEach(() => {
    fake = fakeHost()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('tells a subscriber when a word starts and when it stops', () => {
    const speech = createSpeech(fake.host)
    const seen: boolean[] = []
    speech.subscribe(() => seen.push(speech.getState().speaking))

    speech.speak('dog')
    fake.last().emit('start')
    fake.last().emit('end')

    expect(seen.at(0)).toBe(true)
    expect(seen.at(-1)).toBe(false)
  })

  it('stops telling a subscriber that unsubscribed', () => {
    const speech = createSpeech(fake.host)
    const listener = vi.fn()
    const unsubscribe = speech.subscribe(listener)

    speech.speak('dog')
    expect(listener).toHaveBeenCalled()

    unsubscribe()
    listener.mockClear()
    fake.last().emit('start')
    expect(listener).not.toHaveBeenCalled()
  })

  it('hands out the same state object until something actually changes', () => {
    const speech = createSpeech(fake.host)
    expect(speech.getState()).toBe(speech.getState())
  })
})

describe('turning sound on from a gesture', () => {
  let fake: ReturnType<typeof fakeHost>

  beforeEach(() => {
    fake = fakeHost()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  /** The student's screen: turned by the teacher, never tapped, so Chrome refuses. */
  function silenced() {
    const speech = createSpeech(fake.host)
    speech.speak('dog')
    vi.advanceTimersByTime(1500)
    expect(speech.getState().status).toBe('silent')
    return speech
  }

  it('speaks again, and clears the verdict when it works', () => {
    const speech = silenced()
    speech.enable('dog')
    fake.last().emit('start')

    expect(fake.last().text).toBe('dog')
    expect(speech.getState().status).toBe('working')
    expect(speech.getState().enableAttempted).toBe(true)
  })

  it('remembers it was tried when it still does not work', () => {
    const speech = silenced()
    speech.enable('dog')
    vi.advanceTimersByTime(1500)

    expect(speech.getState().status).toBe('silent')
    expect(speech.getState().enableAttempted).toBe(true)
  })

  /**
   * Cancelling an unstarted utterance is the wedge, and it was measured not to revive an
   * engine that is already wedged — so `enable` must not reach for it (design D43).
   */
  it('does not cancel on the way in', () => {
    const speech = silenced()
    fake.synth.cancel.mockClear()
    speech.enable('dog')
    expect(fake.synth.cancel).not.toHaveBeenCalled()
    expect(fake.synth.resume).toHaveBeenCalled()
  })
})

describe('leaving a block', () => {
  let fake: ReturnType<typeof fakeHost>

  beforeEach(() => {
    fake = fakeHost()
  })

  it('stops a word that is speaking', () => {
    const speech = createSpeech(fake.host)
    speech.speak('dog')
    fake.last().emit('start')
    speech.cancel()

    expect(fake.synth.cancel).toHaveBeenCalled()
    expect(speech.getState().speaking).toBe(false)
  })

  it('waits for an unstarted word to start before stopping it', () => {
    const speech = createSpeech(fake.host)
    speech.speak('dog')
    speech.cancel()

    // Still not safe to cancel — the engine has not begun.
    expect(fake.synth.cancel).not.toHaveBeenCalled()

    fake.last().emit('start')

    expect(fake.synth.cancel).toHaveBeenCalledTimes(1)
    expect(speech.getState().speaking).toBe(false)
    expect(fake.spoken).toHaveLength(1)
  })
})

describe('a device that cannot speak', () => {
  it('reports itself unsupported', () => {
    expect(createSpeech({}).getState().status).toBe('unsupported')
  })

  it('stays silent instead of throwing', () => {
    const speech = createSpeech({})
    expect(() => {
      speech.speak('dog')
      speech.enable('dog')
      speech.cancel()
      speech.subscribe(() => {})()
    }).not.toThrow()
  })

  it('records that the offer was taken even though it cannot help', () => {
    const speech = createSpeech({})
    speech.enable('dog')
    expect(speech.getState().status).toBe('unsupported')
    expect(speech.getState().enableAttempted).toBe(true)
  })
})
