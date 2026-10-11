import { useEffect, useRef } from 'react'
import { revealLine } from '@/shared/blocks'
import { itemById } from '@/shared/text'
import { Picture } from './Picture'
import type { BlockView } from './types'
import styles from './blocks.module.css'

const BLUR = [styles.blurHeavy, styles.blurLight, ''] as const

/**
 * Guess & Say: a blurred picture, a peek, a reveal (design D151).
 *
 * Nothing is spoken until the reveal — the guess is the child's to say — and nothing names
 * the picture before it, not even to a screen reader.
 */
export const RevealView: BlockView<'reveal'> = ({ lesson, block, state, dispatch, speech }) => {
  const item = itemById(lesson, state.order[state.index] ?? '')
  const onLast = state.index >= state.order.length - 1
  const line = item !== undefined && state.stage === 2 ? revealLine(block, item) : null

  const said = useRef<string | null>(line)
  useEffect(() => {
    if (line === said.current) return
    said.current = line
    if (line !== null) speech.speak(line)
  }, [line, speech])

  if (item === undefined) {
    return <div className={styles.reveal}><p className={styles.poolEmpty}>All done! 🎉</p></div>
  }
  const tap = (target: string) => dispatch({ t: 'tap', block: block.id, target })

  return (
    <div className={styles.reveal}>
      <div
        className={`${styles.quizPrompt} ${styles.revealFrame}`}
        role="img"
        aria-label={state.stage === 2 ? undefined : 'A hidden picture'}
      >
        <span className={`${styles.revealPicture} ${BLUR[state.stage]}`}>
          <Picture lesson={lesson} item={item} />
        </span>
      </div>

      <div className={styles.revealControls}>
        <button type="button" className={styles.phraseButton} disabled={state.stage !== 0} onClick={() => tap('peek')}>
          👀 Peek
        </button>
        <button type="button" className={styles.scrambleNext} disabled={state.stage === 2} onClick={() => tap('reveal')}>
          ✨ Reveal
        </button>
      </div>

      {line !== null && <p className={styles.scrambleLine}>{line}</p>}

      {line !== null && !onLast && (
        <button type="button" className={styles.scrambleNext} onClick={() => tap(item.id)}>
          Next →
        </button>
      )}
    </div>
  )
}
