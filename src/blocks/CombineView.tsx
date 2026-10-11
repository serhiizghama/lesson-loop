import { agreeingPicks, combineClashes, combineSentence, isBuilt, offeredFor } from '@/shared/blocks'
import { mulberry32, seedFor, hashString } from '@/shared/rng'
import { itemById } from '@/shared/text'
import { resolveItems } from '@/shared/validate'
import { Picture } from './Picture'
import type { BlockView } from './types'
import styles from './blocks.module.css'

/**
 * Say More: rows of chips joined into a sentence (design D155).
 *
 * The sentence is heard only from its own control and is spoken by the device's voice —
 * the one line in the app that is never recorded (spec, speech).
 */
export const CombineView: BlockView<'combine'> = ({ lesson, block, state, seed, dispatch, speech }) => {
  const items = resolveItems(lesson, block.items)
  const item = itemById(lesson, state.item ?? '')
  const built = isBuilt(block, state)
  const sentence = item !== undefined ? combineSentence(block, state, item) : null
  const tap = (target: string) => dispatch({ t: 'tap', block: block.id, target })

  // Varied by what has been heard and what is on screen, so pressing it again moves on;
  // drawn here because the view has the seed and `reduce` does not.
  const surprise = () => {
    const random = mulberry32(seedFor(seed, 'surprise', state.heard.length, String(hashString(JSON.stringify(state)))))
    const target = items[Math.floor(random() * items.length)]
    if (target === undefined) return
    const picks = agreeingPicks(block.rows, target.id, random)
    if (picks === null) return
    tap(target.id)
    for (const [row, index] of Object.entries(picks)) tap(`row:${row}:${index}`)
  }

  return (
    <div className={styles.combine}>
      {block.rows.map((row) => (
        <div key={'id' in row ? row.id : 'items'} className={styles.combineRow}>
          <p className={styles.combineLabel}>{row.label}</p>
          <div className={styles.combineChips}>
            {'id' in row
              ? row.options.map((option, index) =>
                  offeredFor(option, state.item) ? (
                    <button
                      key={index}
                      type="button"
                      className={`${styles.combineChip} ${state.picks[row.id] === index ? styles.combineChipOn : ''}`}
                      onClick={() => tap(`row:${row.id}:${index}`)}
                    >
                      {option.text}
                    </button>
                  ) : null,
                )
              : items.map((it) => (
                  <button
                    key={it.id}
                    type="button"
                    className={`${styles.combineChip} ${styles.combineItem} ${state.item === it.id ? styles.combineChipOn : ''}`}
                    onClick={() => tap(it.id)}
                  >
                    <Picture lesson={lesson} item={it} /> {it.en}
                  </button>
                ))}
          </div>
        </div>
      ))}

      <p className={styles.scrambleLine}>{sentence ?? 'Pick from each row 👆'}</p>
      {built && combineClashes(block, state) && <p className={styles.combineClash}>🤔 Does that make sense?</p>}

      <div className={styles.revealControls}>
        <button
          type="button"
          className={styles.scrambleNext}
          disabled={!built}
          onClick={() => {
            if (sentence === null) return
            tap('hear')
            speech.speak(sentence, 'demand')
          }}
        >
          🔊 Hear it
        </button>
        <button type="button" className={styles.phraseButton} onClick={surprise}>
          🎲 Surprise me
        </button>
      </div>
    </div>
  )
}
