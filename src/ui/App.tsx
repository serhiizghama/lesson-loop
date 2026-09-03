import { useState } from 'react'
import { lessonFailures, lessons } from '@/lessons'
import { LessonPlayer } from './LessonPlayer'
import styles from './app.module.css'

export function App() {
  const [openLessonId, setOpenLessonId] = useState<string | null>(null)
  const open = lessons.find((l) => l.id === openLessonId) ?? null

  if (open !== null) {
    // Keying on the lesson gives each one a fresh state, seed included.
    return <LessonPlayer key={open.id} lesson={open} onExit={() => setOpenLessonId(null)} />
  }

  return (
    <div className={styles.home}>
      <h1 className={styles.homeTitle}>
        LessonLoop <span aria-hidden="true">🔁</span>
      </h1>
      <p className={styles.homeSubtitle}>Pick a lesson to begin.</p>

      <div className={styles.lessonGrid}>
        {lessons.map((lesson) => (
          <button
            key={lesson.id}
            type="button"
            className={styles.lessonCard}
            onClick={() => setOpenLessonId(lesson.id)}
          >
            <span className={styles.lessonEmoji}>{lesson.emoji}</span>
            <span className={styles.lessonName}>{lesson.title}</span>
          </button>
        ))}
      </div>

      {lessonFailures.length > 0 && (
        <section className={styles.failures}>
          <h2>These lessons could not be loaded</h2>
          {lessonFailures.map((failure) => (
            <div key={failure.file}>
              <strong>{failure.file}</strong>
              <ul>
                {failure.errors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      )}
    </div>
  )
}
