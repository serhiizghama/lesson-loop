/**
 * The drawings a lesson may label, by name (design D125).
 *
 * Only the names and the coordinate space live here, because `validate.ts` runs inside
 * the Durable Object as readily as in the browser and may not import a React component.
 * The artwork itself is in `src/scenes/`, keyed by the same ids.
 *
 * This is the narrow exception to "a new lesson needs no new code" (spec `lesson-format`):
 * a lesson labelling a drawing the app already carries is data alone, while a drawing
 * nobody has made yet is a file here and a deploy.
 */

export const SCENE_IDS = ['body'] as const

export type SceneId = (typeof SCENE_IDS)[number]

/**
 * The size a scene is drawn at, and so the space its `viewBox` and a lesson's rectangles
 * are fractions of. Kept as numbers rather than a ratio because the drawing is authored
 * against them.
 */
export type SceneSize = { width: number; height: number }

export const SCENES: { [S in SceneId]: SceneSize } = {
  /**
   * The nine parts the teacher's own Body Parts page labels, drawn as two panels — a large
   * head beside a small whole figure — rather than as her single figure. Landscape, and
   * this large, because the stage gives a view about 856 × 510 px and nine parts on one
   * figure cannot be spaced far enough apart to be tapped by a child (design D128).
   */
  body: { width: 700, height: 480 },
}

export function isSceneId(value: string): value is SceneId {
  return (SCENE_IDS as readonly string[]).includes(value)
}
