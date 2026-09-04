import type { BlockView } from './types'
import styles from './blocks.module.css'

/**
 * The closing slide has exactly one job: its message.
 *
 * It used to draw five stars as well, and they were the same five whether a child had
 * finished every exercise or none — which a child notices. The stars are now the player's,
 * one per exercise and gold only where it was actually completed (design D82), because
 * only the player holds the trail and no block view should have to.
 */
export const FinishView: BlockView<'finish'> = ({ block }) => (
  <div className={styles.finish}>
    <p className={styles.finishMessage}>{block.message}</p>
  </div>
)
