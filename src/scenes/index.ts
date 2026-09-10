import type { SceneId } from '@/shared/scenes'
import type { SceneComponent } from './types'
import { BodyScene } from './BodyScene'

/**
 * The artwork behind each scene name, registered exactly like the block logic and the
 * block views: a mapped type over the ids, so a scene named in `src/shared/scenes.ts`
 * with no drawing here is a compile error rather than a blank exercise.
 */
export const scenes: { [S in SceneId]: SceneComponent } = {
  body: BodyScene,
}

export type { SceneComponent, SceneProps } from './types'
