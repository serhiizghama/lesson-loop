import { useState } from 'react'
import { answerKeyFor, isNextDue } from '@/shared/reducer'
import type { Lesson, LessonState } from '@/shared/types'
import type { Peers } from '@/shared/protocol'
import type { Connection } from '@/net/socket'
import { guidePath } from './router'
import styles from './app.module.css'

export type TeacherPanelProps = {
  lesson: Lesson
  lessons: readonly Lesson[]
  state: LessonState
  locked: boolean
  /** Whether the app has been told to stop speaking unasked, on both screens (D66). */
  muted: boolean
  /** Whether the student may draw on the exercise (design D107). */
  pen: boolean
  connection: Connection
  peers: Peers
  studentLink: string
  onPrevious: () => void
  onNext: () => void
  onReset: () => void
  onSwitchLesson: (lesson: Lesson) => void
  onSetLocked: (value: boolean) => void
  onSetMuted: (value: boolean) => void
  onSetPen: (value: boolean) => void
}

/**
 * The half of the lesson only the teacher sees. It is rendered beside the exercise on a
 * wide window and below it on a narrow one — never over it (spec: "The teacher's extra
 * surface does not crowd out the exercise").
 */
export function TeacherPanel(props: TeacherPanelProps) {
  const { lesson, state, locked, muted, connection, peers } = props
  const [open, setOpen] = useState(true)
  const [copied, setCopied] = useState(false)
  const [switching, setSwitching] = useState(false)

  const block = lesson.blocks[state.slide]
  const key = block === undefined ? null : answerKeyFor(lesson, state, block)
  const atStart = state.slide === 0
  const atEnd = state.slide === lesson.blocks.length - 1
  /**
   * Derived here rather than passed in, from the same function the footer arrow uses
   * (design D83): the panel already holds the lesson and the state, and two controls that
   * mean the same thing must not be able to disagree about when they mean it.
   */
  const nextDue = isNextDue(lesson, state)

  if (!open) {
    return (
      <button type="button" className={styles.panelShow} onClick={() => setOpen(true)}>
        👩‍🏫 Teacher panel
      </button>
    )
  }

  return (
    <aside className={styles.panel} aria-label="Teacher panel">
      <div className={styles.panelHead}>
        <span className={styles.panelTitle}>Teacher</span>
        <span
          className={connection.connected ? styles.dotOn : styles.dotOff}
          title={connection.connected ? 'Connected to the room' : 'Not connected'}
        >
          {connection.connected ? '● synced' : '○ unsynced'}
        </span>
        <span
          className={peers.students > 0 ? styles.dotOn : styles.dotOff}
          title={peers.students > 0 ? 'A student is in the room' : 'No student in the room'}
        >
          {peers.students > 0 ? '● student here' : '○ no student'}
        </span>
        <button
          type="button"
          className={styles.panelHide}
          onClick={() => setOpen(false)}
          aria-label="Hide the teacher panel"
        >
          ✕
        </button>
      </div>

      <div className={styles.panelControls}>
        <button type="button" className={styles.panelButton} disabled={atStart} onClick={props.onPrevious}>
          ← Previous
        </button>
        {/* It does not move the lesson on by itself — it says that it is time (spec: "The
            teacher sees it is time"). She is the one talking to the child. */}
        <button
          type="button"
          className={nextDue ? `${styles.panelButton} ${styles.panelButtonDue}` : styles.panelButton}
          disabled={atEnd}
          onClick={props.onNext}
        >
          Next →
        </button>
        <button type="button" className={styles.panelButton} onClick={props.onReset}>
          ↺ Reset this exercise
        </button>
        <button
          type="button"
          className={locked ? styles.panelButtonOn : styles.panelButton}
          aria-pressed={locked}
          onClick={() => props.onSetLocked(!locked)}
        >
          {locked ? '🔒 Student locked' : '🔓 Student can tap'}
        </button>
        {/* The lock's sibling and its opposite number: one says whether the student may
            act, this says whether the app may talk. Both are the teacher's, both cover
            both screens, and neither is the other (design D72). */}
        <button
          type="button"
          className={muted ? styles.panelButtonOn : styles.panelButton}
          aria-pressed={muted}
          onClick={() => props.onSetMuted(!muted)}
        >
          {muted ? '🔇 Voice off' : '🔊 Voice on'}
        </button>
        {/* The third of the same family, and independent of both: the lock says whether
            the student may act on the exercise, the voice whether the app may talk, and
            this whether she may draw on it. Taking the pen leaves every mark she has
            already made where it is (design D107). */}
        <button
          type="button"
          className={props.pen ? styles.panelButton : styles.panelButtonOn}
          aria-pressed={!props.pen}
          onClick={() => props.onSetPen(!props.pen)}
        >
          {props.pen ? '✏️ Student can draw' : '🚫 Student pen off'}
        </button>
      </div>

      <div className={styles.panelLink}>
        <label htmlFor="student-link">Student link</label>
        <input id="student-link" readOnly value={props.studentLink} onFocus={(e) => e.target.select()} />
        <button
          type="button"
          className={styles.panelButton}
          onClick={() => {
            void navigator.clipboard?.writeText(props.studentLink)
            setCopied(true)
            window.setTimeout(() => setCopied(false), 2000)
          }}
        >
          {copied ? 'Copied ✓' : 'Copy'}
        </button>
      </div>

      <div className={styles.panelSwitch}>
        <button type="button" className={styles.panelButton} onClick={() => setSwitching(!switching)}>
          🔄 Change lesson
        </button>
        {switching && (
          <div className={styles.panelLessons}>
            {props.lessons.map((other) => (
              <button
                key={other.id}
                type="button"
                className={styles.panelLesson}
                disabled={other.id === lesson.id}
                onClick={() => {
                  setSwitching(false)
                  props.onSwitchLesson(other)
                }}
              >
                {other.emoji} {other.title}
              </button>
            ))}
          </div>
        )}
      </div>

      {/*
        The teacher's guide (spec `teacher-guide`). It is offered here and on no other
        screen: the panel is the one surface in the app that exists only for her, so an
        entry here can never be found by a student.

        A link in a new tab, not a route: she is mid-lesson, and reading the guide must
        not take the room off her screen.
      */}
      <a
        className={styles.panelGuide}
        href={guidePath}
        target="_blank"
        rel="noreferrer"
      >
        📖 Teacher guide
      </a>

      {/* An exercise with nothing to be right about shows no key, and the space it
          would have taken is not left empty-looking (spec). */}
      {key !== null && (
        <div className={styles.answerKey}>
          <h3 className={styles.answerKeyTitle}>{key.title}</h3>
          <ul className={styles.answerKeyRows}>
            {key.rows.map((row) => (
              <li key={row.id} className={styles[`row_${row.mark}`]}>
                <span className={styles.rowLabel}>{row.label}</span>
                <span className={styles.rowValue}>{row.value}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </aside>
  )
}
