import { useEffect, useRef } from 'react'
import { talkQuestion } from '@/shared/blocks'
import type { BlockView } from './types'
import styles from './blocks.module.css'

/** Talk Time: a question, and a harder one when the answer was easy (design D153). */
export const TalkView: BlockView<'talk'> = ({ block, state, dispatch, speech }) => {
  const question = talkQuestion(block, state)
  const said = useRef<string | null>(state.current)
  useEffect(() => {
    if (state.current === said.current) return
    said.current = state.current
    if (question !== null) speech.speak(question)
  }, [state.current, question, speech])

  const tap = (target: string) => dispatch({ t: 'tap', block: block.id, target })

  return (
    <div className={styles.talk}>
      <p className={styles.secretRound}>
        {question === null ? 'Press 🎲 to start!' : `${block.levels[state.level]?.label} · ${state.level + 1} / ${block.levels.length}`}
      </p>
      {question !== null && (
        <div className={styles.yesnoQuestionRow}>
          <p className={styles.yesnoQuestion}>{question}</p>
          <button
            type="button"
            className={styles.phraseButton}
            aria-label={`Say "${question}"`}
            onClick={() => speech.speak(question, 'demand')}
          >
            🔊
          </button>
        </div>
      )}
      <div className={styles.revealControls}>
        <button type="button" className={styles.scrambleNext} onClick={() => tap('new')}>
          🎲 New question
        </button>
        <button
          type="button"
          className={styles.phraseButton}
          // At the top it asks another top-level question rather than going nowhere.
          disabled={question === null}
          onClick={() => tap('harder')}
        >
          ➕ Harder
        </button>
      </div>
    </div>
  )
}
