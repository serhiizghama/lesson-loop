import type { Block, Lesson } from '../types'
import { renderTemplate, faceSpeech } from '../text'
import { resolveItems } from '../validate'
import { cardsSpeech } from './cards'
import { matchPairSpeech } from './match'
import { quizSpeech } from './quiz'
import { describeSentence } from './describe'
import { yesnoQuestion, yesnoReply } from './yesno'
import { secretFoundLine, secretGuessLine } from './secret'
import { revealLine } from './reveal'
import { dialogueLine } from './dialogue'
import { preferSentence } from './prefer'
import { hotspotSpeech } from './hotspot'
import { memoryPairSpeech } from './memory'

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

    case 'phrases':
      // PhrasesView speaks the phrase whose control was pressed, and nothing else.
      return block.lines

    case 'quiz':
      // QuizView speaks the answer once the prompt is answered, never the prompt itself.
      return resolveItems(lesson, block.items).map((item) => quizSpeech(block, item))

    case 'describe':
      // DescribeView speaks the combined sentence, and only once both answers are in.
      return resolveItems(lesson, block.items).map((item) => describeSentence(block, item))

    case 'hotspot':
      // HotspotView speaks the word as it is picked up, and the block's line as it lands.
      return resolveItems(lesson, block.items).flatMap((item) => [
        item.en,
        hotspotSpeech(block, item),
      ])

    case 'memory':
      // MemoryView speaks each face as its card turns up, and the pair line when one closes.
      return resolveItems(lesson, block.items).flatMap((item) => [
        faceSpeech(item, block.left),
        faceSpeech(item, block.right),
        memoryPairSpeech(block, item),
      ])

    case 'scramble':
      // ScrambleView speaks the whole sentence when its last word lands, and no word of it
      // on its own (design D132) — which is what keeps this one line per item.
      return resolveItems(lesson, block.items).map((item) =>
        renderTemplate(block.template, item),
      )

    case 'yesno': {
      // YesNoView speaks the question from its control only, never on arrival, and the
      // reply to whichever answer is given. A check's question may name any selected item over any
      // picture, so every item's question and both replies are possible.
      const items = resolveItems(lesson, block.items)
      return items.flatMap((item) => [
        yesnoQuestion(block, item),
        yesnoReply(block, item, 'yes'),
        yesnoReply(block, item, 'no'),
      ])
    }

    case 'secret':
      // SecretView speaks the guess line for a wrong tile and the found line for the secret.
      return resolveItems(lesson, block.items).flatMap((item) => [
        secretGuessLine(block, item),
        secretFoundLine(block, item),
      ])

    case 'reveal':
      // RevealView volunteers the line as a picture is revealed.
      return resolveItems(lesson, block.items).map((item) => revealLine(block, item))

    case 'dialogue':
      // DialogueView volunteers each line as it appears, and replays it from its 🔊.
      return resolveItems(lesson, block.items).flatMap((item) =>
        block.lines.map((_line, at) => dialogueLine(block, item, at)),
      )

    case 'talk':
      // TalkView volunteers a question as it is asked, and replays it from its 🔊.
      return block.levels.flatMap((level) => level.lines)

    case 'prefer': {
      // PreferView volunteers the sentence once a choice is made: every ordered pair.
      const items = resolveItems(lesson, block.items)
      return items.flatMap((chosen) =>
        items.filter((other) => other.id !== chosen.id).map((other) => preferSentence(block, chosen, other)),
      )
    }

    case 'combine':
      // THE ONE NAMED EXCEPTION (spec, speech: every line is known before the lesson runs).
      // A combiner's sentences run to hundreds per lesson and are spoken by the device's
      // voice, at the teacher's choice — so they are deliberately not collected here and
      // never recorded. No other type may return nothing while it speaks (design D155).
      return []

    case 'finish':
      // Nothing is spoken on the closing slide.
      return []
  }
}
