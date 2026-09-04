/**
 * Spoken English through the browser.
 *
 * Three properties of the Web Speech API shape everything here.
 *
 * Cancelling an utterance the engine has accepted but not yet started wedges Chrome: the
 * cancelled one reports `error: canceled`, the next receives no events at all, and every
 * utterance after it — including ones built outside this module — queues behind it
 * forever. So this module keeps exactly one utterance in flight and only ever cancels one
 * that has actually started (design D40).
 *
 * Failure is not reported. A blocked or wedged engine does not throw and does not fire
 * `error`; it fires nothing. The only way to learn that the device did not speak is to
 * notice that `start` never arrived (design D41).
 *
 * Chrome gates speech on sticky user activation, so any earlier tap on the page arms it —
 * no priming utterance is needed, and queueing one only to cancel it is what caused the
 * wedge in the first place (design D39). A device that has had no tap at all, which is
 * the normal state of a student's screen paced by the teacher, is offered `enable()`
 * from inside a real gesture handler (design D43).
 */

import { createClipPlayer, type ClipPlayer } from './clip'

const LANG = 'en-US'
/** Slower than conversation, so a child can follow the word. */
const RATE = 0.85
/**
 * How long an utterance may sit unstarted before the device is presumed mute. Local
 * voices start in well under 100 ms and Chrome's remote voices in a few hundred, so this
 * clears both while staying short enough that a child is not left staring at a dead
 * button (design D41).
 */
const START_GRACE_MS = 1500

type SpeechHost = {
  speechSynthesis?: SpeechSynthesis
  SpeechSynthesisUtterance?: new (text: string) => SpeechSynthesisUtterance
  Audio?: new (src?: string) => HTMLAudioElement
  fetch?: (url: string, init?: RequestInit) => Promise<unknown>
}

/**
 * `unsupported` and `silent` are kept apart because they need different screens: offering
 * to turn sound on where there is no speech API at all is a promise that cannot be kept
 * (design D42).
 */
export type SpeechStatus = 'unsupported' | 'untested' | 'working' | 'silent'

export type SpeechState = {
  status: SpeechStatus
  /** Whether a word is in flight — the repeat control shows it (design D44). */
  speaking: boolean
  /** Whether the learner has already taken the offer to turn sound on. */
  enableAttempted: boolean
}

/**
 * Why a line is being said (design D67). `auto` is the app volunteering — a card turned
 * over, a new word to identify — and is what a lesson told to be quiet stops saying.
 * `demand` is the learner pressing something in order to hear it, which is never
 * suppressed: it is the whole of how a quieted listening exercise stays answerable.
 *
 * Absent means `auto`, deliberately. A block type written later, by someone who has never
 * read this, is quiet during a quiet lesson rather than being the one thing that shouts.
 */
export type SpeechIntent = 'auto' | 'demand'

export type Speech = {
  /** Speaks English, replacing whatever is in flight. Silent if unavailable. */
  speak(text: string, intent?: SpeechIntent): void
  /**
   * Whether volunteered lines are being suppressed right now. False here — this module
   * speaks whatever it is given; the setting is applied by `quietable` around it
   * (design D67). A control that reads it words itself accordingly (design D69).
   */
  readonly quiet: boolean
  /**
   * Retries speech from inside a user gesture, which is what a screen that has had no
   * tap needs. Clears any earlier verdict so the watchdog decides again.
   */
  enable(text: string): void
  /** What speech is doing right now. */
  getState(): SpeechState
  /** Notifies on every state change; returns the unsubscribe. */
  subscribe(listener: () => void): () => void
  /** Stops anything in flight, e.g. when leaving a block. */
  cancel(): void
  /**
   * Warms a lesson's recordings so no word waits on the network mid-exercise
   * (design D56). Safe to call more than once; a failure here is never an error.
   */
  preload(lines: readonly string[]): void
}

export function createSpeech(host: SpeechHost, clipPlayer?: ClipPlayer): Speech {
  const synth = () => host.speechSynthesis
  const Utterance = () => host.SpeechSynthesisUtterance
  const clips = clipPlayer ?? createClipPlayer(host)
  /**
   * A recording needs no speech API, so a device with no synthesiser is only truly
   * `unsupported` when it cannot play a clip either.
   */
  const canSynthesise = (): boolean => synth() !== undefined && Utterance() !== undefined
  const supported = (): boolean => canSynthesise() || host.Audio !== undefined

  let status: SpeechStatus = supported() ? 'untested' : 'unsupported'
  let enableAttempted = false
  let voice: SpeechSynthesisVoice | null = null

  /**
   * `queued` means the engine has taken the utterance but has not said it is speaking —
   * the one phase in which cancelling is forbidden.
   */
  let phase: 'idle' | 'queued' | 'speaking' = 'idle'
  /** The word that should replace whatever is in flight, once it is safe to swap. */
  let waiting: string | null = null
  /**
   * A `cancel()` that arrived while the engine had not started yet. We cannot cancel now,
   * so we do it the moment `start` fires — by which point cancelling is safe.
   */
  let stopWhenStarted = false
  /** Which source is in flight, so stopping never reaches for the one that is idle. */
  let live: 'none' | 'clip' | 'synth' = 'none'
  let watchdog: ReturnType<typeof setTimeout> | null = null
  /**
   * Bumped whenever an utterance is abandoned, so its late events are ignored. Without
   * this, the `error: canceled` that every replaced word fires would be read as proof
   * that the device is mute.
   */
  let generation = 0

  const listeners = new Set<() => void>()
  /** Rebuilt on change so `useSyncExternalStore` sees a new reference only when it must. */
  let state: SpeechState = { status, speaking: false, enableAttempted }

  function publish(): void {
    const speaking = phase !== 'idle'
    if (
      state.status === status &&
      state.speaking === speaking &&
      state.enableAttempted === enableAttempted
    ) {
      return
    }
    state = { status, speaking, enableAttempted }
    for (const listener of listeners) listener()
  }

  function clearWatchdog(): void {
    if (watchdog === null) return
    clearTimeout(watchdog)
    watchdog = null
  }

  /** Stops caring about whatever is in flight, without touching the engine. */
  function abandon(): void {
    generation += 1
    clearWatchdog()
    waiting = null
    stopWhenStarted = false
  }

  /**
   * Stops whatever is in flight. Only ever called once the source has actually started —
   * cancelling an unstarted utterance is the wedge this module exists to avoid.
   */
  function stopLive(): void {
    if (live === 'clip') clips.stop()
    if (live === 'synth') synth()?.cancel()
    live = 'none'
  }

  function pickVoice(): SpeechSynthesisVoice | null {
    const available = synth()?.getVoices?.() ?? []
    // Never block on the voice list: on some browsers it arrives after first paint.
    return available.find((v) => v.lang?.toLowerCase().startsWith('en')) ?? null
  }

  /**
   * What the phase machine does when a source reports that it began. Shared, so the two
   * sources cannot drift apart on the one piece of logic that has already bitten us.
   *
   * Returns false when this word has been taken over and the caller must do nothing more.
   */
  function began(mine: number, stopNow: () => void): boolean {
    if (mine !== generation) return false
    clearWatchdog()
    status = 'working'
    phase = 'speaking'

    // It has actually begun, so stopping is safe at last — this is where a word held back
    // during `queued`, or a `cancel()` that arrived too early, gets its turn.
    if (stopWhenStarted) {
      abandon()
      stopNow()
      phase = 'idle'
      publish()
      return false
    }
    if (waiting !== null) {
      const next = waiting
      abandon()
      stopNow()
      start(next)
      return false
    }
    publish()
    return true
  }

  /** What the phase machine does when a source reports that it stopped. */
  function finished(mine: number, failed: boolean): void {
    if (mine !== generation) return
    clearWatchdog()
    live = 'none'
    phase = 'idle'
    if (failed) status = 'silent'
    if (waiting !== null && !failed) {
      const next = waiting
      abandon()
      start(next)
      return
    }
    waiting = null
    stopWhenStarted = false
    publish()
  }

  /**
   * Arms the grace period: nothing heard and nothing reported inside it means this source
   * is not delivering.
   *
   * A clip that simply stalls — a half-deployed asset, a dead connection — never fires an
   * error, so without this the word would be given up on while the device's own voice sat
   * there unused. A recording that will not play is a recording that will not play,
   * whether it says so or goes quiet, and the spec asks for the line either way.
   */
  function watch(mine: number, text: string): void {
    watchdog = setTimeout(() => {
      if (mine !== generation) return
      clearWatchdog()
      if (live === 'clip' && canSynthesise()) {
        clips.stop()
        live = 'none'
        phase = 'idle'
        startUtterance(text)
        return
      }
      status = 'silent'
      live = 'none'
      phase = 'idle'
      waiting = null
      stopWhenStarted = false
      publish()
    }, START_GRACE_MS)
  }

  /**
   * Prefers the recording and falls back to the device (design D52). The choice is made
   * per line, so one missing clip costs that line's fidelity and nothing else.
   */
  function start(text: string): void {
    if (clips.has(text) && startClip(text)) return
    startUtterance(text)
  }

  function startClip(text: string): boolean {
    generation += 1
    const mine = generation

    const playing = clips.play(text, {
      onStart: () => {
        began(mine, stopLive)
      },
      onEnd: () => finished(mine, false),
      onError: (refused) => {
        if (mine !== generation) return
        clearWatchdog()
        if (refused) {
          // The browser is gated, not the file. The synthesiser is gated by the same rule,
          // so trying it would buy 1500 ms of silence on the way to the same verdict.
          finished(mine, true)
          return
        }
        // A broken clip on a working device: say the line the other way (spec — a
        // recording that will not play).
        phase = 'idle'
        startUtterance(text)
      },
    })
    if (!playing) return false

    live = 'clip'
    phase = 'queued'
    watch(mine, text)
    publish()
    return true
  }

  /** Hands one utterance to the engine and starts watching for proof that it played. */
  function startUtterance(text: string): void {
    const engine = synth()
    const Ctor = Utterance()
    if (engine === undefined || Ctor === undefined) {
      // Nothing left to try: a clip was the only possible source and it did not work.
      clearWatchdog()
      status = 'silent'
      phase = 'idle'
      publish()
      return
    }

    generation += 1
    const mine = generation

    const utterance = new Ctor(text)
    utterance.lang = LANG
    utterance.rate = RATE
    voice ??= pickVoice()
    if (voice !== null) utterance.voice = voice

    utterance.addEventListener?.('start', () => {
      began(mine, stopLive)
    })
    utterance.addEventListener?.('end', () => finished(mine, false))
    utterance.addEventListener?.('error', () => finished(mine, true))

    live = 'synth'
    phase = 'queued'
    // No `start` and no `error` within the grace period is the wedged engine: the only
    // symptom it ever produces is silence, so silence is what we have to read.
    watch(mine, text)

    engine.speak(utterance)
    publish()
  }

  function request(text: string): void {
    if (text.trim().length === 0) return
    if (!supported()) return

    if (phase === 'queued') {
      // Cancelling here is the bug. Hold the word and swap it in on `start` or `end`.
      waiting = text
      stopWhenStarted = false
      return
    }
    if (phase === 'speaking') {
      abandon()
      stopLive()
    }
    start(text)
  }

  return {
    // The intent is not read here: whether a line may be said is the policy's business,
    // and this module's is saying it (design D67).
    speak: (text) => request(text),

    quiet: false,

    enable(text) {
      enableAttempted = true
      if (!supported()) {
        publish()
        return
      }
      abandon()
      status = 'untested'
      // Deliberately no `cancel()` here. It was measured not to revive a wedged engine,
      // and cancelling an unstarted utterance is what wedges one — so it would risk the
      // common case (a screen that has simply had no gesture) to chase a case it cannot
      // fix. `resume()` is a no-op unless Chrome paused itself, which it sometimes does.
      synth()?.resume?.()
      phase = 'idle'
      request(text)
      publish()
    },

    getState: () => state,

    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },

    cancel() {
      if (phase === 'queued') {
        // Cannot stop it yet without wedging the engine; stop it the instant it starts.
        waiting = null
        stopWhenStarted = true
        return
      }
      const wasSpeaking = phase === 'speaking'
      abandon()
      if (wasSpeaking) stopLive()
      live = 'none'
      phase = 'idle'
      publish()
    },

    preload(lines) {
      clips.preload(lines)
    },
  }
}

/** The instance the app uses. Tests build their own against a fake host. */
export const speech: Speech = createSpeech(globalThis as SpeechHost)
