import { useEffect, useRef } from 'react'
import { matchPairSpeech } from '@/shared/blocks'
import { faceSpeech, faceValue } from '@/shared/text'
import { resolveItems } from '@/shared/validate'
import { Picture } from './Picture'
import type { Face, MatchState, Side } from '@/shared/types'
import type { BlockView } from './types'
import styles from './blocks.module.css'

export const MatchView: BlockView<'match'> = ({ lesson, block, state, dispatch, speech }) => {
  const items = new Map(resolveItems(lesson, block.items).map((i) => [i.id, i]))

  // A finished pair is announced as a whole sentence — "The dog says Woof!" — which is how
  // a themed match teaches the tag it pairs on. The ref starts at whatever was already
  // paired, so returning to a half-finished block does not repeat the last one.
  const justPaired = state.paired.at(-1) ?? null
  const pairedItem = justPaired === null ? undefined : items.get(justPaired)
  const pairLine = pairedItem === undefined ? null : matchPairSpeech(block, pairedItem)
  const announced = useRef<string | null>(justPaired)
  useEffect(() => {
    if (justPaired === announced.current) return
    announced.current = justPaired
    if (justPaired !== null && pairLine !== null) speech.speak(pairLine)
  }, [justPaired, pairLine, speech])

  const column = (side: Side, order: string[], face: Face) => (
    <div className={styles.matchColumn}>
      {order.map((id) => {
        const item = items.get(id)
        if (item === undefined) return null
        const paired = state.paired.includes(id)
        const selected = state.selected?.side === side && state.selected.id === id
        const wrong = state.wrong !== null && (side === 'a' ? state.wrong.a : state.wrong.b) === id
        return (
          <button
            key={id}
            type="button"
            disabled={paired}
            className={[
              styles.tile,
              face === 'emoji' ? styles.tilePicture : styles.tileWord,
              paired ? styles.tilePaired : '',
              selected ? styles.tileSelected : '',
              wrong ? styles.tileWrong : '',
            ].join(' ')}
            onClick={() => {
              dispatch({ t: 'pick', block: block.id, side, target: id })
              // A tap that closes an announced pair stays quiet rather than being cut off
              // a syllable in by the sentence that follows it.
              const sentenceFollows =
                completesPair(state, side, id) && matchPairSpeech(block, item) !== null
              const line = sentenceFollows ? null : faceSpeech(item, face)
              if (line !== null) speech.speak(line)
            }}
          >
            {face === 'emoji' ? <Picture lesson={lesson} item={item} /> : faceValue(item, face)}
            {paired && <span className={styles.tick}>✓</span>}
          </button>
        )
      })}
    </div>
  )

  return (
    <div className={styles.matchRow}>
      {column('a', state.orderA, block.left)}
      {column('b', state.orderB, block.right)}
    </div>
  )
}

/** Whether tapping `id` on `side` closes the pair the other side is holding. */
function completesPair(state: MatchState, side: Side, id: string): boolean {
  return state.selected !== null && state.selected.side !== side && state.selected.id === id
}
