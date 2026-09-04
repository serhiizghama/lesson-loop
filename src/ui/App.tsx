import { lessonFailures, lessonById, lessons } from '@/lessons'
import type { Lesson } from '@/shared/types'
import { RoomLesson } from './RoomLesson'
import { SoloLesson } from './SoloLesson'
import { homePath, lessonPath, useRoute } from './router'
import { buildLine } from '@/version'
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
      {/*
        The brand sits in a band of its own, so the page has a spine: the mark, the rule
        under it and the cards all start on the same left edge instead of floating.
      */}
      <header className={styles.homeBar}>
        <div className={styles.homeBarInner}>
          {/* The mark itself, not a stand-in emoji. `/icon.svg` is its single source
              (the tab and the home-screen tile draw the same picture), so the page
              references that file rather than keeping a second copy of the geometry. */}
          <img className={styles.homeMark} src="/icon.svg" alt="" width={36} height={36} />
          <span className={styles.homeWordmark}>LessonLoop</span>
        </div>
      </header>

      <main className={styles.homeBody}>
        <h1 className={styles.homeTitle}>Lessons</h1>
        <p className={styles.homeSubtitle}>Pick a lesson to begin.</p>

        <div className={styles.lessonGrid}>
          {lessons.map((lesson) => (
            <button
              key={lesson.id}
              type="button"
              className={styles.lessonCard}
              onClick={() => onOpen(lesson.id)}
            >
              <span className={styles.lessonEmoji} aria-hidden="true">
                {lesson.emoji}
              </span>
              <span className={styles.lessonText}>
                <span className={styles.lessonName}>{lesson.title}</span>
                <span className={styles.lessonMeta}>{lessonSummary(lesson)}</span>
              </span>
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

        {/*
          Which build this is (design D61). It sits here and on no other screen: an
          exercise and the student's view are specified to carry the lesson and nothing
          else, and a seven-year-old has no use for a version. The teacher does, the
          moment anyone asks her what she is looking at.
        */}
        <p className={styles.buildLine}>{buildLine(__APP_VERSION__, __BUILT_AT__)}</p>
      </main>
    </div>
  )
}

/** What a lesson card says under its name. The closing block is a send-off, not an activity. */
function lessonSummary(lesson: Lesson): string {
  const activities = lesson.blocks.filter((block) => block.type !== 'finish').length
  return `${count(lesson.items.length, 'word')} · ${count(activities, 'activity', 'activities')}`
}

function count(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`
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
