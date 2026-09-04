import { useState } from 'react'
import { answerKeyFor } from '@/shared/reducer'
import type { Lesson, LessonState } from '@/shared/types'
import type { Peers } from '@/shared/protocol'
import type { Connection } from '@/net/socket'
import styles from './app.module.css'

export type TeacherPanelProps = {
  lesson: Lesson
  lessons: readonly Lesson[]
  state: LessonState
  locked: boolean
  /** Whether the app has been told to stop speaking unasked, on both screens (D66). */
  muted: boolean
  connection: Connection
  peers: Peers
  studentLink: string
  onPrevious: () => void
  onNext: () => void
  onReset: () => void
  onSwitchLesson: (lesson: Lesson) => void
  onSetLocked: (value: boolean) => void
  onSetMuted: (value: boolean) => void
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
        <button type="button" className={styles.panelButton} disabled={atEnd} onClick={props.onNext}>
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
