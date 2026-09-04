/**
 * The prepared half of speech: a recording of a line, played rather than synthesised
 * (design D52).
 *
 * This reports the same three moments the synthesiser path does — started, ended, failed —
 * so the phase machine in `speech.ts` does not learn that there are two sources. The one
 * real difference is worth the whole change: `play()` returns a promise that *rejects*
 * when the browser refuses, so a blocked clip says so instead of going quiet and leaving
 * the watchdog to infer it from 1500 ms of nothing.
 */
import { CLIP_DIR, clips } from './clips'

export type ClipEvents = {
  onStart(): void
  onEnd(): void
  /**
   * `refused` separates two failures that need opposite handling.
   *
   * A refusal is the browser declining to play without a gesture. The synthesiser is gated
   * by the same rule, so retrying there would only buy 1500 ms of silence before reaching
   * the same verdict — the caller reports the device mute at once instead.
   *
   * Anything else — a missing file, a decode failure — says the clip is broken while the
   * device is fine, so the caller falls back to the synthesiser and the learner hears the
   * line anyway.
   */
  onError(refused: boolean): void
}

export type ClipPlayer = {
  /** Whether a recording of this exact line exists. */
  has(line: string): boolean
  /** Plays the line. Returns false if there is nothing to play. */
  play(line: string, events: ClipEvents): boolean
  /** Stops whatever is playing. Unlike the synthesiser, this is always safe. */
  stop(): void
  /** Warms the cache for a whole lesson, so nothing waits on the network mid-exercise. */
  preload(lines: readonly string[]): void
}

type AudioHost = {
  Audio?: new (src?: string) => HTMLAudioElement
  fetch?: (url: string, init?: RequestInit) => Promise<unknown>
}

export function urlFor(line: string): string | null {
  const id = clips[line]
  return id === undefined ? null : `${CLIP_DIR}/${id}.m4a`
}

export function createClipPlayer(host: AudioHost): ClipPlayer {
  const Ctor = () => host.Audio
  let current: HTMLAudioElement | null = null
  /** URLs already asked for, so opening a lesson twice does not re-request everything. */
  const warmed = new Set<string>()

  function release(): void {
    if (current === null) return
    current.pause()
    current = null
  }

  return {
    has: (line) => urlFor(line) !== null,

    play(line, events) {
      const url = urlFor(line)
      const Audio = Ctor()
      if (url === null || Audio === undefined) return false

      release()
      // Always a fresh element. Holding warmed elements to replay from looks thriftier and
      // is not: an element that has not finished loading cannot play, so reusing one turns
      // a warm cache into a stuck word (found in the browser, not in a test).
      const audio = new Audio(url)
      current = audio

      const settle = (fn: () => void) => () => {
        if (current !== audio) return
        current = null
        fn()
      }
      audio.addEventListener?.('ended', settle(events.onEnd), { once: true })
      // A media error is the file's fault, never the browser's policy.
      audio.addEventListener?.('error', settle(() => events.onError(false)), { once: true })

      // A rejected play() is the browser saying "not without a gesture" — the one failure
      // the synthesiser never reports, and the reason `enable()` can be trusted.
      const started = audio.play()
      if (started !== undefined && typeof started.then === 'function') {
        started.then(
          () => {
            if (current === audio) events.onStart()
          },
          (reason: unknown) => {
            if (current !== audio) return
            current = null
            const name = (reason as { name?: string } | null)?.name
            events.onError(name === 'NotAllowedError')
          },
        )
      } else {
        events.onStart()
      }
      return true
    },

    stop: release,

    preload(lines) {
      const fetcher = host.fetch
      if (fetcher === undefined) return

      const urls = lines
        .map(urlFor)
        .filter((u): u is string => u !== null && !warmed.has(u))
      for (const url of urls) warmed.add(url)

      // Plain fetches, not media elements: a detached `new Audio(url)` is not reliably
      // fetched by Chrome at all, whereas a fetch warms the HTTP cache that the element
      // created at play time then hits.
      //
      // In batches, and at low priority, so that the pool is never saturated: the whole
      // point is that a word the learner asks for now does not queue behind 110 it has
      // not reached yet. A rejection is ignored — the line simply falls back (design D56).
      const BATCH = 6
      const step = (from: number): void => {
        const batch = urls.slice(from, from + BATCH)
        if (batch.length === 0) return
        void Promise.all(
          batch.map((url) =>
            fetcher(url, { priority: 'low' } as RequestInit).catch(() => undefined),
          ),
        ).then(() => step(from + BATCH))
      }
      step(0)
    },
  }
}
