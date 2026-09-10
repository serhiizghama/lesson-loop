import { useEffect, useRef } from 'react'
import { cardFace, cardItem, memoryPairSpeech } from '@/shared/blocks'
import { faceSpeech, faceValue, itemById } from '@/shared/text'
import { Picture } from './Picture'
import type { MemoryState } from '@/shared/types'
import type { BlockView } from './types'
import styles from './blocks.module.css'

export const MemoryView: BlockView<'memory'> = ({ lesson, block, state, dispatch, speech }) => {
  // A closed pair is announced as a whole sentence, exactly as a completed match is: the
  // ref starts at whatever was already matched, so coming back to a half-played board does
  // not repeat the last pair.
  const justMatched = state.matched.at(-1) ?? null
  const matchedItem = justMatched === null ? undefined : itemById(lesson, cardItem(justMatched))
  const pairLine = matchedItem === undefined ? null : memoryPairSpeech(block, matchedItem)
  const announced = useRef<string | null>(justMatched)
  useEffect(() => {
    if (justMatched === announced.current) return
    announced.current = justMatched
    if (justMatched !== null && pairLine !== null) speech.speak(pairLine)
  }, [justMatched, pairLine, speech])

  const pairs = state.matched.length / 2
  const total = state.order.length / 2

  return (
    <div className={styles.memory}>
      <div className={styles.memoryBoard}>
        {state.order.map((card) => {
          const item = itemById(lesson, cardItem(card))
          if (item === undefined) return null
          const face = cardFace(block, card)
          const matched = state.matched.includes(card)
          const up = state.up.includes(card)
          const shown = matched || up
          return (
            <button
              key={card}
              type="button"
              disabled={matched}
              className={[
                styles.memoryCard,
                shown ? styles.memoryCardUp : '',
                matched ? styles.memoryCardMatched : '',
                face === 'emoji' ? styles.memoryCardPicture : styles.memoryCardWord,
              ].join(' ')}
              onClick={() => {
                dispatch({ t: 'tap', block: block.id, target: card })
                // A tap that closes an announced pair stays quiet rather than being cut
                // off a syllable in by the sentence that follows it (design D130).
                const sentenceFollows =
                  closesPair(state, card) && memoryPairSpeech(block, item) !== null
                const line = sentenceFollows ? null : faceSpeech(item, face)
                if (line !== null) speech.speak(line)
              }}
              // Face down, a card must give nothing away — not even to the one learner
              // reading it out loud.
              aria-label={shown ? undefined : 'a card, face down'}
            >
              {shown ? (
                face === 'emoji' ? <Picture lesson={lesson} item={item} /> : faceValue(item, face)
              ) : (
                <span className={styles.memoryBack} aria-hidden>
                  ?
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Counted, never scored: nobody is ranked and nothing is timed (design D129). */}
      <p className={styles.counter}>
        {pairs} of {total} found · {state.tries} {state.tries === 1 ? 'try' : 'tries'}
      </p>
    </div>
  )
}

/** Whether tapping `card` turns up the second half of the pair already showing. */
function closesPair(state: MemoryState, card: string): boolean {
  if (state.up.length !== 1) return false
  const first = state.up[0]
  return first !== undefined && cardItem(first) === cardItem(card)
}
