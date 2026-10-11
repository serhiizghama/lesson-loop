import { useEffect, useRef } from 'react'
import { secretFoundLine, secretGuessLine, secretTarget, secretTiles } from '@/shared/blocks'
import { itemById } from '@/shared/text'
import { Picture } from './Picture'
import type { BlockView } from './types'
import styles from './blocks.module.css'

/**
 * One item hidden behind a gift; the learner asks about one tile after another until it
 * is found (design D150).
 *
 * Nothing on this screen may depend on which item is hidden until it is found: the gift
 * is the same gift every round, and the tiles keep the lesson's own order (design D147).
 * The lines follow the shared state, so both screens say them.
 */
export const SecretView: BlockView<'secret'> = ({ lesson, block, state, dispatch, speech }) => {
  const secret = secretTarget(lesson, state)
  const tiles = secretTiles(lesson, block)
  const onLast = state.round >= block.rounds - 1

  const lastTried = state.tried[state.tried.length - 1]
  const line = state.found && secret !== null
    ? secretFoundLine(block, secret)
    : lastTried !== undefined
      ? secretGuessLine(block, itemById(lesson, lastTried) ?? tiles[0]!)
      : null

  // Keyed by round as well as text, so the same line in a new round is said again.
  const key = line === null ? null : `${state.round}:${state.tried.length}:${state.found}:${line}`
  const said = useRef<string | null>(key)
  useEffect(() => {
    if (key === said.current) return
    said.current = key
    if (line !== null) speech.speak(line)
  }, [key, line, speech])

  if (secret === null) {
    return (
      <div className={styles.secret}>
        <p className={styles.poolEmpty}>All done! 🎉</p>
      </div>
    )
  }

  return (
    <div className={styles.secret}>
      <div className={`${styles.quizPrompt} ${styles.secretGift}`} aria-live="polite">
        {state.found ? <Picture lesson={lesson} item={secret} /> : <span aria-label="A secret">🎁</span>}
      </div>

      <p className={styles.secretRound}>
        Round {state.round + 1} / {block.rounds}
      </p>

      <div className={styles.quizChoices}>
        {tiles.map((item) => {
          const tried = state.tried.includes(item.id)
          const isFound = state.found && item.id === secret.id
          return (
            <button
              key={item.id}
              type="button"
              disabled={tried || state.found}
              className={[
                styles.tile,
                styles.tilePicture,
                tried ? styles.secretTried : '',
                isFound ? styles.tilePaired : '',
              ].join(' ')}
              onClick={() => dispatch({ t: 'tap', block: block.id, target: item.id })}
            >
              <Picture lesson={lesson} item={item} />
            </button>
          )
        })}
      </div>

      {line !== null && <p className={styles.scrambleLine}>{line}</p>}

      {state.found && !onLast && (
        <button
          type="button"
          className={styles.scrambleNext}
          onClick={() => dispatch({ t: 'tap', block: block.id, target: secret.id })}
        >
          Next secret →
        </button>
      )}
    </div>
  )
}
