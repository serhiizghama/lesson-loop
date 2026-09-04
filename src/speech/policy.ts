/**
 * The one place that decides whether the app may speak right now (design D67).
 *
 * Every exercise reaches speech through the `speech` prop the player hands it, so wrapping
 * that prop is what makes the lesson's sound setting reach all six of them without any of
 * them carrying a copy of the rule — and without a seventh block type arriving with the
 * rule missing.
 *
 * What is suppressed is only what the app volunteers. A line the learner pressed something
 * to hear always goes through: that is what keeps a quieted listening exercise answerable,
 * where the spoken word is the question and the written word is a last resort reserved for
 * a device that cannot speak at all.
 */

import type { Speech, SpeechIntent } from './speech'

/**
 * `base` told to volunteer nothing while `muted`.
 *
 * Everything but `speak` is delegated **by reference**. `ListenView` hands `getState` and
 * `subscribe` to `useSyncExternalStore`, which compares snapshots by identity: fresh
 * closures here would resubscribe on every wrapper, and a `getSnapshot` returning a new
 * object per call would loop forever.
 *
 * The returned object is a new one each call, so its identity carries the setting. The
 * player memoises it on `muted` alone, which is what re-runs the views' speaking effects
 * when — and only when — the setting changes, so an exercise holding a standing prompt
 * says it again the moment sound comes back (design D70).
 */
export function quietable(base: Speech, muted: boolean): Speech {
  return {
    speak(text: string, intent: SpeechIntent = 'auto') {
      if (muted && intent === 'auto') return
      base.speak(text, intent)
    },
    quiet: muted,
    // Deliberately not suppressed: the learner asked for this one from inside a gesture,
    // and it is the offer a device that will not speak needs — a different thing from the
    // setting (spec: "A quiet lesson is not a silent device").
    enable: base.enable,
    getState: base.getState,
    subscribe: base.subscribe,
    cancel: base.cancel,
    // Recordings are still fetched while quiet: the teacher can turn sound back on at any
    // moment, and a word that then waits on the network is the word she turned it on for.
    preload: base.preload,
  }
}
