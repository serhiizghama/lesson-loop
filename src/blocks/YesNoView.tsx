import { useEffect, useRef } from 'react'
import { yesnoCurrent, yesnoQuestion, yesnoReply } from '@/shared/blocks'
import { Picture } from './Picture'
import type { BlockView } from './types'
import styles from './blocks.module.css'

/**
 * A picture with a question about it, answered Yes or No (design D150).
 *
 * The question is written out and spoken only from its own control, never on arrival: the
 * child is meant to answer it out loud first, and a voice reading it at her would take the
 * turn she is being given. The reply is spoken once an answer is in — on both screens,
 * because it follows the shared state, as a finished sentence in assembly does.
 */
export const YesNoView: BlockView<'yesno'> = ({ lesson, block, state, dispatch, speech }) => {
  const current = yesnoCurrent(lesson, state)
  const onLast = state.index >= state.order.length - 1
  const reply = current !== null && state.answer !== null
    ? yesnoReply(block, current.shown, state.answer)
    : null

  const said = useRef<string | null>(reply)
  useEffect(() => {
    if (reply === said.current) return
    said.current = reply
    if (reply !== null) speech.speak(reply)
  }, [reply, speech])

  if (current === null) {
    return (
      <div className={styles.yesno}>
        <p className={styles.poolEmpty}>All done! 🎉</p>
      </div>
    )
  }

  const question = yesnoQuestion(block, current.asked)
  const answer = (target: 'yes' | 'no') => dispatch({ t: 'tap', block: block.id, target })

  return (
    <div className={styles.yesno}>
      <div className={styles.quizPrompt}>
        <Picture lesson={lesson} item={current.shown} />
      </div>

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

      <div className={styles.yesnoAnswers}>
        <button
          type="button"
          disabled={state.answer !== null}
          className={[
            styles.tile, styles.tileWord, styles.yesnoYes,
            state.wrong === 'yes' ? styles.tileWrong : '',
            state.answer === 'yes' ? styles.tilePaired : '',
          ].join(' ')}
          onClick={() => answer('yes')}
        >
          ✅ Yes
        </button>
        <button
          type="button"
          disabled={state.answer !== null}
          className={[
            styles.tile, styles.tileWord, styles.yesnoNo,
            state.wrong === 'no' ? styles.tileWrong : '',
            state.answer === 'no' ? styles.tilePaired : '',
          ].join(' ')}
          onClick={() => answer('no')}
        >
          ❌ No
        </button>
      </div>

      {reply !== null && <p className={styles.scrambleLine}>{reply}</p>}

      {/* Not on the last item: there is nothing after it, and the reply waits to be read
          and repeated. The lesson's own control moves on. */}
      {reply !== null && !onLast && (
        <button
          type="button"
          className={styles.scrambleNext}
          onClick={() => dispatch({ t: 'tap', block: block.id, target: current.shown.id })}
        >
          Next →
        </button>
      )}
    </div>
  )
}
