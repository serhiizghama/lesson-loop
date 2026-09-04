import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createClipPlayer, urlFor } from './clip'
import { createSpeech } from './speech'
import { clips } from './clips'

/** A line the generator has recorded, and one it never will. */
const RECORDED = 'dog'
const UNRECORDED = 'a line no lesson contains'

class FakeAudio {
  static made: FakeAudio[] = []
  currentTime = 0
  preload = ''
  paused = false
  loaded = false
  /** What `play()` should do: resolve, or reject with this DOMException-ish name. */
  static rejectWith: string | null = null
  private handlers: Record<string, Array<() => void>> = {}

  constructor(public src = '') {
    FakeAudio.made.push(this)
  }

  addEventListener(type: string, handler: () => void): void {
    ;(this.handlers[type] ??= []).push(handler)
  }

  emit(type: 'ended' | 'error'): void {
    for (const h of this.handlers[type] ?? []) h()
  }

  load(): void {
    this.loaded = true
  }

  pause(): void {
    this.paused = true
  }

  play(): Promise<void> {
    const name = FakeAudio.rejectWith
    return name === null ? Promise.resolve() : Promise.reject(Object.assign(new Error(name), { name }))
  }
}

/** Records what was fetched, which is how preloading is now observable. */
const fetched: string[] = []

function audioHost() {
  return {
    Audio: FakeAudio as unknown as new (src?: string) => HTMLAudioElement,
    fetch: (url: string) => {
      fetched.push(url)
      return Promise.resolve()
    },
  }
}

/** A host that can do both, so which source ran is a real question. */
function bothHost() {
  const spoken: Array<{ text: string }> = []
  const speechSynthesis = {
    speak: vi.fn((u: { text: string }) => spoken.push(u)),
    cancel: vi.fn(),
    resume: vi.fn(),
    getVoices: vi.fn(() => []),
  }
  class FakeUtterance {
    lang = ''
    rate = 1
    voice: unknown = null
    constructor(public text: string) {}
    addEventListener(): void {}
  }
  return {
    spoken,
    synth: speechSynthesis,
    host: {
      ...audioHost(),
      speechSynthesis: speechSynthesis as unknown as SpeechSynthesis,
      SpeechSynthesisUtterance: FakeUtterance as unknown as new (t: string) => SpeechSynthesisUtterance,
    },
  }
}

beforeEach(() => {
  FakeAudio.made = []
  FakeAudio.rejectWith = null
  fetched.length = 0
})

describe('the manifest', () => {
  it('has a recording for a word the lessons use', () => {
    expect(clips[RECORDED]).toBeDefined()
  })

  it('resolves a line to a path under the assets directory', () => {
    expect(urlFor(RECORDED)).toMatch(/^\/audio\/[0-9a-f]{16}\.m4a$/)
  })

  it('resolves a line it does not have to nothing', () => {
    expect(urlFor(UNRECORDED)).toBeNull()
  })
})

describe('playing a recording', () => {
  it('reports that it started once play() resolves', async () => {
    const player = createClipPlayer(audioHost())
    const events = { onStart: vi.fn(), onEnd: vi.fn(), onError: vi.fn() }

    expect(player.play(RECORDED, events)).toBe(true)
    await Promise.resolve()

    expect(events.onStart).toHaveBeenCalled()
    expect(FakeAudio.made.at(-1)?.src).toBe(urlFor(RECORDED))
  })

  it('reports the end when the clip finishes', async () => {
    const player = createClipPlayer(audioHost())
    const events = { onStart: vi.fn(), onEnd: vi.fn(), onError: vi.fn() }
    player.play(RECORDED, events)
    await Promise.resolve()

    FakeAudio.made.at(-1)?.emit('ended')
    expect(events.onEnd).toHaveBeenCalled()
  })

  it('refuses to play a line it has no recording for', () => {
    const player = createClipPlayer(audioHost())
    const events = { onStart: vi.fn(), onEnd: vi.fn(), onError: vi.fn() }
    expect(player.play(UNRECORDED, events)).toBe(false)
    expect(FakeAudio.made).toHaveLength(0)
  })

  it('calls a refusal a refusal, so the caller need not guess', async () => {
    FakeAudio.rejectWith = 'NotAllowedError'
    const player = createClipPlayer(audioHost())
    const events = { onStart: vi.fn(), onEnd: vi.fn(), onError: vi.fn() }
    player.play(RECORDED, events)
    await Promise.resolve()
    await Promise.resolve()

    expect(events.onError).toHaveBeenCalledWith(true)
  })

  it('calls a broken file something else, so the caller can fall back', async () => {
    const player = createClipPlayer(audioHost())
    const events = { onStart: vi.fn(), onEnd: vi.fn(), onError: vi.fn() }
    player.play(RECORDED, events)
    await Promise.resolve()

    FakeAudio.made.at(-1)?.emit('error')
    expect(events.onError).toHaveBeenCalledWith(false)
  })
})

describe('warming a lesson', () => {
  it('fetches exactly the lines it has recordings for, and nothing else', () => {
    const player = createClipPlayer(audioHost())
    player.preload([RECORDED, 'cat', UNRECORDED])

    expect(fetched).toEqual([urlFor(RECORDED), urlFor('cat')])
  })

  /**
   * Warming must not build media elements. A detached `Audio` is not reliably fetched by
   * Chrome, and holding one to replay from means playing a element that never finished
   * loading — which is exactly how this went wrong the first time.
   */
  it('warms the cache without constructing anything to play', () => {
    const player = createClipPlayer(audioHost())
    player.preload([RECORDED, 'cat'])
    expect(FakeAudio.made).toHaveLength(0)
  })

  it('asks for each line once however often a lesson is opened', () => {
    const player = createClipPlayer(audioHost())
    player.preload([RECORDED])
    player.preload([RECORDED])
    expect(fetched).toHaveLength(1)
  })

  it('does not saturate the connection pool with one lesson', () => {
    const player = createClipPlayer(audioHost())
    // Every recorded line at once — the real call site passes a whole lesson.
    player.preload(Object.keys(clips))
    // Only the first batch is in flight; the rest follow as those settle, so a word the
    // learner asks for now is not queued behind a hundred they have not reached.
    expect(fetched.length).toBeLessThanOrEqual(6)
    expect(fetched.length).toBeGreaterThan(0)
  })

  it('plays from a fresh element, so a slow warm-up cannot wedge a word', async () => {
    const player = createClipPlayer(audioHost())
    player.preload([RECORDED])
    const events = { onStart: vi.fn(), onEnd: vi.fn(), onError: vi.fn() }
    player.play(RECORDED, events)
    await Promise.resolve()

    expect(FakeAudio.made).toHaveLength(1)
    expect(events.onStart).toHaveBeenCalled()
  })

  it('ignores a warm-up that fails, since the line can still be synthesised', () => {
    const host = { ...audioHost(), fetch: () => Promise.reject(new Error('offline')) }
    const player = createClipPlayer(host)
    expect(() => player.preload([RECORDED])).not.toThrow()
  })
})

describe('choosing between the two sources', () => {
  it('plays the recording and never troubles the synthesiser', async () => {
    const fake = bothHost()
    const speech = createSpeech(fake.host)
    speech.speak(RECORDED)
    await Promise.resolve()

    expect(FakeAudio.made).toHaveLength(1)
    expect(fake.synth.speak).not.toHaveBeenCalled()
  })

  it('falls back to the synthesiser for a line with no recording', () => {
    const fake = bothHost()
    const speech = createSpeech(fake.host)
    speech.speak(UNRECORDED)

    expect(FakeAudio.made).toHaveLength(0)
    expect(fake.synth.speak).toHaveBeenCalled()
  })

  it('speaks a line whose recording is broken, rather than losing it', async () => {
    const fake = bothHost()
    const speech = createSpeech(fake.host)
    speech.speak(RECORDED)
    await Promise.resolve()

    FakeAudio.made.at(-1)?.emit('error')

    // The device is fine; only the file was not. The learner still hears the word.
    expect(fake.synth.speak).toHaveBeenCalled()
    expect(speech.getState().status).not.toBe('silent')
  })
})

describe('a refusal is answered at once, not after the grace period', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('reports the device mute without any timer being advanced', async () => {
    FakeAudio.rejectWith = 'NotAllowedError'
    const fake = bothHost()
    const speech = createSpeech(fake.host)

    speech.speak(RECORDED)
    await Promise.resolve()
    await Promise.resolve()

    // No vi.advanceTimersByTime: the point is that waiting is not required.
    expect(speech.getState().status).toBe('silent')
    expect(speech.getState().speaking).toBe(false)
    // And it did not spend 1500 ms in the synthesiser on the way to the same answer.
    expect(fake.synth.speak).not.toHaveBeenCalled()
  })

  it('lets the learner turn sound on afterwards, and believes it when it works', async () => {
    FakeAudio.rejectWith = 'NotAllowedError'
    const fake = bothHost()
    const speech = createSpeech(fake.host)
    speech.speak(RECORDED)
    await Promise.resolve()
    await Promise.resolve()
    expect(speech.getState().status).toBe('silent')

    // The gesture arrives; the browser stops refusing.
    FakeAudio.rejectWith = null
    speech.enable(RECORDED)
    await Promise.resolve()
    await Promise.resolve()

    expect(speech.getState().status).toBe('working')
    expect(speech.getState().enableAttempted).toBe(true)
  })
})

describe('a recording that stalls rather than failing', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  /** A play() that never settles: a half-deployed asset, or a connection that died. */
  class StallingAudio extends FakeAudio {
    override play(): Promise<void> {
      return new Promise(() => {})
    }
  }

  function stallingHost() {
    const fake = bothHost()
    return {
      ...fake,
      host: { ...fake.host, Audio: StallingAudio as unknown as new (src?: string) => HTMLAudioElement },
    }
  }

  it('gives the line to the synthesiser once the grace period is up', () => {
    const fake = stallingHost()
    const speech = createSpeech(fake.host)
    speech.speak(RECORDED)

    expect(fake.synth.speak).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1500)

    // The word is not abandoned while the device's own voice sits unused.
    expect(fake.synth.speak).toHaveBeenCalled()
    expect(speech.getState().status).not.toBe('silent')
  })

  it('only calls the device mute when that fallback stalls too', () => {
    const fake = stallingHost()
    const speech = createSpeech(fake.host)
    speech.speak(RECORDED)
    vi.advanceTimersByTime(1500)
    // The synthesiser now has its own grace period; it says nothing either.
    vi.advanceTimersByTime(1500)

    expect(speech.getState().status).toBe('silent')
  })

  it('has nothing to fall back to on a device that cannot synthesise', () => {
    const speech = createSpeech({
      Audio: StallingAudio as unknown as new (src?: string) => HTMLAudioElement,
      fetch: () => Promise.resolve(),
    })
    speech.speak(RECORDED)
    vi.advanceTimersByTime(1500)
    expect(speech.getState().status).toBe('silent')
  })
})

describe('a device that can only play recordings', () => {
  it('is not reported unsupported just because it cannot synthesise', () => {
    const speech = createSpeech(audioHost())
    expect(speech.getState().status).toBe('untested')
  })

  it('still speaks a recorded line', async () => {
    const speech = createSpeech(audioHost())
    speech.speak(RECORDED)
    await Promise.resolve()
    expect(FakeAudio.made).toHaveLength(1)
    expect(speech.getState().status).toBe('working')
  })
})
