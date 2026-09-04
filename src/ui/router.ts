import { useCallback, useEffect, useState } from 'react'

/**
 * About thirty lines of router (design D16). Four paths, no nesting, no guards and no
 * loaders: a router library would be a dependency and a set of conventions bought for
 * nothing.
 *
 * The teacher's key rides in the fragment, which the browser never puts in a request
 * line, a server log or a `Referer` header (design D12).
 */
export type Route =
  | { name: 'home' }
  /** A lesson opened from the home screen: solo, offline, no room. */
  | { name: 'lesson'; lessonId: string }
  | { name: 'teacher'; code: string; key: string }
  | { name: 'student'; code: string }
  | { name: 'unknown' }

export function parseRoute(pathname: string, hash: string): Route {
  const parts = pathname.split('/').filter((p) => p !== '')
  if (parts.length === 0) return { name: 'home' }

  const [head, tail] = parts
  if (parts.length === 2 && tail !== undefined) {
    if (head === 'l') return { name: 'lesson', lessonId: tail }
    if (head === 'r') return { name: 'student', code: tail.toUpperCase() }
    if (head === 't') return { name: 'teacher', code: tail.toUpperCase(), key: hash.replace(/^#/, '') }
  }
  return { name: 'unknown' }
}

export const homePath = '/'
export const lessonPath = (lessonId: string): string => `/l/${lessonId}`
export const studentPath = (code: string): string => `/r/${code}`
export const teacherPath = (code: string, key: string): string => `/t/${code}#${key}`

export function useRoute(): { route: Route; go: (path: string, replace?: boolean) => void } {
  const [route, setRoute] = useState<Route>(() => current())

  useEffect(() => {
    const onPop = () => setRoute(current())
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const go = useCallback((path: string, replace = false) => {
    if (replace) window.history.replaceState(null, '', path)
    else window.history.pushState(null, '', path)
    setRoute(current())
  }, [])

  return { route, go }
}

function current(): Route {
  return parseRoute(window.location.pathname, window.location.hash)
}
