/**
 * Spoken English through the browser.
 *
 * Two things make this more than a one-line wrapper: iOS and Safari refuse to speak
 * until the page has seen a user gesture, and a lesson must stay fully playable on a
 * device that cannot speak at all.
 */

const LANG = 'en-US'
/** Slower than conversation, so a child can follow the word. */
const RATE = 0.85

type SpeechHost = {
  speechSynthesis?: SpeechSynthesis
  SpeechSynthesisUtterance?: new (text: string) => SpeechSynthesisUtterance
  addEventListener?: Window['addEventListener']
}

export type Speech = {
  /** Speaks English, cancelling whatever is already speaking. Silent if unavailable. */
  speak(text: string): void
  /** Whether this device can speak at all — drives the readable fallback. */
  isAvailable(): boolean
  /** Arms speech on the learner's first gesture. Safe to call more than once. */
  prime(): void
  /** Stops anything in flight, e.g. when leaving a block. */
  cancel(): void
}

export function createSpeech(host: SpeechHost): Speech {
  let primed = false
  let listening = false
  let voice: SpeechSynthesisVoice | null = null

  const synth = () => host.speechSynthesis
  const Utterance = () => host.SpeechSynthesisUtterance

  function isAvailable(): boolean {
    return synth() !== undefined && Utterance() !== undefined
  }

  function pickVoice(): SpeechSynthesisVoice | null {
    const available = synth()?.getVoices?.() ?? []
    // Never block on the voice list: on some browsers it arrives after first paint.
    return available.find((v) => v.lang?.toLowerCase().startsWith('en')) ?? null
  }

  function utter(text: string, volume: number): void {
    const engine = synth()
    const Ctor = Utterance()
    if (engine === undefined || Ctor === undefined) return
    engine.cancel()
    const utterance = new Ctor(text)
    utterance.lang = LANG
    utterance.rate = RATE
    utterance.volume = volume
    voice ??= pickVoice()
    if (voice !== null) utterance.voice = voice
    engine.speak(utterance)
  }

  function unlock(): void {
    if (primed) return
    primed = true
    // A silent utterance is enough to satisfy the gesture requirement.
    utter(' ', 0)
  }

  return {
    isAvailable,
    speak(text) {
      if (text.trim().length === 0) return
      unlock()
      utter(text, 1)
    },
    cancel() {
      synth()?.cancel()
    },
    prime() {
      if (listening || !isAvailable()) return
      listening = true
      host.addEventListener?.('pointerdown', unlock, { once: true })
    },
  }
}

/** The instance the app uses. Tests build their own against a fake host. */
export const speech: Speech = createSpeech(globalThis as SpeechHost)
