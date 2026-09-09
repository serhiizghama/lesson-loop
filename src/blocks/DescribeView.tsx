import { useEffect } from 'react'
import { currentItem, describeChoices, describeSentence } from '@/shared/blocks'
import { faceValue } from '@/shared/text'
import { resolveItems } from '@/shared/validate'
import { Picture } from './Picture'
import type { BlockView } from './types'
import type { Item, Side } from '@/shared/types'
import styles from './blocks.module.css'

const SIDES: readonly Side[] = ['a', 'b']

/**
 * One item, two questions, and the sentence they add up to.
 *
 * The finished sentence is read off the item just left behind — `order[index - 1]`, while
 * neither question of the new item has been answered — rather than kept in the state. The
 * state already says everything needed to know which item was last completed, and putting
 * a rendered sentence into it would enlarge the snapshot every tap of the lesson carries
 * for the sake of something derivable (design D115).
 */
export const DescribeView: BlockView<'describe'> = ({
  lesson, block, state, seed, dispatch, speech,
}) => {
  const items = resolveItems(lesson, block.items)
  const item = currentItem(lesson, block, state)
  const finished = justFinished(items, state.order, state.index, state.given)

  // Both screens say it, so the sentence is not the property of whoever tapped last.
  useEffect(() => {
    if (finished !== null) speech.speak(describeSentence(block, finished))
  }, [finished?.id])

  return (
    <div className={styles.describe}>
      {finished !== null && (
        <p className={styles.describeSentence}>{describeSentence(block, finished)}</p>
      )}

      <div className={styles.describeSubject}>
        {item === null ? (
          <p className={styles.quizDone}>All done! 🎉</p>
        ) : (
          <Picture lesson={lesson} item={item} />
        )}
      </div>

      {item !== null &&
        SIDES.map((side, i) => {
          const question = block.questions[i] ?? block.questions[0]
          const answer = faceValue(item, question.face)
          return (
            <div key={side} className={styles.describeQuestion}>
              <p className={styles.describeLabel}>{question.label}</p>
              <div className={styles.describeChoices}>
                {describeChoices(lesson, block, side, seed).map((choice) => (
                  <button
                    key={choice}
                    type="button"
                    className={[
                      styles.tile,
                      styles.tileWord,
                      state.given[side] && choice === answer ? styles.tilePaired : '',
                      state.wrong === side ? styles.tileWrong : '',
                    ].join(' ')}
                    disabled={state.given[side]}
                    onClick={() => dispatch({ t: 'pick', block: block.id, side, target: choice })}
                  >
                    {choice}
                  </button>
                ))}
              </div>
            </div>
          )
        })}
    </div>
  )
}

/** The item just described, shown until the learner starts answering about the next one. */
function justFinished(
  items: readonly Item[],
  order: readonly string[],
  index: number,
  given: { a: boolean; b: boolean },
): Item | null {
  if (index === 0 || given.a || given.b) return null
  const id = order[index - 1]
  return items.find((i) => i.id === id) ?? null
}
