import type { ReactNode } from 'react'
import { lessons } from '@/lessons'
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
      notice={<RoomNotice unsynced={room.connection.unsynced} lockedOut={!teacher && room.locked} />}
      aside={
        teacher ? (
          <TeacherPanel
            lesson={lesson}
            lessons={lessons}
            state={room.state}
            locked={room.locked}
            connection={room.connection}
            peers={room.peers}
            studentLink={studentLink}
            onPrevious={() => room.dispatch({ t: 'nav', slide: slide - 1 })}
            onNext={() => room.dispatch({ t: 'nav', slide: slide + 1 })}
            onReset={() => block !== undefined && room.dispatch({ t: 'reset', block: block.id })}
            onSwitchLesson={(next: Lesson) => room.switchLesson(next)}
            onSetLocked={room.setLocked}
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

function RoomNotice({ unsynced, lockedOut }: { unsynced: boolean; lockedOut: boolean }) {
  // Both can be true: the connection went while the teacher had the floor.
  return (
    <>
      {lockedOut && <p className={styles.noticeTurn}>✋ It’s the teacher’s turn.</p>}
      {unsynced && (
        <p className={styles.noticeWarn}>
          Working without sync — the lesson still works, and it will catch up on its own.
        </p>
      )}
    </>
  )
}
