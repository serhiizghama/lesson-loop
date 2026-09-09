import type { Item, Lesson } from '@/shared/types'
import { PICTURE_DIR, pictures } from './pictures'
import styles from './blocks.module.css'

/**
 * Pictures already fetched, so switching between exercises does not re-request them and a
 * lesson opened twice in one session pays for its set once.
 */
const warmed = new Set<string>()

/**
 * Fetches every picture the lesson can show, the moment the lesson opens.
 *
 * Same reason the clips are fetched that way (design D56): a lesson is promised to run
 * with the network gone once it is open, and a picture arriving late lands on exactly the
 * card a child was asked to identify. Images, unlike audio, are reliably fetched by an
 * off-document element, so this needs no fetch of its own — and the browser already
 * orders them sensibly, first exercise first, because that is the order of the items.
 */
export function preloadPictures(
  lesson: Lesson,
  load: (src: string) => void = (src) => {
    new Image().src = src
  },
): void {
  for (const item of lesson.items) {
    const src = pictureSrc(lesson, item)
    if (src === null || warmed.has(src)) continue
    warmed.add(src)
    load(src)
  }
}

/** The picture drawn for an item, or null when the lesson has none. */
export function pictureSrc(lesson: Lesson, item: Item): string | null {
  const file = pictures[`${lesson.id}/${item.id}`]
  return file === undefined ? null : `${PICTURE_DIR}/${file}`
}

/**
 * An item's picture, falling back to its emoji (design D94).
 *
 * The fallback is not a courtesy: `emoji` is a required field of an item and a picture is
 * a generated asset, so a lesson written today plays before anything has been drawn for
 * it, and a picture that fails to load leaves a card that still teaches.
 *
 * Sized in `em` throughout, so every slot keeps controlling how big its picture is through
 * the font-size it already sets for the emoji it replaced.
 */
export function Picture({ lesson, item }: { lesson: Lesson; item: Item }): React.ReactNode {
  const src = pictureSrc(lesson, item)
  if (src === null) return item.emoji

  return (
    <img
      // A swatch is drawn with a transparent background and must not be blended; a drawing
      // arrives on opaque white and must be, or it shows as a white square the moment a
      // tile turns blue or green underneath it.
      className={src.endsWith('.svg') ? styles.pictureVector : styles.picture}
      src={src}
      // Empty on purpose. In half these blocks the picture *is* the question — naming it
      // would read the answer out to the one learner who cannot see it coming — and in the
      // other half the English word is already sitting next to it (design D98).
      alt=""
      draggable={false}
    />
  )
}
