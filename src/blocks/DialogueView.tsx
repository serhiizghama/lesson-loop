import { useEffect, useRef } from 'react'
import { dialogueLine, roleHolder } from '@/shared/blocks'
import { itemById } from '@/shared/text'
import { Picture } from './Picture'
import type { BlockView } from './types'
import styles from './blocks.module.css'

/**
 * A role-play (design D152). The roles say who plays them — Teacher or Student — and the
 * swap moves those words and nothing else: the app never decides who may tap.
 */
export const DialogueView: BlockView<'dialogue'> = ({ lesson, block, state, dispatch, speech }) => {
  const item = itemById(lesson, state.order[state.index] ?? '')
  const onLast = state.index >= state.order.length - 1
  const whole = state.shown === block.lines.length
  const newest = item !== undefined && state.shown > 0 ? dialogueLine(block, item, state.shown - 1) : null
  const newestKey = newest === null ? null : `${state.index}:${state.shown}`

  const said = useRef<string | null>(newestKey)
  useEffect(() => {
    if (newestKey === said.current) return
    said.current = newestKey
    if (newest !== null) speech.speak(newest)
  }, [newestKey, newest, speech])

  if (item === undefined) {
    return <div className={styles.dialogue}><p className={styles.poolEmpty}>All done! 🎉</p></div>
  }
  const tap = (target: string) => dispatch({ t: 'tap', block: block.id, target })

  return (
    <div className={styles.dialogue}>
      <div className={styles.dialogueRoles}>
        {block.roles.map((role, at) => (
          <span key={role} className={styles.dialogueRole}>
            {role} — <strong>{roleHolder(state, at as 0 | 1)}</strong>
          </span>
        ))}
        <button type="button" className={styles.phraseButton} onClick={() => tap('swap')}>
          🔁 Swap roles
        </button>
      </div>

      <div className={styles.quizPrompt}>
        <Picture lesson={lesson} item={item} />
      </div>

      <ul className={styles.phraseList}>
        {block.lines.slice(0, state.shown).map((line, at) => {
          const text = dialogueLine(block, item, at)
          return (
            <li key={at} className={styles.phraseRow}>
              <span className={styles.dialogueSpeaker}>{block.roles[line.role]}</span>
              <span className={styles.phraseText}>{text}</span>
              <button
                type="button"
                className={styles.phraseButton}
                aria-label={`Say "${text}"`}
                onClick={() => speech.speak(text, 'demand')}
              >
                🔊
              </button>
            </li>
          )
        })}
      </ul>

      {!whole && (
        <button type="button" className={styles.scrambleNext} onClick={() => tap('line')}>
          {state.shown === 0 ? '▶️ Start' : 'Next line ↓'}
        </button>
      )}
      {whole && !onLast && (
        <button type="button" className={styles.scrambleNext} onClick={() => tap(item.id)}>
          Next →
        </button>
      )}
    </div>
  )
}
