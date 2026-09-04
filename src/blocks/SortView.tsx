import { resolveItems } from '@/shared/validate'
import type { BlockView } from './types'
import styles from './blocks.module.css'

export const SortView: BlockView<'sort'> = ({ lesson, block, state, dispatch, speech }) => {
  const items = new Map(resolveItems(lesson, block.items).map((i) => [i.id, i]))
  const unplaced = state.order.filter((id) => state.placed[id] === undefined)

  return (
    <div className={styles.sort}>
      <div className={styles.sortPool}>
        {unplaced.map((id) => {
          const item = items.get(id)
          if (item === undefined) return null
          const wrong = state.wrong?.item === id
          return (
            <button
              key={id}
              type="button"
              className={[
                styles.tile,
                styles.tilePicture,
                state.selected === id ? styles.tileSelected : '',
                wrong ? styles.tileWrong : '',
              ].join(' ')}
              onClick={() => {
                dispatch({ t: 'pick', block: block.id, side: 'a', target: id })
                speech.speak(item.en)
              }}
            >
              {item.emoji}
            </button>
          )
        })}
        {unplaced.length === 0 && <p className={styles.poolEmpty}>All done! 🎉</p>}
      </div>

      <div className={styles.buckets}>
        {block.buckets.map((bucket) => {
          const inside = state.order.filter((id) => state.placed[id] === bucket.key)
          const wrong = state.wrong?.bucket === bucket.key
          return (
            <button
              key={bucket.key}
              type="button"
              className={`${styles.bucket} ${wrong ? styles.bucketWrong : ''}`}
              onClick={() => dispatch({ t: 'pick', block: block.id, side: 'b', target: bucket.key })}
            >
              <span className={styles.bucketLabel}>
                {bucket.emoji} {bucket.label}
              </span>
              <span className={styles.bucketItems}>
                {inside.map((id) => (
                  <span key={id}>{items.get(id)?.emoji}</span>
                ))}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
