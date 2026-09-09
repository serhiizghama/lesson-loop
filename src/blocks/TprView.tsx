import { useEffect } from 'react'
import { tprCurrent } from '@/shared/blocks'
import { renderTemplate } from '@/shared/text'
import { resolveItems } from '@/shared/validate'
import { Picture } from './Picture'
import type { BlockView } from './types'
import styles from './blocks.module.css'

export const TprView: BlockView<'tpr'> = ({ lesson, block, state, dispatch, speech }) => {
  const items = resolveItems(lesson, block.items)
  const currentId = tprCurrent(state)
  const current = items.find((i) => i.id === currentId) ?? null
  const instruction = current === null ? null : renderTemplate(block.prompt, current)
  const finished = state.started && currentId === null
  const next = state.started ? currentId : (state.order[0] ?? null)

  useEffect(() => {
    if (instruction !== null) speech.speak(instruction)
  }, [instruction, speech])

  return (
    <div className={styles.tpr}>
      <div className={styles.tprStage}>
        <span className={styles.tprEmoji}>
          {current === null ? (
            finished ? (
              '🎉'
            ) : (
              '🎮'
            )
          ) : (
            <Picture lesson={lesson} item={current} />
          )}
        </span>
        <p className={styles.tprText}>
          {instruction ?? (finished ? 'Well done!' : 'Tap Start to play!')}
        </p>
      </div>

      <button
        type="button"
        className={styles.speakButton}
        disabled={next === null}
        onClick={() => next !== null && dispatch({ t: 'tap', block: block.id, target: next })}
      >
        ▶️ {state.started ? 'Next' : 'Start'}
      </button>
    </div>
  )
}
