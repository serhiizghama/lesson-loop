import { useCallback, useMemo, useReducer, useState } from 'react'
import { applyAction, createLessonState, lessonProgress } from '@/shared/reducer'
import type { Action, Lesson, LessonState } from '@/shared/types'

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

  const dispatch = useCallback((action: Action) => rawDispatch(action), [])
  const progress = useMemo(() => lessonProgress(lesson, state), [lesson, state])

  return { state, dispatch, progress, muted, setMuted }
}

export type LessonStore = ReturnType<typeof useLesson>
