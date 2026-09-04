import { lessonFailures, lessonById, lessons } from '@/lessons'
import { RoomLesson } from './RoomLesson'
import { SoloLesson } from './SoloLesson'
import { homePath, lessonPath, useRoute } from './router'
import styles from './app.module.css'

export function App() {
  const { route, go } = useRoute()
  const home = () => go(homePath)

  if (route.name === 'lesson') {
    const lesson = lessonById(route.lessonId)
    if (lesson === undefined) return <Missing what="lesson" onHome={home} />
    // Keying on the lesson gives each one a fresh state, seed included.
    return (
      <SoloLesson
        key={lesson.id}
        lesson={lesson}
        onExit={home}
        onInvited={(path) => go(path, true)}
      />
    )
  }

  if (route.name === 'teacher' || route.name === 'student') {
    const key = route.name === 'teacher' && route.key !== '' ? route.key : null
    return <RoomLesson key={route.code} code={route.code} teacherKey={key} onExit={home} />
  }

  if (route.name === 'unknown') return <Missing what="page" onHome={home} />

  return <Home onOpen={(id) => go(lessonPath(id))} />
}

function Home({ onOpen }: { onOpen: (lessonId: string) => void }) {
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
            onClick={() => onOpen(lesson.id)}
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

/** Never a blank screen: say what happened and offer the lesson list (spec). */
function Missing({ what, onHome }: { what: string; onHome: () => void }) {
  return (
    <div className={styles.roomGate}>
      <p className={styles.roomGateText}>There is no such {what}.</p>
      <button type="button" className={styles.panelButton} onClick={onHome}>
        Back to the lessons
      </button>
    </div>
  )
}
