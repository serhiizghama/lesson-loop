import { quizChoices, quizSpeech, quizTarget } from '@/shared/blocks'
import { faceValue } from '@/shared/text'
import { resolveItems } from '@/shared/validate'
import { Picture } from './Picture'
import type { BlockView } from './types'
import styles from './blocks.module.css'

/**
 * Something is shown and the learner taps the item it names.
 *
 * Nothing here is spoken until the answer is right: the prompt is on the screen, and a
 * voice naming the item while the learner is still choosing would answer the question for
 * them. That is why this is not a listening exercise, and why it stays answerable on a
 * device that cannot speak at all (design D116).
 */
export const QuizView: BlockView<'quiz'> = ({ lesson, block, state, seed, dispatch, speech }) => {
  const items = new Map(resolveItems(lesson, block.items).map((i) => [i.id, i]))
  const targetId = quizTarget(state)
  const target = targetId === null ? undefined : items.get(targetId)
  const choices = quizChoices(lesson, block, state, seed)

  return (
    <div className={styles.quiz}>
      <div className={styles.quizPrompt}>
        {target === undefined ? (
          <p className={styles.quizDone}>All done! 🎉</p>
        ) : block.ask === 'emoji' ? (
          <Picture lesson={lesson} item={target} />
        ) : (
          <span className={styles.quizAsk}>{faceValue(target, block.ask)}</span>
        )}
      </div>

      <div className={styles.quizChoices}>
        {choices.map((item) => (
          <button
            key={item.id}
            type="button"
            className={[
              styles.tile,
              block.show === 'emoji' ? styles.tilePicture : styles.tileWord,
              state.wrong === item.id ? styles.tileWrong : '',
            ].join(' ')}
            onClick={() => {
              dispatch({ t: 'tap', block: block.id, target: item.id })
              if (item.id === targetId) speech.speak(quizSpeech(block, item))
            }}
          >
            {block.show === 'emoji' ? (
              <Picture lesson={lesson} item={item} />
            ) : (
              faceValue(item, block.show)
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
