import { useState } from 'react'
import { createRoom } from '@/net/rooms'
import type { Lesson } from '@/shared/types'
import { LessonPlayer } from './LessonPlayer'
import { useLesson } from './useLesson'
import { teacherPath } from './router'
import styles from './app.module.css'

/**
 * A lesson opened from the home screen: local, offline, no socket (spec: "A room is
 * opened deliberately, never imposed"). The only thing that reaches the network here is
 * the invitation, and only when the teacher presses it.
 */
export function SoloLesson({ lesson, onExit, onInvited }: {
  lesson: Lesson
  onExit: () => void
  onInvited: (path: string) => void
}) {
  const store = useLesson(lesson)
  const [inviting, setInviting] = useState(false)
  const [failed, setFailed] = useState<string | null>(null)

  async function invite(): Promise<void> {
    // Asking twice must not open a second room, so the button is held while in flight
    // and the route changes the moment it succeeds.
    if (inviting) return
    setInviting(true)
    setFailed(null)
    try {
      const room = await createRoom(lesson, store.state)
      onInvited(teacherPath(room.code, room.teacherKey))
    } catch (error) {
      setFailed(error instanceof Error ? error.message : 'could not open a room')
      setInviting(false)
    }
  }

  return (
    <LessonPlayer
      lesson={lesson}
      store={store}
      onExit={onExit}
      headerAction={
        <button type="button" className={styles.invite} disabled={inviting} onClick={() => void invite()}>
          {inviting ? 'Opening…' : '👋 Invite student'}
        </button>
      }
      notice={
        failed === null ? undefined : (
          <p className={styles.noticeWarn}>
            The lesson carries on as it is — the room could not be opened ({failed}).
          </p>
        )
      }
    />
  )
}
