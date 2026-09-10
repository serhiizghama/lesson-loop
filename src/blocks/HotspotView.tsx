import { hotspotSpeech, spotInWords } from '@/shared/blocks'
import { SCENES } from '@/shared/scenes'
import { resolveItems } from '@/shared/validate'
import { scenes } from '@/scenes'
import type { BlockOf, Spot } from '@/shared/types'
import type { BlockView } from './types'
import styles from './blocks.module.css'

/**
 * The smallest a place may be reached at, in the scene's own coordinates.
 *
 * The stage is laid out at a fixed width and scaled down to about four tenths on the
 * narrowest screen it supports (design D103), so 110 there is about 44 under a finger —
 * and a scene is drawn so that no two of its centres are closer than this, which is what
 * keeps the enlarged targets from swallowing each other (design D128).
 */
const MIN_TARGET = 110

export const HotspotView: BlockView<'hotspot'> = ({ lesson, block, state, dispatch, speech }) => {
  const Scene = scenes[block.scene]
  const size = SCENES[block.scene]
  const items = new Map(resolveItems(lesson, block.items).map((i) => [i.id, i]))
  const bank = state.order.filter((id) => !state.placed.includes(id))

  const place = (id: string): void => {
    dispatch({ t: 'pick', block: block.id, side: 'b', target: id })
    // Only a correct placement says anything: the block's line names the thing that has
    // just been labelled, so speaking it on a refusal would announce the wrong answer.
    if (state.selected !== id) return
    const item = items.get(id)
    if (item === undefined) return
    const line = hotspotSpeech(block, item)
    if (line !== null) speech.speak(line)
  }

  return (
    <div className={styles.hotspot}>
      <div
        className={styles.hotspotScene}
        style={{ aspectRatio: `${size.width} / ${size.height}` }}
      >
        <Scene className={styles.hotspotDrawing} />

        {state.order.map((id) => {
          const spot = block.spots[id]
          const item = items.get(id)
          if (spot === undefined || item === undefined) return null
          const placed = state.placed.includes(id)
          return (
            <span
              key={`outline-${id}`}
              className={[
                styles.hotspotOutline,
                placed ? styles.hotspotOutlinePlaced : '',
                state.wrong?.spot === id ? styles.hotspotOutlineWrong : '',
              ].join(' ')}
              style={boxOf(spot)}
            >
              {placed && <span className={styles.hotspotLabel}>{item.en}</span>}
            </span>
          )
        })}

        {bank.length > 0 &&
          state.order
            .filter((id) => !state.placed.includes(id))
            .map((id) => {
              const spot = block.spots[id]
              if (spot === undefined) return null
              return (
                <button
                  key={`target-${id}`}
                  type="button"
                  className={styles.hotspotTarget}
                  style={boxOf(grown(spot, size))}
                  // Which place a tap belongs to is decided from where it landed rather
                  // than from which enlarged box happened to catch it, so two that do
                  // overlap still resolve the same way on both screens (design D128).
                  onClick={(event) => {
                    const at = pointerIn(event)
                    const hit = at === null ? id : resolveSpot(block, bank, at)
                    if (hit !== null) place(hit)
                  }}
                  aria-label={spotInWords(spot)}
                />
              )
            })}
      </div>

      <div className={styles.hotspotBank}>
        {bank.map((id) => {
          const item = items.get(id)
          if (item === undefined) return null
          return (
            <button
              key={id}
              type="button"
              className={[
                styles.tile,
                styles.tileWord,
                state.selected === id ? styles.tileSelected : '',
                state.wrong?.item === id ? styles.tileWrong : '',
              ].join(' ')}
              onClick={() => {
                dispatch({ t: 'pick', block: block.id, side: 'a', target: id })
                speech.speak(item.en)
              }}
            >
              {item.en}
            </button>
          )
        })}
        {bank.length === 0 && <p className={styles.poolEmpty}>All done! 🎉</p>}
      </div>
    </div>
  )
}

/** A rectangle in the drawing's fractions, as a box positioned over it. */
function boxOf([x, y, width, height]: Spot): React.CSSProperties {
  return {
    left: `${x * 100}%`,
    top: `${y * 100}%`,
    width: `${width * 100}%`,
    height: `${height * 100}%`,
  }
}

/** The same rectangle grown around its centre to at least a fingertip in each dimension. */
function grown([x, y, width, height]: Spot, size: { width: number; height: number }): Spot {
  const w = Math.max(width, MIN_TARGET / size.width)
  const h = Math.max(height, MIN_TARGET / size.height)
  return [x + width / 2 - w / 2, y + height / 2 - h / 2, w, h]
}

/** Where a click landed, in fractions of the drawing, or null if it cannot be measured. */
function pointerIn(event: React.MouseEvent<HTMLButtonElement>): { x: number; y: number } | null {
  // A keyboard press reports no real point, so Enter on a focused place activates that
  // place rather than resolving a coordinate the learner never aimed at.
  if (event.detail === 0) return null
  const scene = event.currentTarget.parentElement
  if (scene === null) return null
  const box = scene.getBoundingClientRect()
  if (box.width === 0 || box.height === 0) return null
  return { x: (event.clientX - box.left) / box.width, y: (event.clientY - box.top) / box.height }
}

/**
 * Which place a tap belongs to: the one whose declared rectangle contains it, and
 * otherwise the nearest centre among the enlarged targets it fell inside. A tap inside
 * none of them belongs to no place at all, and answers nothing.
 */
export function resolveSpot(
  block: BlockOf<'hotspot'>,
  ids: readonly string[],
  at: { x: number; y: number },
): string | null {
  const size = SCENES[block.scene]
  const places = ids.flatMap((id) => {
    const spot = block.spots[id]
    return spot === undefined ? [] : [{ id, spot, target: grown(spot, size) }]
  })

  const containing = places.filter(({ spot }) => within(spot, at))
  const near = containing.length > 0 ? containing : places.filter(({ target }) => within(target, at))
  if (near.length === 0) return null

  let best = near[0] as (typeof near)[number]
  for (const place of near.slice(1)) {
    if (gapTo(place.spot, at) < gapTo(best.spot, at)) best = place
  }
  return best.id
}

function within([x, y, width, height]: Spot, at: { x: number; y: number }): boolean {
  return at.x >= x && at.x <= x + width && at.y >= y && at.y <= y + height
}

function gapTo([x, y, width, height]: Spot, at: { x: number; y: number }): number {
  return Math.hypot(at.x - (x + width / 2), at.y - (y + height / 2))
}
