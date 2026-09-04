/**
 * When to celebrate, and what to say — as two pure functions, so the rules can be tested
 * without a browser and without React (design D76).
 *
 * The moment is not stored anywhere and crosses no socket. Both devices hold the same
 * lesson state, which is what the room guarantees, so both observe the same transition and
 * play the same moment within a network hop of each other — and a lesson played alone runs
 * this exact code with nobody on the other end. A field in `LessonState` would have bumped
 * the version on both screens and reached the Durable Object, for a decoration.
 */

import type { TrailSlot } from '@/shared/reducer'

/**
 * What a render looked like, kept so the next one can be compared against it: which
 * exercises were complete, and which one was on screen.
 */
export type TrailSnapshot = { done: ReadonlySet<string>; current: string | null }

export function snapshotOf(trail: readonly TrailSlot[]): TrailSnapshot {
  return {
    done: new Set(trail.filter((slot) => slot.done).map((slot) => slot.blockId)),
    current: trail.find((slot) => slot.current)?.blockId ?? null,
  }
}

/**
 * The exercise to celebrate, or `null` for the overwhelming majority of renders.
 *
 * Only the exercise **on screen** can start a moment. That is what keeps a catch-up
 * snapshot — a screen reconnecting after an outage, arriving with three exercises newly
 * complete — from firing three celebrations at once for exercises nobody is looking at.
 * Those simply light up (spec: "A completion the screen was not looking at").
 *
 * `previous` initialised to the current snapshot on mount is what makes a screen that
 * joins a lesson already under way stay quiet about what was done before it arrived. It is
 * the same trick `MatchView` uses to avoid announcing the pair it was rendered on.
 */
export function momentBlock(
  previous: TrailSnapshot,
  next: readonly TrailSlot[],
): string | null {
  const onScreen = next.find((slot) => slot.current)
  if (onScreen === undefined) return null // a slide, not an exercise — the closing screen
  if (!onScreen.done) return null
  if (previous.done.has(onScreen.blockId)) return null // already earned; nothing changed

  // The exercise has to have been finished *in front of us*. If the lesson moved onto it
  // in the same update, it arrived already done — a catch-up snapshot after an outage, or
  // a teacher stepping back to something completed earlier — and celebrating that would be
  // congratulating a child for work they never saw happen.
  if (previous.current !== onScreen.blockId) return null

  return onScreen.blockId
}
