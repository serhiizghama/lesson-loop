import { useEffect } from 'react'
import { blockViews, type BlockView } from '@/blocks'
import { blockStateOf, isLessonComplete } from '@/shared/reducer'
import { seedFor } from '@/shared/rng'
import type { BlockType, Lesson } from '@/shared/types'
import { speech } from '@/speech/speech'
import { useLesson } from './useLesson'
import styles from './app.module.css'

export function LessonPlayer({ lesson, onExit }: { lesson: Lesson; onExit: () => void }) {
  const { state, dispatch, progress } = useLesson(lesson)

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
      </header>

      <main className={styles.stage}>
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

      <footer className={styles.nav}>
        <button
          type="button"
          className={styles.navButton}
          disabled={state.slide === 0}
          onClick={() => dispatch({ t: 'nav', slide: state.slide - 1 })}
        >
          ←
        </button>

        <button
          type="button"
          className={styles.resetButton}
          onClick={() => dispatch({ t: 'reset', block: block.id })}
        >
          ↺ Reset
        </button>

        <span className={styles.navCount}>
          {state.slide + 1} / {lesson.blocks.length}
          {finished && <span className={styles.navDone}> · done 🎉</span>}
        </span>

        <button
          type="button"
          className={styles.navButton}
          disabled={state.slide === lesson.blocks.length - 1}
          onClick={() => dispatch({ t: 'nav', slide: state.slide + 1 })}
        >
          →
        </button>
      </footer>
    </div>
  )
}
