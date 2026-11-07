import { useEffect, useRef } from 'react'
import { spellLetters, spellPlaced, spellTarget, spellUsed, spellWord } from '@/shared/blocks'
import { itemById } from '@/shared/text'
import { Picture } from './Picture'
import type { BlockView } from './types'
import styles from './blocks.module.css'

export const SpellView: BlockView<'spell'> = ({
  lesson, block, state, seed, dispatch, speech,
}) => {
  const target = spellTarget(state)
  const item = target === null ? undefined : itemById(lesson, target)
  const word = item === undefined ? [] : spellWord(item)
  const placed = spellPlaced(lesson, state)
  const letters = spellLetters(lesson, state, seed)
  const used = spellUsed(letters, placed)
  const whole = word.length > 0 && placed.length === word.length
  const onLast = state.index >= state.order.length - 1
  const en = item?.en ?? null

  // The word is spoken once, when its last letter lands — never letter by letter, and not
  // on arrival, where it would leave the child nothing to work out (design D168).
  const said = useRef<string | null>(whole ? en : null)
  useEffect(() => {
    const line = whole ? en : null
    if (line === said.current) return
    said.current = line
    if (line !== null) speech.speak(line)
  }, [whole, en, speech])

  // Reachable only from a state built before the last word was reached: the way forward is
  // not offered on the last word. Shown rather than left blank all the same.
  if (item === undefined) {
    return (
      <div className={styles.spell}>
        <p className={styles.poolEmpty}>All done! 🎉</p>
      </div>
    )
  }

  return (
    <div className={styles.spell}>
      <div className={styles.scramblePrompt}>
        <Picture lesson={lesson} item={item} />
      </div>

      <button
        type="button"
        className={styles.listenAgain}
        onClick={() => speech.speak(item.en, 'demand')}
      >
        🔊 Listen
      </button>

      <div className={`${styles.spellPlaces} ${whole ? styles.spellWhole : ''}`}>
        {word.map((_letter, at) => (
          <span key={at} className={styles.spellPlace}>
            {placed[at]}
          </span>
        ))}
      </div>

      <div className={styles.spellLetters}>
        {letters.map((letter, at) => (
          <button
            // The tiles of one word are a fixed list in a fixed order, so the position is the
            // identity: the four tiles reading "s" are four different tiles.
            key={`${letter}-${at}`}
            type="button"
            disabled={used[at] === true || whole}
            className={[
              styles.tile,
              styles.spellTile,
              used[at] === true ? styles.tilePaired : '',
              state.wrong === letter && used[at] !== true ? styles.tileWrong : '',
            ].join(' ')}
            onClick={() => dispatch({ t: 'pick', block: block.id, side: 'a', target: letter })}
          >
            {letter}
          </button>
        ))}
      </div>

      {/* Never on the last word: there is nothing after it, and a child who took it would be
          left looking at an empty exercise. The lesson's own control moves on from there. */}
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
