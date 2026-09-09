import { useCallback, useMemo, useReducer, useState } from 'react'
import { applyInk } from '@/shared/ink'
import { applyAction, createLessonState, lessonProgress } from '@/shared/reducer'
import type { Action, Board, InkOp, Lesson, LessonState, Role } from '@/shared/types'

/**
 * The single point where lesson state changes. Every view emits actions through this
 * dispatch and nothing writes to the state directly — the same discipline the next
 * change needs when the authoritative copy lives on the server.
 */
export function useLesson(lesson: Lesson) {
  const [state, rawDispatch] = useReducer(
    (current: LessonState, action: Action) => applyAction(lesson, current, action),
    lesson.id,
    createLessonState,
  )

  /**
   * Whether this lesson has been told to stop speaking unasked (design D66). Local and
   * unstored: a lesson played alone reaches no network for it, and reopening the lesson
   * starts it on, since nothing about a solo lesson is kept between visits.
   *
   * It sits here rather than in `LessonPlayer` so that a room can stand in for a local
   * lesson: `RoomStore` supplies the same two names from the room's own state, and the
   * player never learns which one it is holding (design D13).
   */
  const [muted, setMutedState] = useState(false)
  // Narrowed to a plain boolean, and not the setter React hands back, so that the room's
  // version of this — which can only send a value over a socket — has the same type and
  // `roomStoreIsALessonStore` keeps compiling.
  const setMuted = useCallback((value: boolean) => setMutedState(value), [])

  /**
   * The marks, held here for the same reason `muted` is: a room stands in for a local
   * lesson, and the player must not be able to tell which it is holding (design D13,
   * D111). Playing alone applies the very same `applyInk` the room applies and sends
   * nothing at all.
   */
  const [board, setBoard] = useState<Board>({})

  const ink = useCallback((op: InkOp) => {
    setBoard((current) => applyInk(current, op, SOLO_ROLE))
  }, [])

  // Nobody to take the pen from, and nobody to take it: solo play always has it.
  const pen = true
  const setPen = useCallback((_value: boolean) => {}, [])

  const dispatch = useCallback((action: Action) => rawDispatch(action), [])
  const progress = useMemo(() => lessonProgress(lesson, state), [lesson, state])

  return {
    state, dispatch, progress, muted, setMuted, board, ink, pen, setPen,
    /**
     * Alone, every mark is the teacher's: a lesson opened from the home screen is her own
     * screen without a room, so there is no second person for a mark to belong to. Widened
     * to `Role` so that `useRoom`, whose role is whatever the room said, still satisfies
     * `LessonStore` (design D13).
     */
    inkRole: SOLO_ROLE as Role,
  }
}

const SOLO_ROLE: Role = 'teacher'

export type LessonStore = ReturnType<typeof useLesson>
