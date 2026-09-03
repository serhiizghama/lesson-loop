import type { Lesson } from '../types'

/** A small lesson exercising every block type, used across the shared unit tests. */
export function testLesson(): Lesson {
  return {
    id: 'test',
    title: 'Test',
    emoji: '🧪',
    audience: 'kids',
    l1: 'ja',
    items: [
      {
        id: 'dog', en: 'dog', emoji: '🐶', l1: { word: '犬', romaji: 'inu' },
        example: 'It is a dog.', tags: { sound: 'Woof', habitat: 'farm', move: 'Run like a dog!' },
      },
      {
        id: 'cat', en: 'cat', emoji: '🐱', l1: { word: '猫', romaji: 'neko' },
        example: 'It is a cat.', tags: { sound: 'Meow', habitat: 'farm', move: 'Stretch like a cat!' },
      },
      {
        id: 'lion', en: 'lion', emoji: '🦁', l1: { word: 'ライオン', romaji: 'raion' },
        example: 'It is a lion.', tags: { sound: 'Roar', habitat: 'jungle', move: 'Roar like a lion!' },
      },
      {
        id: 'elephant', en: 'elephant', emoji: '🐘', l1: { word: '象', romaji: 'zou' },
        example: 'It is an elephant.', tags: { sound: 'Toot', habitat: 'jungle', move: 'Stomp!' },
      },
      {
        id: 'eyes', en: 'eyes', emoji: '👁️', plural: true, l1: { word: '目', romaji: 'me' },
        example: 'They are eyes.', tags: { sound: 'Blink', habitat: 'farm', move: 'Blink!' },
      },
    ],
    blocks: [
      { id: 'vocab', type: 'cards', title: 'What is it?', items: { select: 'all' }, front: 'emoji', back: ['en', 'l1'] },
      { id: 'pairs', type: 'match', title: 'Matching', items: { select: 'all' }, left: 'emoji', right: 'en', count: 3 },
      {
        id: 'say', type: 'sentence', title: 'Say it bigger', items: { select: 'all' },
        levels: [
          { label: 'One word', template: '{en}' },
          { label: 'It is a…', template: '{it} {be} {article} {en}.' },
          { label: 'This is a…', template: '{this} {be} {article} {en}.' },
        ],
      },
      {
        id: 'homes', type: 'sort', title: 'Where do they live?', items: { select: 'all' }, by: 'habitat',
        buckets: [
          { key: 'farm', label: 'Farm', emoji: '🏡' },
          { key: 'jungle', label: 'Jungle', emoji: '🌴' },
        ],
      },
      { id: 'ears', type: 'listen', title: 'Listen', items: { select: 'all' }, choices: 3 },
      { id: 'move', type: 'tpr', title: 'Move like me', items: { select: 'all' }, prompt: '{tag:move}' },
      { id: 'done', type: 'finish', title: 'Great job!', message: 'You did it!' },
    ],
  }
}

/** A state with a fixed seed, so tests never depend on the draw. */
export function testState(seed = 4242) {
  return { v: 0, lessonId: 'test', slide: 0, seed, blocks: {}, resets: {} }
}
