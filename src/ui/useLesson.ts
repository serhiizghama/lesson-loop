import { useCallback, useMemo, useReducer } from 'react'
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

  const dispatch = useCallback((action: Action) => rawDispatch(action), [])
  const progress = useMemo(() => lessonProgress(lesson, state), [lesson, state])

  return { state, dispatch, progress }
}

export type LessonStore = ReturnType<typeof useLesson>
