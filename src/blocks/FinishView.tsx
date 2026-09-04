import type { BlockView } from './types'
import styles from './blocks.module.css'

export const FinishView: BlockView<'finish'> = ({ block }) => (
  <div className={styles.finish}>
    <p className={styles.stars}>⭐️⭐️⭐️⭐️⭐️</p>
    <p className={styles.finishMessage}>{block.message}</p>
  </div>
)
