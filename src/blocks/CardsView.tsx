import { faceValue } from '@/shared/text'
import { resolveItems } from '@/shared/validate'
import type { BlockView } from './types'
import styles from './blocks.module.css'

export const CardsView: BlockView<'cards'> = ({ lesson, block, state, dispatch, speech }) => {
  const items = new Map(resolveItems(lesson, block.items).map((i) => [i.id, i]))

  return (
    <div className={styles.cardGrid}>
      {state.order.map((id) => {
        const item = items.get(id)
        if (item === undefined) return null
        const revealed = state.flipped.includes(id)
        return (
          <button
            key={id}
            type="button"
            className={`${styles.card} ${revealed ? styles.cardRevealed : ''}`}
            onClick={() => {
              dispatch({ t: 'tap', block: block.id, target: id })
              speech.speak(item.en)
            }}
          >
            <span className={styles.cardFront}>{faceValue(item, block.front)}</span>
            {revealed && (
              <span className={styles.cardBack}>
                {block.back.map((face) => {
                  const value = faceValue(item, face)
                  return value === null ? null : (
                    <span key={face} className={styles.cardLine} data-face={face}>
                      {value}
                    </span>
                  )
                })}
                {item.l1?.romaji !== undefined && block.back.includes('l1') && (
                  <span className={styles.cardRomaji}>{item.l1.romaji}</span>
                )}
              </span>
            )}
            <span className={styles.speaker} aria-hidden="true">
              🔊
            </span>
          </button>
        )
      })}
    </div>
  )
}
