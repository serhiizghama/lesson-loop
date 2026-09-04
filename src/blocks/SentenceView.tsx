import { useEffect } from 'react'
import { renderTemplate } from '@/shared/text'
import { resolveItems } from '@/shared/validate'
import type { BlockView } from './types'
import styles from './blocks.module.css'

export const SentenceView: BlockView<'sentence'> = ({ lesson, block, state, dispatch, speech }) => {
  const items = resolveItems(lesson, block.items)
  const chosen = items.find((i) => i.id === state.item) ?? null
  const level = block.levels[state.level] ?? block.levels[0]
  const sentence = chosen !== null && level !== undefined ? renderTemplate(level.template, chosen) : null

  // The point of this exercise is hearing the model sentence, so it is spoken whenever
  // it changes — picking a word or growing a level — not only on the Listen button.
  useEffect(() => {
    if (sentence !== null) speech.speak(sentence)
  }, [sentence, speech])

  return (
    <div className={styles.sentence}>
      <div className={styles.pickerRow}>
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`${styles.pickerChip} ${state.item === item.id ? styles.pickerChipOn : ''}`}
            onClick={() => dispatch({ t: 'tap', block: block.id, target: item.id })}
          >
            {item.emoji}
          </button>
        ))}
      </div>

      <div className={styles.levelRow}>
        {block.levels.map((entry, index) => (
          <button
            key={entry.label}
            type="button"
            className={`${styles.levelButton} ${state.level === index ? styles.levelButtonOn : ''}`}
            onClick={() => dispatch({ t: 'level', block: block.id, level: index })}
          >
            <span className={styles.levelNumber}>{index + 1}</span>
            {entry.label}
          </button>
        ))}
      </div>

      <p className={styles.sentenceOutput}>{sentence ?? 'Pick one above 👆'}</p>

      <button
        type="button"
        className={styles.speakButton}
        disabled={sentence === null}
        onClick={() => sentence !== null && speech.speak(sentence)}
      >
        🔊 Listen
      </button>
    </div>
  )
}
