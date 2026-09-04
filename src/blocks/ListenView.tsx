import { useEffect, useSyncExternalStore } from 'react'
import { listenChoices, listenTarget } from '@/shared/blocks'
import { resolveItems } from '@/shared/validate'
import type { BlockView } from './types'
import styles from './blocks.module.css'

export const ListenView: BlockView<'listen'> = ({ lesson, block, state, seed, dispatch, speech }) => {
  const target = listenTarget(state)
  const targetItem = resolveItems(lesson, block.items).find((i) => i.id === target) ?? null
  const choices = listenChoices(lesson, block, state, seed)

  // The engine changes on its own events, not on renders, so the control subscribes to it
  // rather than being told (design D42). The third argument is what keeps this block
  // renderable by `renderToStaticMarkup`, which is how every view here is tested; reading
  // the same snapshot is safe because it is a plain value, not a subscription.
  const { status, speaking, enableAttempted } = useSyncExternalStore(
    speech.subscribe,
    speech.getState,
    speech.getState,
  )

  // Say the new word whenever the target changes; the module handles the hand-off, so a
  // fast tapper cannot stack utterances or wedge the engine.
  useEffect(() => {
    if (targetItem !== null) speech.speak(targetItem.en)
  }, [targetItem, speech])

  if (targetItem === null) {
    return <p className={styles.poolEmpty}>All done! 🎉</p>
  }

  // A screen that has had no tap — a student's, turned by the teacher — is offered the
  // gesture rather than being handed the answer to read (design D43). Where there is no
  // speech API at all the offer would be a lie, so that case skips straight to the word.
  //
  // Both read the device's own verdict and neither reads the lesson's sound setting: a
  // lesson told to be quiet has a working device and a control that speaks on being
  // pressed, so revealing the word would turn listening into reading for no reason
  // (design D69). Only the control's wording changes — "Listen again" in front of a child
  // who has heard nothing is a broken-looking button.
  const offerSound = status === 'silent' && !enableAttempted
  const showWord = status === 'unsupported' || (status === 'silent' && enableAttempted)

  return (
    <div className={styles.listen}>
      {offerSound ? (
        <button
          type="button"
          className={`${styles.listenAgain} ${styles.listenEnable}`}
          onClick={() => speech.enable(targetItem.en)}
        >
          🔊 Turn on sound
        </button>
      ) : (
        <button
          type="button"
          className={[
            styles.listenAgain,
            speaking ? styles.listenSpeaking : '',
            showWord ? styles.listenMute : '',
          ].join(' ')}
          onClick={() => speech.speak(targetItem.en, 'demand')}
        >
          {showWord
            ? '🔇 No sound here'
            : speaking
              ? '🔈 Speaking…'
              : speech.quiet
                ? '🔊 Listen'
                : '🔊 Listen again'}
        </button>
      )}

      {/* Last resort: revealing the word turns listening into reading, so it waits until
          the offer above has been taken and sound still did not arrive. */}
      {showWord && <p className={styles.listenFallback}>{targetItem.en}</p>}

      <div className={styles.listenChoices}>
        {choices.map((item) => (
          <button
            key={item.id}
            type="button"
            className={[
              styles.tile,
              styles.tilePicture,
              state.wrong === item.id ? styles.tileWrong : '',
            ].join(' ')}
            onClick={() => dispatch({ t: 'tap', block: block.id, target: item.id })}
          >
            {item.emoji}
          </button>
        ))}
      </div>

      <p className={styles.counter}>
        {state.answered.length} / {state.order.length}
      </p>
    </div>
  )
}
