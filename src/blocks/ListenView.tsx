import { useEffect } from 'react'
import { listenChoices, listenTarget } from '@/shared/blocks'
import { resolveItems } from '@/shared/validate'
import type { BlockView } from './types'
import styles from './blocks.module.css'

export const ListenView: BlockView<'listen'> = ({ lesson, block, state, seed, dispatch, speech }) => {
  const target = listenTarget(state)
  const targetItem = resolveItems(lesson, block.items).find((i) => i.id === target) ?? null
  const choices = listenChoices(lesson, block, state, seed)
  const canSpeak = speech.isAvailable()

  // Say the new word whenever the target changes; cancelling first keeps taps from stacking.
  useEffect(() => {
    if (targetItem !== null) speech.speak(targetItem.en)
  }, [targetItem, speech])

  if (targetItem === null) {
    return <p className={styles.poolEmpty}>All done! 🎉</p>
  }

  return (
    <div className={styles.listen}>
      <button type="button" className={styles.listenAgain} onClick={() => speech.speak(targetItem.en)}>
        🔊 Listen again
      </button>

      {/* Without speech the exercise would be unanswerable, so the word is shown instead. */}
      {!canSpeak && <p className={styles.listenFallback}>{targetItem.en}</p>}

      <div className={styles.listenChoices}>
        {choices.map((item) => (
          <button
            key={item.id}
            type="button"
            className={[
              styles.tile,
              styles.tilePicture,
              state.wrong === item.id ? styles.tileWrong : '',
            ].join(' ')}
            onClick={() => dispatch({ t: 'tap', block: block.id, target: item.id })}
          >
            {item.emoji}
          </button>
        ))}
      </div>

      <p className={styles.counter}>
        {state.answered.length} / {state.order.length}
      </p>
    </div>
  )
}
