import { useEffect, type ReactNode } from 'react'
import { blockViews, type BlockView } from '@/blocks'
import { blockStateOf, isLessonComplete } from '@/shared/reducer'
import { seedFor } from '@/shared/rng'
import type { BlockType, Lesson } from '@/shared/types'
import { speech } from '@/speech/speech'
import type { LessonStore } from './useLesson'
import styles from './app.module.css'

export type LessonPlayerProps = {
  lesson: Lesson
  /** A local lesson or a room; the player is not told which (design D13). */
  store: LessonStore
  onExit: () => void
  /** Shown above the exercise: unsynced, whose turn it is, an invitation. */
  notice?: ReactNode
  /** Sits beside the exercise on a wide window and below it on a narrow one. */
  aside?: ReactNode
  /** An extra control in the header, e.g. "Invite student". */
  headerAction?: ReactNode
  /**
   * Whether this screen paces the lesson: moving between exercises and resetting one.
   * False for a student in a room, where those belong to the teacher (design D22). The
   * controls are then absent from the markup rather than disabled — a greyed-out arrow
   * is still a control the student may not use, and a child taps it anyway.
   *
   * Distinct from `readOnly`, which is the stronger and temporary "hands off the
   * exercise itself": a student who cannot steer can still play.
   */
  canSteer?: boolean
  /** The learner may look but not touch — the room is what actually refuses (D14). */
  readOnly?: boolean
}

export function LessonPlayer({
  lesson, store, onExit, notice, aside, headerAction, canSteer = true, readOnly = false,
}: LessonPlayerProps) {
  const { state, dispatch, progress } = store

  useEffect(() => {
    speech.prime()
    return () => speech.cancel()
  }, [])

  const block = lesson.blocks[state.slide]
  if (block === undefined) return null

  const blockState = blockStateOf(lesson, state, block)
  const View = blockViews[block.type] as unknown as BlockView<BlockType>
  const generation = state.resets[block.id] ?? 0
  const finished = isLessonComplete(lesson, state)

  return (
    <div className={styles.player}>
      <header className={styles.header}>
        <button type="button" className={styles.back} onClick={onExit} aria-label="Back to lessons">
          ←
        </button>
        <div className={styles.headerTitle}>
          <span className={styles.headerEmoji}>{lesson.emoji}</span>
          {lesson.title}
        </div>
        <div className={styles.progress} title={`${progress.done} of ${progress.total} done`}>
          <div className={styles.progressFill} style={{ width: `${progress.percent}%` }} />
          <span className={styles.progressText}>{progress.percent}%</span>
        </div>
        {headerAction}
      </header>

      {notice}

      <div className={styles.split}>
        {/* `inert` takes the whole exercise out of reach in one place, so no block view
            has to learn what a lock is. The room refuses the action regardless. */}
        <main className={styles.stage} inert={readOnly}>
          <h2 className={styles.blockTitle}>{block.title}</h2>
          {block.type !== 'finish' && block.hint !== undefined && (
            <p className={styles.blockHint}>{block.hint}</p>
          )}
          <View
            key={`${block.id}#${generation}`}
            lesson={lesson}
            block={block}
            state={blockState}
            seed={seedFor(state.seed, block.id, generation)}
            dispatch={dispatch}
            speech={speech}
          />
        </main>

        {aside}
      </div>

      {/* Where you are stays whoever is looking (design D24): "how much is left" is what
          keeps a child going, and it is not a control. Only the controls are conditional. */}
      <footer className={styles.nav}>
        {canSteer && (
          <button
            type="button"
            className={styles.navButton}
            disabled={readOnly || state.slide === 0}
            onClick={() => dispatch({ t: 'nav', slide: state.slide - 1 })}
          >
            ←
          </button>
        )}

        {canSteer && (
          <button
            type="button"
            className={styles.resetButton}
            disabled={readOnly}
            onClick={() => dispatch({ t: 'reset', block: block.id })}
          >
            ↺ Reset
          </button>
        )}

        <span className={styles.navCount}>
          {state.slide + 1} / {lesson.blocks.length}
          {finished && <span className={styles.navDone}> · done 🎉</span>}
        </span>

        {canSteer && (
          <button
            type="button"
            className={styles.navButton}
            disabled={readOnly || state.slide === lesson.blocks.length - 1}
            onClick={() => dispatch({ t: 'nav', slide: state.slide + 1 })}
          >
            →
          </button>
        )}
      </footer>
    </div>
  )
}
