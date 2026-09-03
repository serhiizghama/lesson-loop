import { faceValue } from '@/shared/text'
import { resolveItems } from '@/shared/validate'
import type { Face, Item, Side } from '@/shared/types'
import type { BlockView } from './types'
import styles from './blocks.module.css'

export const MatchView: BlockView<'match'> = ({ lesson, block, state, dispatch, speech }) => {
  const items = new Map(resolveItems(lesson, block.items).map((i) => [i.id, i]))

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
              speakIfWord(item, face, speech.speak)
            }}
          >
            {faceValue(item, face)}
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

function speakIfWord(item: Item, face: Face, speak: (text: string) => void) {
  if (face === 'en') speak(item.en)
  else if (face === 'emoji') speak(item.en)
}
