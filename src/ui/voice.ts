/**
 * The shell's job of composing two capabilities into the one `speech` prop every block
 * view already takes (design D79).
 *
 * A learner presses "Turn on sound" because the device is silent, not because they want
 * words specifically. Waking the audio output in that same gesture is what keeps the chime
 * from needing an offer of its own — two buttons for one problem is how a child ends up
 * pressing neither (spec — "A screen that has had no gesture at all").
 *
 * It is done here rather than inside `ListenView` because a block view takes `lesson,
 * block, state, seed, dispatch, speech` and nothing else (design D13); the view keeps
 * knowing only that it is offering to turn sound on. It is done here rather than inside
 * `speech.ts` because speech has no business holding an audio context.
 */

import type { Speech } from '@/speech/speech'
import type { Sound } from '@/sound/sound'

/**
 * `voice` with its offer widened to wake `effects` too.
 *
 * Everything else is carried across **by reference**, which matters: `ListenView` hands
 * `getState` and `subscribe` to `useSyncExternalStore`, and fresh closures here would
 * resubscribe on every render (see `src/speech/policy.ts` for the same rule).
 */
export function withEffects(voice: Speech, effects: Sound): Speech {
  return {
    ...voice,
    enable(text: string) {
      // First, because it is the cheap half and cannot throw: whatever speech then does
      // with the gesture, the audio output has already had its chance at it.
      effects.enable()
      voice.enable(text)
    },
  }
}
