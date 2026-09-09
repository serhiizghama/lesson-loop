/**
 * The exercise stage's one fixed shape (design D103).
 *
 * The stage used to reflow: its grids are `repeat(auto-fill, minmax(…))`, so a ten-item
 * exercise was five across on a laptop and two across on a phone. That is fine until
 * something has to name a *position* — and a mark drawn over the third picture must be a
 * mark over the third picture on the other screen too. A fraction of a reflowing stage
 * names different content at different widths.
 *
 * So the stage is laid out once at a reference width and scaled to whatever space it has.
 * Both screens compute the same arrangement and differ only in size, which makes a point
 * on one screen mean the same thing on the other — and lets a stroke be a pair of numbers
 * rather than an anchor into the lesson's items.
 */

/**
 * The width the exercise is laid out at, in CSS pixels.
 *
 * Wider than the 46 rem the stage used before, because the board is this box: at 46 rem
 * against the height below it the thing to draw on came out nearly square, and an arrow
 * or a written word wants room sideways. Every pixel added here is a pixel the exercise
 * shrinks by on a narrow screen, so it is deliberately modest — see the note on the
 * height for the arithmetic.
 */
export const STAGE_REFERENCE_PX = 880

/**
 * The height the stage is given at that width, even when the exercise needs less.
 *
 * The exercise rarely fills it, and the room below it is the point: a mark is made *around*
 * and *beside* the content as much as on it — an arrow from a card to a written word, a
 * line drawn under the row — and a board cropped to the last picture has nowhere to put
 * either. Fixing it rather than letting the window decide is what keeps the space itself
 * the same on both screens; a taller exercise simply makes the box taller, on both.
 *
 * Together with the width this makes a board of about 1.4:1 rather than the square the
 * first build produced. The cost of the wider box falls entirely on small screens, since
 * the scale is `available / reference`: at the narrowest supported 380 px the scale goes
 * from 0.52 to 0.43, which takes the smallest card from about 70 px to about 59 — still
 * clear of the 44 px a young child's finger needs, and the floor that decides how much
 * wider this may ever go.
 */
export const STAGE_REFERENCE_HEIGHT_PX = 620

/**
 * How far to scale the stage down to fit `available`.
 *
 * Never above 1: a wide screen shows the reference layout at its natural size rather than
 * blowing it up, which is what keeps this change invisible above the reference width.
 *
 * Returns 1 for a width that has not been measured yet — a stage that is not laid out
 * should render at its natural size rather than collapse to nothing.
 */
export function stageScale(available: number, reference: number = STAGE_REFERENCE_PX): number {
  if (!Number.isFinite(available) || available <= 0) return 1
  if (!Number.isFinite(reference) || reference <= 0) return 1
  return Math.min(1, available / reference)
}

/** The height the scaled stage occupies on the page, given its natural, unscaled height. */
export function stageHeight(natural: number, scale: number): number {
  if (!Number.isFinite(natural) || natural <= 0) return 0
  return Math.round(natural * scale)
}
