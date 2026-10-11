import { useEffect, useRef } from 'react'
import { preferPair, preferSentence } from '@/shared/blocks'
import { Picture } from './Picture'
import type { BlockView } from './types'
import styles from './blocks.module.css'

/** This or That: two pictures, one chosen, the sentence for it (design D154). */
export const PreferView: BlockView<'prefer'> = ({ lesson, block, state, dispatch, speech }) => {
  const pair = preferPair(lesson, state)
  const onLast = state.index >= block.rounds - 1
  const chosen = pair?.find((item) => item.id === state.chosen)
  const other = pair?.find((item) => item.id !== state.chosen)
  const sentence = chosen !== undefined && other !== undefined ? preferSentence(block, chosen, other) : null

  const said = useRef<string | null>(sentence)
  useEffect(() => {
    if (sentence === said.current) return
    said.current = sentence
    if (sentence !== null) speech.speak(sentence)
  }, [sentence, speech])

  if (pair === null) {
    return <div className={styles.prefer}><p className={styles.poolEmpty}>All done! 🎉</p></div>
  }

  return (
    <div className={styles.prefer}>
      <p className={styles.secretRound}>Round {state.index + 1} / {block.rounds}</p>
      <div className={styles.yesnoAnswers}>
        {pair.map((item) => (
          <button
            key={item.id}
            type="button"
            disabled={state.chosen !== null}
            className={[styles.tile, styles.tilePicture, styles.preferTile, item.id === state.chosen ? styles.tilePaired : ''].join(' ')}
            onClick={() => dispatch({ t: 'tap', block: block.id, target: item.id })}
          >
            <Picture lesson={lesson} item={item} />
            <span className={styles.preferWord}>{item.en}</span>
          </button>
        ))}
      </div>
      {sentence !== null && <p className={styles.scrambleLine}>{sentence}</p>}
      {chosen !== undefined && !onLast && (
        <button type="button" className={styles.scrambleNext} onClick={() => dispatch({ t: 'tap', block: block.id, target: chosen.id })}>
          Next pair →
        </button>
      )}
    </div>
  )
}
