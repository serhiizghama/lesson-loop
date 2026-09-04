import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { lessonById } from '@/lessons'
import { lessonProgress, newLessonState } from '@/shared/reducer'
import {
  newClientView, viewAct, viewConnected, viewReceive, type ClientView,
} from '@/shared/room'
import { hello, type Peers, type Role, type RoomErrorCode } from '@/shared/protocol'
import { RoomSocket, connectionOf, type Connection } from '@/net/socket'
import type { Action, Lesson } from '@/shared/types'
import type { LessonStore } from './useLesson'

export type RoomStore = LessonStore & {
  /**
   * The lesson the room is on, or null until its first snapshot has arrived — and again
   * if it moves to one this build does not carry.
   */
  lesson: Lesson | null
  role: Role | null
  locked: boolean
  connection: Connection
  peers: Peers
  /** Set when the room refused us outright; retrying would not help. */
  error: RoomErrorCode | null
  /** Teacher-only; refused by the room for anyone else (design D14). */
  setLocked: (value: boolean) => void
  switchLesson: (lesson: Lesson) => void
}

/**
 * The synced twin of `useLesson` (design D13). It returns the same
 * `{ state, dispatch, progress }` a solo lesson does, so `LessonPlayer` and every block
 * view are handed a store and never learn whether a room is behind it.
 *
 * The reconciliation itself lives in `src/shared/room.ts` and is what the transport-free
 * convergence test drives; this hook is the React wrapper and adds no rules of its own.
 */
export function useRoom(code: string, teacherKey: string | null): RoomStore {
  // Which lesson the room is on is the room's to say, so the hook starts on none and
  // reads it back out of the first snapshot.
  const [view, setView] = useState<ClientView>(() => newClientView(newLessonState('', 0)))
  const [connection, setConnection] = useState<Connection>(() => connectionOf(false, 0))
  const [peers, setPeers] = useState<Peers>({ teacher: false, students: 0 })
  const [error, setError] = useState<RoomErrorCode | null>(null)
  const socketRef = useRef<RoomSocket | null>(null)

  useEffect(() => {
    const socket = new RoomSocket({
      url: socketUrl(code),
      hello: hello(code, teacherKey),
      onMessage: (message) => {
        if (message.t === 'peers') {
          setPeers(message.peers)
          return
        }
        // A room that does not exist, or has no seat left, will not exist on the next
        // attempt either: say so instead of reconnecting into the same refusal.
        if (message.t === 'error' && message.code !== 'bad-message') {
          setError(message.code)
          socket.stop()
          return
        }
        setView((current) => viewReceive(current, message))
      },
      onConnection: (next) => {
        setConnection(next)
        // A fresh socket takes the room's account whole: a device that played on while
        // unsynced can be ahead in version and must still end up in agreement.
        if (next.connected) setView(viewConnected)
        else setPeers({ teacher: false, students: 0 })
      },
    })
    socketRef.current = socket
    setError(null)
    socket.start()
    return () => {
      socket.stop()
      socketRef.current = null
    }
  }, [code, teacherKey])

  /**
   * The tap lands here first and is sent afterwards (spec: "No lag on one's own tap").
   * With the socket down this is the whole of it, which is what keeps the lesson
   * playable while unsynced.
   */
  const dispatch = useCallback((action: Action) => {
    setView((current) => {
      const lesson = lessonById(current.state.lessonId)
      return lesson === undefined ? current : viewAct(current, lesson, action)
    })
    socketRef.current?.send({ t: 'action', action })
  }, [])

  const setLocked = useCallback((value: boolean) => {
    socketRef.current?.send({ t: 'lock', value })
  }, [])

  const switchLesson = useCallback((next: Lesson) => {
    socketRef.current?.send({ t: 'switch-lesson', lesson: next })
  }, [])

  const lesson = lessonById(view.state.lessonId) ?? null
  const progress = useMemo(
    () => (lesson === null ? { done: 0, total: 0, percent: 0 } : lessonProgress(lesson, view.state)),
    [lesson, view.state],
  )

  return {
    state: view.state,
    dispatch,
    progress,
    lesson,
    role: view.role,
    locked: view.locked,
    connection,
    peers,
    error,
    setLocked,
    switchLesson,
  }
}

/**
 * Same origin as the page, so `vite dev` proxies it to `wrangler dev` in development
 * and nothing needs configuring (design D17).
 */
function socketUrl(code: string): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${window.location.host}/ws?room=${encodeURIComponent(code)}`
}

/**
 * A room can stand in for a local lesson. This is the compile-time half of design D13:
 * if `useRoom` ever stopped returning what `useLesson` returns, the views would have to
 * learn which one they are holding, and this line would stop compiling first.
 */
export const roomStoreIsALessonStore: RoomStore extends LessonStore ? true : never = true
