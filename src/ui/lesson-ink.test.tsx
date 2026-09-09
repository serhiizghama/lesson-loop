// @vitest-environment jsdom
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { LessonPlayer } from './LessonPlayer'
import { testLesson, testState } from '@/shared/__fixtures__/lesson'
import type { Board, LessonState, Role, Stroke } from '@/shared/types'
import type { LessonStore } from './useLesson'

/**
 * Where the pencil is offered, and what taking it away does (designs D107, D113).
 *
 * Rendered to static markup rather than driven: what is being checked is which controls
 * exist and which marks are on the page, and none of that needs a pointer.
 */

const lesson = testLesson()
const BLOCK = lesson.blocks[0]?.id ?? 'vocab'

function stroke(id: string, by: Role): Stroke {
  return {
    id,
    by,
    colour: '#e11d2e',
    width: 20,
    points: [{ x: 100, y: 100 }, { x: 900, y: 900 }],
    done: true,
  }
}

function store(
  { board = {}, pen = true, inkRole = 'teacher' as Role }: {
    board?: Board
    pen?: boolean
    inkRole?: Role
  } = {},
): LessonStore {
  return {
    state: testState(),
    dispatch: () => {},
    progress: { done: 0, total: 6, percent: 0 },
    muted: false,
    setMuted: () => {},
    board,
    ink: () => {},
    inkRole,
    pen,
    setPen: () => {},
  }
}

function markup(options: Parameters<typeof store>[0] & { inkEnabled?: boolean } = {}): string {
  const { inkEnabled = false, ...rest } = options
  return renderToStaticMarkup(
    <LessonPlayer
      lesson={lesson}
      store={store(rest)}
      onExit={() => {}}
      inkEnabled={inkEnabled}
    />,
  )
}

/** How many marks are drawn on the page. */
function marks(html: string): number {
  return (html.match(/<path /g) ?? []).length
}

describe('the pencil belongs to a room (design D113)', () => {
  it('is absent from a lesson played alone', () => {
    const html = markup()
    expect(html).not.toContain('Draw')
    expect(html).not.toContain('data-drawing')
  })

  it('is there in a room', () => {
    const html = markup({ inkEnabled: true })
    expect(html).toContain('Draw')
    expect(html).toContain('data-drawing')
  })

  it('shows the marks the room already has', () => {
    const board: Board = { [BLOCK]: [stroke('s1', 'teacher'), stroke('s2', 'student')] }
    expect(marks(markup({ inkEnabled: true, board }))).toBe(2)
  })

  it('draws no mark of another exercise', () => {
    const board: Board = { 'some-other-block': [stroke('s1', 'teacher')] }
    expect(marks(markup({ inkEnabled: true, board }))).toBe(0)
  })
})

describe('taking the student’s pen (design D107)', () => {
  const board: Board = { [BLOCK]: [stroke('s1', 'teacher'), stroke('s2', 'student')] }

  it('takes the tools away from her', () => {
    const html = markup({ inkEnabled: true, board, pen: false, inkRole: 'student' })
    expect(html).not.toContain('Draw')
  })

  it('leaves every mark already made on her screen', () => {
    // The regression this exists for: gating the layer on whether she *may* draw took the
    // marks with it, and the spec says taking the pen leaves them where they are.
    const html = markup({ inkEnabled: true, board, pen: false, inkRole: 'student' })
    expect(marks(html)).toBe(2)
  })

  it('leaves the teacher’s own pen alone', () => {
    const html = markup({ inkEnabled: true, board, pen: false, inkRole: 'teacher' })
    expect(html).toContain('Draw')
  })

  it('gives it back', () => {
    const html = markup({ inkEnabled: true, board, pen: true, inkRole: 'student' })
    expect(html).toContain('Draw')
  })
})

describe('the closing screen has no pencil (spec `lesson-player`)', () => {
  it('offers no drawing mode and carries no layer', () => {
    const finish = lesson.blocks.findIndex((b) => b.type === 'finish')
    const closing: LessonState = { ...testState(), slide: finish }
    const html = renderToStaticMarkup(
      <LessonPlayer
        lesson={lesson}
        store={{ ...store(), state: closing }}
        onExit={() => {}}
        inkEnabled
      />,
    )
    expect(html).not.toContain('data-drawing')
    expect(html).not.toContain('Draw')
  })
})
