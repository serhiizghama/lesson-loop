import { lessonFailures, lessons, topicById } from '@/lessons'
import { WHOLE, choicesOf, narrow, offersChoice } from '@/shared/narrow'
import type { SizeChoice } from '@/shared/narrow'
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
    const topic = topicById(route.lessonId)
    if (topic === undefined) return <Missing what="lesson" onHome={home} />

    // A topic that has parts and an address that names no size is the topic itself: the
    // lessons, with this one's sizes offered on its own card (design D5, D8).
    if (route.choice === undefined && topic.parts !== undefined) {
      return <Home open={topic.id} onOpen={(path) => go(path)} />
    }

    const choice = route.choice ?? WHOLE
    if (!offersChoice(topic, choice)) return <Missing what="lesson" onHome={home} />
    // Narrowing happens here, before anything is played: what goes down is an ordinary
    // lesson, and nothing below knows a topic had parts (design D1).
    const lesson = narrow(topic, choice)
    // Keying on the built lesson's id — which names the topic and the size — gives each
    // one a fresh state, seed included, so changing size starts the lesson again rather
    // than inheriting it (design D7).
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

  return <Home onOpen={(path) => go(path)} />
}

/**
 * The lessons, and — for a topic that declares parts — the sizes it can be taught in,
 * expanded on the topic's own card rather than on a screen of its own (design D8).
 *
 * Which card is expanded is `open`, and it comes from the address: `/l/animals` is the
 * topic with its sizes showing, so a reload keeps the card open and Back closes it.
 */
function Home({ open, onOpen }: { open?: string; onOpen: (path: string) => void }) {
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
          {lessons.map((lesson) => {
            const sizes = choicesOf(lesson)
            const expanded = sizes.length > 0 && open === lesson.id
            return (
              <div key={lesson.id} className={styles.lessonCard}>
                <button
                  type="button"
                  className={styles.lessonCardHead}
                  // A topic with no sizes to offer opens its lesson; one that has them
                  // shows them, and shows them away again when it is tapped a second time.
                  aria-expanded={sizes.length > 0 ? expanded : undefined}
                  onClick={() => onOpen(expanded ? homePath : lessonPath(lesson.id))}
                >
                  <span className={styles.lessonEmoji} aria-hidden="true">
                    {lesson.emoji}
                  </span>
                  <span className={styles.lessonText}>
                    <span className={styles.lessonName}>{lesson.title}</span>
                    <span className={styles.lessonMeta}>{lessonSummary(lesson)}</span>
                  </span>
                </button>

                {expanded && (
                  <ul className={styles.lessonSizes}>
                    {sizes.map((size) => (
                      <li key={size.id}>
                        <button
                          type="button"
                          className={styles.lessonSize}
                          onClick={() => onOpen(lessonPath(lesson.id, size.id))}
                        >
                          <span className={styles.lessonSizeEmoji} aria-hidden="true">
                            {size.emoji}
                          </span>
                          <span className={styles.lessonText}>
                            <span className={styles.lessonSizeName}>{sizeName(size)}</span>
                            <span className={styles.lessonMeta}>{sizeMeta(size)}</span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )
          })}
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

/**
 * What a lesson card says under its name. The closing block is a send-off, not an
 * activity — and a topic with parts counts its parts instead of its exercises, because
 * no one sitting carries all of them.
 */
function lessonSummary(lesson: Lesson): string {
  const words = count(lesson.items.length, 'word')
  if (lesson.parts !== undefined) return `${words} · ${count(lesson.parts.length, 'part')}`
  const activities = lesson.blocks.filter((block) => block.type !== 'finish').length
  return `${words} · ${count(activities, 'activity', 'activities')}`
}

/**
 * What one size is called. A bare "5 / 10" would ask the teacher to remember which half
 * is which, so a part says what it teaches and the whole topic counts its own words
 * rather than quoting a figure no topic need have (design D8).
 */
function sizeName(size: SizeChoice): string {
  if (size.id === WHOLE) return `All ${size.teaches} words`
  return `${count(size.teaches, 'new word')} · ${size.title}`
}

/** What that size says under its name: what it carries beyond what it teaches. */
function sizeMeta(size: SizeChoice): string {
  if (size.id === WHOLE) return 'The whole topic in one sitting'
  const revised = size.carries - size.teaches
  return revised === 0
    ? 'The first sitting of the topic'
    : `${count(size.carries, 'word')} in the lesson, revising ${revised}`
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
