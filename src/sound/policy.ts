/**
 * The one place that decides whether the app may make a noise right now (design D78).
 *
 * The mirror of `quietable` in `src/speech/policy.ts`, and deliberately so: the teacher
 * presses one control, and PLAN D-27 settled that it covers the chime and the notes as
 * well as the words. Two capabilities, one rule, applied the same way at the same edge —
 * so "what does the switch cover?" keeps a single answer, and the next thing that makes a
 * sound is wrapped rather than remembering to ask.
 *
 * Every sound in this capability is one the app volunteers. There is no `demand` case to
 * carve out, as there is for speech, because nothing here is a sound the learner presses
 * something in order to hear.
 */

import type { Sound } from './sound'

/**
 * `base` told to make no sound while `muted`.
 *
 * The returned object is a new one each call, so its identity carries the setting: the
 * player memoises it on `muted` alone, which is what re-runs whatever depends on it when —
 * and only when — the setting changes.
 */
export function quietSound(base: Sound, muted: boolean): Sound {
  return {
    chime() {
      if (muted) return
      base.chime()
    },

    notes(count: number, gapMs: number) {
      if (muted) return
      base.notes(count, gapMs)
    },

    // Deliberately not suppressed. Stopping is *how* the setting takes effect on a sound
    // already in the air, so it has to work in exactly the state that silences everything
    // else (spec — "Turning the sound off mid-effect").
    stop: base.stop,

    // Also not suppressed: the learner took this deliberately, from inside a gesture, to
    // fix a device that will not make sound. A lesson told to be quiet and a device that
    // cannot speak are different conditions (spec — "Silence by setting is not a broken
    // device"), and waking the output while quiet is what makes the sound arrive the
    // moment the teacher turns it back on.
    enable: base.enable,

    isAvailable: base.isAvailable,
  }
}
