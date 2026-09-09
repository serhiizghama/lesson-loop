import type { BlockView } from './types'
import styles from './blocks.module.css'

/**
 * The lesson's model phrases, each with a control that says it.
 *
 * Every line is written out as well as spoken, and the control speaks on `demand` — the
 * learner pressed it in order to hear it, which is the one intent a quieted lesson never
 * suppresses (design D67). A phrase list on a silent device is still a list of sentences
 * to read aloud, which is most of what it is for.
 */
export const PhrasesView: BlockView<'phrases'> = ({ block, state, dispatch, speech }) => {
  return (
    <ul className={styles.phraseList}>
      {block.lines.map((line, i) => {
        const target = String(i)
        const heard = state.played.includes(target)
        return (
          <li key={target} className={styles.phraseRow}>
            <span className={styles.phraseText}>{line}</span>
            <button
              type="button"
              className={`${styles.phraseButton} ${heard ? styles.phraseHeard : ''}`}
              aria-label={`Say "${line}"`}
              onClick={() => {
                dispatch({ t: 'tap', block: block.id, target })
                speech.speak(line, 'demand')
              }}
            >
              🔊
            </button>
          </li>
        )
      })}
    </ul>
  )
}
