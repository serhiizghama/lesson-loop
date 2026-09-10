import { useEffect, useRef } from 'react'
import { scrambleChips, scramblePlaced, scrambleTarget, scrambleUsed, sentenceWords } from '@/shared/blocks'
import { itemById } from '@/shared/text'
import { Picture } from './Picture'
import type { BlockView } from './types'
import styles from './blocks.module.css'

export const ScrambleView: BlockView<'scramble'> = ({
  lesson, block, state, seed, dispatch, speech,
}) => {
  const target = scrambleTarget(state)
  const item = target === null ? undefined : itemById(lesson, target)
  const words = item === undefined ? [] : sentenceWords(block, item)
  const placed = scramblePlaced(lesson, block, state)
  const chips = scrambleChips(lesson, block, state, seed)
  const used = scrambleUsed(chips, placed)
  const whole = words.length > 0 && placed.length === words.length
  const onLast = state.index >= state.order.length - 1
  const sentence = words.join(' ')

  // The sentence is spoken once, when its last word lands — never word by word, because
  // the sentence is the unit being taught (design D132).
  const said = useRef<string | null>(whole ? sentence : null)
  useEffect(() => {
    const line = whole ? sentence : null
    if (line === said.current) return
    said.current = line
    if (line !== null) speech.speak(line)
  }, [whole, sentence, speech])

  // Reachable only from a state built before the last sentence was reached — the way
  // forward is not offered on the last item, so the exercise cannot be emptied by playing
  // it. Shown rather than left blank all the same.
  if (item === undefined) {
    return (
      <div className={styles.scramble}>
        <p className={styles.poolEmpty}>All done! 🎉</p>
      </div>
    )
  }

  return (
    <div className={styles.scramble}>
      <div className={styles.scramblePrompt}>
        <Picture lesson={lesson} item={item} />
      </div>

      <p className={`${styles.scrambleLine} ${whole ? styles.scrambleLineWhole : ''}`}>
        {placed.length === 0 ? <span className={styles.scrambleBlank}>…</span> : placed.join(' ')}
      </p>

      <div className={styles.scrambleChips}>
        {chips.map((word, at) => (
          <button
            // The chips of one sentence are a fixed list in a fixed order, so the position
            // is the identity: two chips reading "my" are two different chips.
            key={`${word}-${at}`}
            type="button"
            disabled={used[at] === true || whole}
            className={[
              styles.tile,
              styles.tileWord,
              used[at] === true ? styles.tilePaired : '',
              state.wrong === word && used[at] !== true ? styles.tileWrong : '',
            ].join(' ')}
            onClick={() => dispatch({ t: 'pick', block: block.id, side: 'a', target: word })}
          >
            {word}
          </button>
        ))}
      </div>

      {/* Shown only once the sentence is whole, and never on the last one: there is nothing
          after it, and a child who took it would be left looking at an empty exercise. The
          sentence waits to be read and repeated; the lesson's own control moves on. */}
      {whole && !onLast && (
        <button
          type="button"
          className={styles.scrambleNext}
          onClick={() => dispatch({ t: 'tap', block: block.id, target: target as string })}
        >
          Next word →
        </button>
      )}
    </div>
  )
}
