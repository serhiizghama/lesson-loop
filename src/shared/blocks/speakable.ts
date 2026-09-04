import type { Block, Lesson } from '../types'
import { renderTemplate, faceSpeech } from '../text'
import { resolveItems } from '../validate'
import { cardsSpeech } from './cards'
import { matchPairSpeech } from './match'

/**
 * Every line a lesson can ever speak, derived from its data alone (spec: every line a
 * lesson can speak is known before the lesson runs).
 *
 * This exists so lines can be recorded ahead of time (design D52). That is only possible
 * because nothing a block speaks depends on how the lesson is played: a template and the
 * vocabulary it is applied to are both static, so "This is my nose." is as knowable now as
 * "nose" is. The seed shuffles the order words arrive in, never which words exist.
 *
 * It must agree with what the views actually pass to `speech.speak()`. A block type that
 * speaks something this function does not return is a silent gap in the recordings, so the
 * per-type rules here are the same calls the views make, and a test holds them to it.
 */
export function speakableLines(lesson: Lesson): string[] {
  const lines = new Set<string>()
  for (const block of lesson.blocks) {
    for (const line of linesOf(lesson, block)) {
      if (line !== null && line.trim().length > 0) lines.add(line)
    }
  }
  return [...lines]
}

function linesOf(lesson: Lesson, block: Block): Array<string | null> {
  switch (block.type) {
    case 'cards':
      // CardsView speaks the card's own template on every flip.
      return resolveItems(lesson, block.items).map((item) => cardsSpeech(block, item))

    case 'match':
      // MatchView speaks each face as it is tapped, and the pair line when one closes.
      return resolveItems(lesson, block.items).flatMap((item) => [
        faceSpeech(item, block.left),
        faceSpeech(item, block.right),
        matchPairSpeech(block, item),
      ])

    case 'sentence':
      // Every level × every item: the learner can reach any combination.
      return resolveItems(lesson, block.items).flatMap((item) =>
        block.levels.map((level) => renderTemplate(level.template, item)),
      )

    case 'tpr':
      return resolveItems(lesson, block.items).map((item) => renderTemplate(block.prompt, item))

    case 'listen':
    case 'sort':
      return resolveItems(lesson, block.items).map((item) => item.en)

    case 'finish':
      // Nothing is spoken on the closing slide.
      return []
  }
}
