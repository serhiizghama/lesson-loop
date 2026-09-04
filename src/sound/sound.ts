/**
 * The sounds the app makes that are not words: the chime that marks a completed exercise
 * and the notes that bring the closing screen's stars in (design D79).
 *
 * Three properties of the platform shape everything here.
 *
 * There is no arming step. `speech.prime()` was removed because queueing something in
 * order to discard it is what wedges Chrome (design D39), and the lesson generalises: an
 * `AudioContext` built at mount, on a screen nobody has touched yet, is a context stuck in
 * `suspended` with no gesture to blame it on. So the context is built inside the first call
 * that actually wants a sound, riding the same sticky user activation speech rides, and
 * `enable()` — called from a real gesture handler — is the one way to rescue a screen that
 * has genuinely had no tap.
 *
 * Web Audio is its own pipeline, separate from both `HTMLAudioElement` and
 * `speechSynthesis`. That is the whole reason the chime is synthesised rather than played
 * from a file: a chime cannot cut a line the child is listening to, and a line never waits
 * behind a chime (spec — "The chime does not cut speech", "Speech does not wait for the
 * chime"). It also means no asset, no format decision and no fetch, so a lesson with the
 * network gone after load still sounds exactly the same.
 *
 * Failure is silent by design. A device with no `AudioContext`, a context the browser
 * refuses to start, a node that throws on a platform we have not seen — none of it is an
 * error a learner should be shown, because the visible celebration carries the moment on
 * its own. This module never throws and never reports.
 *
 * The lesson's sound setting is deliberately not read here. Whether the app may be heard
 * is the policy's business and is applied by `quietSound` around this module, exactly as
 * `quietable` is applied around speech (design D78).
 */

type SoundHost = {
  AudioContext?: new () => AudioContext
  webkitAudioContext?: new () => AudioContext
}

/** A rising triad — C5, E5, G5. Short, major, and over before it can become a nuisance. */
const CHIME_HZ = [523.25, 659.25, 783.99] as const
/** How far apart the triad's notes start. Three of these plus the tail is about 350 ms. */
const CHIME_STEP_MS = 90
const CHIME_NOTE_MS = 170

/** The closing screen's first note, and the scale the rest climb. */
const NOTE_BASE_HZ = 523.25
const NOTE_MS = 260
/**
 * A major pentatonic, then the same shape an octave up, and so on. Any two consecutive
 * notes rise, whatever the star count — which is the only thing the spec asks of them —
 * and no interval in it can sound wrong against another.
 */
const PENTATONIC = [0, 2, 4, 7, 9] as const

/** Quiet enough to sit under a teacher's voice on a call rather than over it. */
const PEAK_GAIN = 0.18
/** `exponentialRampToValueAtTime` will not accept zero, and this is inaudible. */
const SILENCE = 0.0001

export type Sound = {
  /** Marks a completed exercise. Silent if unavailable. */
  chime(): void
  /** One rising note per star, `gapMs` apart, scheduled on the audio clock. */
  notes(count: number, gapMs: number): void
  /** Drops whatever is scheduled or sounding, e.g. when the lesson is told to be quiet. */
  stop(): void
  /**
   * Wakes the audio output from inside a user gesture, which is what a screen that has
   * had no tap needs. Shares the learner's one "Turn on sound" action with speech rather
   * than asking for a second gesture of its own (design D79).
   */
  enable(): void
  /** Whether this device can produce sound at all. */
  isAvailable(): boolean
}

export function createSound(host: SoundHost): Sound {
  const Ctor = (): SoundHost['AudioContext'] => host.AudioContext ?? host.webkitAudioContext

  let ctx: AudioContext | null = null
  /** Set once construction has been tried and lost; there is no point trying again. */
  let broken = false
  /** What is scheduled but not yet finished, so `stop()` has something to reach for. */
  let live: OscillatorNode[] = []

  /**
   * The context, built on first use and never before. A context that comes up `suspended`
   * is asked to resume: outside a gesture that request is simply ignored and this one
   * sound is lost, which is the right trade against a rehearsal at mount.
   */
  function context(): AudioContext | null {
    if (broken) return null
    const Audio = Ctor()
    if (Audio === undefined) return null

    if (ctx === null) {
      try {
        ctx = new Audio()
      } catch {
        broken = true
        return null
      }
    }

    if (ctx.state === 'suspended') {
      try {
        void ctx.resume?.()?.catch?.(() => {})
      } catch {
        // A refused resume is a lost sound, not a broken device: the next gesture may
        // well succeed, so nothing is remembered here.
      }
    }
    return ctx
  }

  /** One note: a sine through an envelope that opens fast and decays to nothing. */
  function tone(audio: AudioContext, at: number, hz: number, durationMs: number): void {
    const seconds = durationMs / 1000
    try {
      const osc = audio.createOscillator()
      const gain = audio.createGain()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(hz, at)

      gain.gain.setValueAtTime(SILENCE, at)
      gain.gain.linearRampToValueAtTime(PEAK_GAIN, at + 0.012)
      gain.gain.exponentialRampToValueAtTime(SILENCE, at + seconds)

      osc.connect(gain)
      gain.connect(audio.destination)
      osc.start(at)
      osc.stop(at + seconds)

      live.push(osc)
      osc.addEventListener?.('ended', () => {
        live = live.filter((node) => node !== osc)
      })
    } catch {
      // Nothing to salvage and nothing to say. The star still flies.
    }
  }

  return {
    chime() {
      const audio = context()
      if (audio === null) return
      const at = audio.currentTime
      CHIME_HZ.forEach((hz, i) => tone(audio, at + (i * CHIME_STEP_MS) / 1000, hz, CHIME_NOTE_MS))
    },

    notes(count, gapMs) {
      if (!Number.isFinite(count) || count <= 0) return
      const audio = context()
      if (audio === null) return
      const at = audio.currentTime
      const gap = Number.isFinite(gapMs) && gapMs > 0 ? gapMs : 0
      for (let i = 0; i < count; i += 1) {
        const semitones = PENTATONIC[i % PENTATONIC.length]! + 12 * Math.floor(i / PENTATONIC.length)
        tone(audio, at + (i * gap) / 1000, NOTE_BASE_HZ * 2 ** (semitones / 12), NOTE_MS)
      }
    },

    stop() {
      const scheduled = live
      live = []
      for (const node of scheduled) {
        try {
          // Restating the stop time as "now" cancels a note that has not started yet and
          // cuts one that has; the last call to `stop` is the one that counts.
          node.stop()
          node.disconnect()
        } catch {
          // A node the engine has already finished with throws here on some platforms.
        }
      }
    },

    // Built and resumed by the same path as any other sound — the difference is only that
    // the caller is inside a gesture, which is what makes the resume land.
    enable() {
      context()
    },

    isAvailable: () => !broken && Ctor() !== undefined,
  }
}

/** The instance the app uses. Tests build their own against a fake host. */
export const sound: Sound = createSound(globalThis as SoundHost)
