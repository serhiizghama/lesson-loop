import type { ReactNode } from 'react'
import { playableLessons } from '@/lessons'
import type { Lesson } from '@/shared/types'
import { LessonPlayer } from './LessonPlayer'
import { TeacherPanel } from './TeacherPanel'
import { useRoom } from './useRoom'
import { studentPath } from './router'
import styles from './app.module.css'

/**
 * One lesson held between two devices. Which half of it a participant gets is decided
 * by the room from the key their link carried (design D12) — never by the route, and
 * never by anything the page could be persuaded to change.
 */
export function RoomLesson({ code, teacherKey, onExit }: {
  code: string
  teacherKey: string | null
  onExit: () => void
}) {
  const room = useRoom(code, teacherKey)
  const lesson = room.lesson

  // An unknown, expired or full room is explained rather than left spinning (spec).
  if (room.error !== null) {
    return (
      <Gate onExit={onExit}>
        {room.error === 'room-full'
          ? 'This lesson already has everyone it can hold. Ask your teacher for a new link.'
          : `Room ${code} is not available — it may have finished, or the link may be wrong.`}
      </Gate>
    )
  }

  if (room.role === null) {
    if (room.connection.unsynced) {
      return <Gate onExit={onExit}>Sync is unavailable right now, so this room cannot be joined.</Gate>
    }
    return (
      <div className={styles.roomGate}>
        <p className={styles.roomGateText}>Joining the lesson…</p>
      </div>
    )
  }

  if (lesson === null) {
    return <Gate onExit={onExit}>This room is on a lesson this app does not have.</Gate>
  }

  const teacher = room.role === 'teacher'
  const studentLink = `${window.location.origin}${studentPath(code)}`
  const slide = room.state.slide
  const block = lesson.blocks[slide]

  return (
    <LessonPlayer
      lesson={lesson}
      store={room}
      onExit={onExit}
      canSteer={teacher}
      readOnly={!teacher && room.locked}
      soundControlInPanel={teacher}
      inkEnabled
      notice={
        <RoomNotice
          unsynced={room.connection.unsynced}
          lockedOut={!teacher && room.locked}
          penOff={!teacher && !room.pen}
        />
      }
      aside={
        teacher ? (
          <TeacherPanel
            lesson={lesson}
            /* Every size, not every file: a room is switched onto a lesson, and a topic
               is not one — its exercises still say "the words this sitting teaches". */
            lessons={playableLessons()}
            state={room.state}
            locked={room.locked}
            muted={room.muted}
            pen={room.pen}
            connection={room.connection}
            peers={room.peers}
            studentLink={studentLink}
            onPrevious={() => room.dispatch({ t: 'nav', slide: slide - 1 })}
            onNext={() => room.dispatch({ t: 'nav', slide: slide + 1 })}
            onReset={() => block !== undefined && room.dispatch({ t: 'reset', block: block.id })}
            onSwitchLesson={(next: Lesson) => room.switchLesson(next)}
            onSetLocked={room.setLocked}
            onSetMuted={room.setMuted}
            onSetPen={room.setPen}
          />
        ) : undefined
      }
    />
  )
}

/** Never a blank screen: what happened, and a way back to the lessons (spec). */
function Gate({ children, onExit }: { children: ReactNode; onExit: () => void }) {
  return (
    <div className={styles.roomGate}>
      <p className={styles.roomGateText}>{children}</p>
      <button type="button" className={styles.panelButton} onClick={onExit}>
        Back to the lessons
      </button>
    </div>
  )
}

function RoomNotice({ unsynced, lockedOut, penOff }: {
  unsynced: boolean
  lockedOut: boolean
  penOff: boolean
}) {
  // All three can be true at once: they are separate rules about separate things.
  return (
    <>
      {lockedOut && <p className={styles.noticeTurn}>✋ It’s the teacher’s turn.</p>}
      {penOff && <p className={styles.noticeTurn}>✏️ The teacher has the pen just now.</p>}
      {unsynced && (
        <p className={styles.noticeWarn}>
          Working without sync — the lesson still works, and it will catch up on its own.
        </p>
      )}
    </>
  )
}
