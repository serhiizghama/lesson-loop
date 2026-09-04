import { describe, expect, it, vi } from 'vitest'
import { createSound } from './sound'

/**
 * The fake records the schedule rather than the sound: what this module has to get right
 * is *when* each note starts and *at what pitch*, on the audio clock rather than on a
 * timer, and that is exactly what a test can hold it to. Nothing here plays anything.
 *
 * It is also deliberately mean where the platform is: a context that reports `suspended`,
 * a constructor that throws, a host with no `AudioContext` at all. Those are the three
 * ways a real tablet says no.
 */
type Scheduled = { hz: number; start: number; stop: number; stopped: boolean }

function fakeHost({ state = 'running', throws = false }: { state?: string; throws?: boolean } = {}) {
  const scheduled: Scheduled[] = []
  const resume = vi.fn(() => Promise.resolve())
  let created = 0

  class FakeContext {
    currentTime = 100 // Not zero, so a test cannot pass by reading absolute times.
    state = state
    destination = { kind: 'destination' }
    resume = resume

    createOscillator() {
      const note: Scheduled = { hz: 0, start: -1, stop: -1, stopped: false }
      scheduled.push(note)
      return {
        type: '',
        frequency: { setValueAtTime: (hz: number) => { note.hz = hz } },
        connect: vi.fn(),
        disconnect: vi.fn(),
        addEventListener: vi.fn(),
        start: (at: number) => { note.start = at },
        stop: (at?: number) => {
          note.stopped = true
          if (at !== undefined) note.stop = at
        },
      }
    }

    createGain() {
      return {
        gain: {
          setValueAtTime: vi.fn(),
          linearRampToValueAtTime: vi.fn(),
          exponentialRampToValueAtTime: vi.fn(),
        },
        connect: vi.fn(),
      }
    }
  }

  const AudioContext = function (this: unknown) {
    created += 1
    if (throws) throw new Error('the browser said no')
    return new FakeContext()
  } as unknown as new () => AudioContext

  return {
    scheduled,
    resume,
    contextsCreated: () => created,
    host: { AudioContext },
  }
}

describe('the chime', () => {
  it('is three notes, rising, close together', () => {
    const fake = fakeHost()
    createSound(fake.host).chime()

    expect(fake.scheduled).toHaveLength(3)
    const [a, b, c] = fake.scheduled
    expect(a!.hz).toBeLessThan(b!.hz)
    expect(b!.hz).toBeLessThan(c!.hz)
    // Scheduled on the audio clock from `currentTime`, not queued on a timer.
    expect(a!.start).toBe(100)
    expect(b!.start).toBeGreaterThan(a!.start)
    expect(c!.start).toBeGreaterThan(b!.start)
    // Over inside half a second, so it cannot become something to wait through.
    expect(c!.stop - a!.start).toBeLessThan(0.5)
  })
})

describe("the closing screen's notes", () => {
  it('schedules one note per star, each a gap after the last and each higher', () => {
    const fake = fakeHost()
    createSound(fake.host).notes(5, 250)

    expect(fake.scheduled).toHaveLength(5)
    for (const [i, note] of fake.scheduled.entries()) {
      expect(note.start).toBeCloseTo(100 + i * 0.25, 6)
      if (i > 0) expect(note.hz).toBeGreaterThan(fake.scheduled[i - 1]!.hz)
    }
  })

  it('keeps rising past the length of its scale, so a long lesson still climbs', () => {
    const fake = fakeHost()
    createSound(fake.host).notes(9, 200)

    expect(fake.scheduled).toHaveLength(9)
    const pitches = fake.scheduled.map((n) => n.hz)
    expect(pitches).toEqual([...pitches].sort((x, y) => x - y))
    expect(new Set(pitches).size).toBe(9)
  })

  it('does nothing for a lesson with no stars to count', () => {
    const fake = fakeHost()
    const sound = createSound(fake.host)
    sound.notes(0, 250)
    expect(fake.scheduled).toHaveLength(0)
    expect(fake.contextsCreated()).toBe(0)
  })
})

describe('the context is built on first use and never before', () => {
  it('creates nothing until a sound is actually wanted (design D79)', () => {
    const fake = fakeHost()
    const sound = createSound(fake.host)

    expect(fake.contextsCreated()).toBe(0) // no rehearsal at construction
    expect(sound.isAvailable()).toBe(true) // and asking does not build one either
    expect(fake.contextsCreated()).toBe(0)

    sound.chime()
    expect(fake.contextsCreated()).toBe(1)
  })

  it('reuses the one context rather than building one per sound', () => {
    const fake = fakeHost()
    const sound = createSound(fake.host)
    sound.chime()
    sound.notes(3, 100)
    sound.chime()
    expect(fake.contextsCreated()).toBe(1)
  })

  it('resumes a context that comes up suspended, and still schedules the sound', () => {
    const fake = fakeHost({ state: 'suspended' })
    createSound(fake.host).chime()

    expect(fake.resume).toHaveBeenCalled()
    expect(fake.scheduled).toHaveLength(3)
  })

  it('does not ask a running context to resume', () => {
    const fake = fakeHost()
    createSound(fake.host).chime()
    expect(fake.resume).not.toHaveBeenCalled()
  })

  it('resumes from a gesture when the learner takes the offer to turn sound on', () => {
    const fake = fakeHost({ state: 'suspended' })
    createSound(fake.host).enable()

    expect(fake.contextsCreated()).toBe(1)
    expect(fake.resume).toHaveBeenCalled()
    expect(fake.scheduled).toHaveLength(0) // it wakes the output, it does not make a noise
  })
})

describe('stopping', () => {
  it('releases everything it scheduled', () => {
    const fake = fakeHost()
    const sound = createSound(fake.host)
    sound.notes(5, 250)
    sound.stop()

    expect(fake.scheduled.every((note) => note.stopped)).toBe(true)
  })

  it('is safe with nothing playing, and twice over', () => {
    const fake = fakeHost()
    const sound = createSound(fake.host)
    expect(() => {
      sound.stop()
      sound.chime()
      sound.stop()
      sound.stop()
    }).not.toThrow()
  })
})

describe('a device that will not make sound degrades silently', () => {
  it('reports unavailable and throws nothing where there is no AudioContext', () => {
    const sound = createSound({})

    expect(sound.isAvailable()).toBe(false)
    expect(() => {
      sound.chime()
      sound.notes(5, 250)
      sound.enable()
      sound.stop()
    }).not.toThrow()
  })

  it('gives up on a constructor that throws, and does not keep retrying it', () => {
    const fake = fakeHost({ throws: true })
    const sound = createSound(fake.host)

    expect(() => sound.chime()).not.toThrow()
    expect(sound.isAvailable()).toBe(false)

    sound.chime()
    sound.notes(3, 100)
    expect(fake.contextsCreated()).toBe(1) // tried once, never again
  })

  it('takes the webkit-prefixed constructor where that is all there is', () => {
    const fake = fakeHost()
    const sound = createSound({ webkitAudioContext: fake.host.AudioContext })

    expect(sound.isAvailable()).toBe(true)
    sound.chime()
    expect(fake.scheduled).toHaveLength(3)
  })
})
