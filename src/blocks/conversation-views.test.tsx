// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RevealView } from './RevealView'
import { DialogueView } from './DialogueView'
import { TalkView } from './TalkView'
import { PreferView } from './PreferView'
import { CombineView } from './CombineView'
import { blockLogic, combineClashes } from '@/shared/blocks'
import { testLesson } from '@/shared/__fixtures__/lesson'
import { applyAction, blockStateOf } from '@/shared/reducer'
import { fakeSpeech, mount } from './view-harness'
import type { Action, BlockOf, CombineState, Lesson } from '@/shared/types'

let m: ReturnType<typeof mount>
afterEach(() => m?.unmount())

const base = testLesson()
const SEED = 4242
const lessonWith = (block: Lesson['blocks'][number]): Lesson => ({ ...base, blocks: [block] })

describe('RevealView', () => {
  const block: BlockOf<'reveal'> = {
    id: 'peek', type: 'reveal', title: 'Guess', items: { select: 'ids', ids: ['dog', 'cat', 'lion'] }, speak: 'It is a {en}.',
  }
  const lesson = lessonWith(block)
  const initial = blockLogic.reveal.init(lesson, block, SEED)
  const item = lesson.items.find((i) => i.id === initial.order[0])!

  it('names nothing before the reveal, and hides the picture from a screen reader', () => {
    m = mount()
    m.render(<RevealView lesson={lesson} block={block} state={initial} seed={SEED} dispatch={() => {}} speech={fakeSpeech()} />)
    expect(m.container.textContent).not.toContain(item.en)
    expect(m.container.querySelector('[aria-label="A hidden picture"]')).not.toBeNull()
  })

  it('volunteers the line only on the transition to revealed', () => {
    m = mount()
    const speech = fakeSpeech()
    m.render(<RevealView lesson={lesson} block={block} state={initial} seed={SEED} dispatch={() => {}} speech={speech} />)
    m.render(<RevealView lesson={lesson} block={block} state={{ ...initial, stage: 1 }} seed={SEED} dispatch={() => {}} speech={speech} />)
    expect(speech.speak).not.toHaveBeenCalled()
    m.render(<RevealView lesson={lesson} block={block} state={{ ...initial, stage: 2 }} seed={SEED} dispatch={() => {}} speech={speech} />)
    expect(speech.speak).toHaveBeenCalledWith(`It is a ${item.en}.`)
    expect(m.container.textContent).toContain(`It is a ${item.en}.`)
  })
})

describe('DialogueView', () => {
  const block: BlockOf<'dialogue'> = {
    id: 'shop', type: 'dialogue', title: 'Shop', items: { select: 'ids', ids: ['dog', 'cat'] },
    roles: ['Shopkeeper', 'Customer'],
    lines: [{ role: 0, text: 'What do you like?' }, { role: 1, text: 'I like the {en}.' }],
  }
  const lesson = lessonWith(block)
  const initial = blockLogic.dialogue.init(lesson, block, SEED)

  it('moves the Teacher and Student labels on a swap', () => {
    m = mount()
    m.render(<DialogueView lesson={lesson} block={block} state={initial} seed={SEED} dispatch={() => {}} speech={fakeSpeech()} />)
    expect(m.container.textContent).toContain('Shopkeeper — Teacher')
    m.render(<DialogueView lesson={lesson} block={block} state={{ ...initial, swapped: true }} seed={SEED} dispatch={() => {}} speech={fakeSpeech()} />)
    expect(m.container.textContent).toContain('Shopkeeper — Student')
    expect(m.container.textContent).toContain('Customer — Teacher')
  })

  it('volunteers a new line, and replays one on demand', () => {
    m = mount()
    const speech = fakeSpeech()
    m.render(<DialogueView lesson={lesson} block={block} state={initial} seed={SEED} dispatch={() => {}} speech={speech} />)
    m.render(<DialogueView lesson={lesson} block={block} state={{ ...initial, shown: 1 }} seed={SEED} dispatch={() => {}} speech={speech} />)
    expect(speech.speak).toHaveBeenCalledWith('What do you like?')
    m.click(m.container.querySelector('button[aria-label^="Say"]')!)
    expect(speech.speak).toHaveBeenCalledWith('What do you like?', 'demand')
  })
})

describe('TalkView', () => {
  const block: BlockOf<'talk'> = {
    id: 'chat', type: 'talk', title: 'Talk',
    levels: [{ label: 'Easy', lines: ['Do you like dogs?'] }, { label: 'Harder', lines: ['Why?'] }],
  }
  const lesson = lessonWith(block)
  const initial = blockLogic.talk.init(lesson, block, SEED)

  it('invites a first question, then shows its level and volunteers it', () => {
    m = mount()
    const speech = fakeSpeech()
    m.render(<TalkView lesson={lesson} block={block} state={initial} seed={SEED} dispatch={() => {}} speech={speech} />)
    expect(m.container.textContent).toContain('Press 🎲 to start!')
    const asked = blockLogic.talk.reduce(lesson, block, initial, { t: 'tap', block: 'chat', target: 'new' })
    m.render(<TalkView lesson={lesson} block={block} state={asked} seed={SEED} dispatch={() => {}} speech={speech} />)
    expect(m.container.textContent).toContain('Easy · 1 / 2')
    expect(speech.speak).toHaveBeenCalledWith('Do you like dogs?')
  })
})

describe('PreferView', () => {
  const block: BlockOf<'prefer'> = {
    id: 'pick', type: 'prefer', title: 'This or that', items: { select: 'ids', ids: ['dog', 'cat', 'lion'] },
    sentence: 'I prefer the {en} to the {other}.', rounds: 2,
  }
  const lesson = lessonWith(block)
  const initial = blockLogic.prefer.init(lesson, block, SEED)
  const [a, b] = initial.pairs[0]!
  const en = (id: string) => lesson.items.find((i) => i.id === id)!.en

  it('names the chosen item first, and volunteers the sentence', () => {
    m = mount()
    const speech = fakeSpeech()
    m.render(<PreferView lesson={lesson} block={block} state={initial} seed={SEED} dispatch={() => {}} speech={speech} />)
    m.render(<PreferView lesson={lesson} block={block} state={{ ...initial, chosen: b }} seed={SEED} dispatch={() => {}} speech={speech} />)
    expect(m.container.textContent).toContain(`I prefer the ${en(b)} to the ${en(a)}.`)
    expect(speech.speak).toHaveBeenCalledWith(`I prefer the ${en(b)} to the ${en(a)}.`)
  })
})

describe('CombineView', () => {
  const block: BlockOf<'combine'> = {
    id: 'more', type: 'combine', title: 'Say more', items: { select: 'ids', ids: ['dog', 'cat'] },
    rows: [
      { id: 'feel', label: 'Feel', options: [{ text: 'I like', mood: 'good' }, { text: "I don't like", mood: 'bad' }] },
      { items: true, label: 'Which?' },
      { id: 'why', label: 'Why', options: [{ text: 'it is cute', mood: 'good' }, { text: 'it is scary', mood: 'bad' }, { text: 'it barks', for: ['dog'] }] },
    ],
    template: '{row:feel} the {en} because {row:why}.',
  }
  const lesson = lessonWith(block)
  const render = (state: CombineState, dispatch: (a: Action) => void = () => {}, speech = fakeSpeech()) =>
    m.render(<CombineView lesson={lesson} block={block} state={state} seed={SEED} dispatch={dispatch} speech={speech} />)

  it('offers a per-item option only while its item is chosen', () => {
    m = mount()
    render({ item: 'dog', picks: {}, heard: [] })
    expect(m.button('it barks')).toBeDefined()
    render({ item: 'cat', picks: {}, heard: [] })
    expect(m.button('it barks')).toBeUndefined()
  })

  it('asks whether it makes sense only when the parts disagree', () => {
    m = mount()
    render({ item: 'dog', picks: { feel: 0, why: 1 }, heard: [] })
    expect(m.container.textContent).toContain('Does that make sense?')
    render({ item: 'dog', picks: { feel: 0, why: 0 }, heard: [] })
    expect(m.container.textContent).not.toContain('Does that make sense?')
  })

  it('surprises with a full set of taps whose moods agree', () => {
    m = mount()
    const actions: Action[] = []
    render({ item: null, picks: {}, heard: [] }, (a) => actions.push(a))
    m.click(m.button('Surprise me'))
    let state = blockStateOf(lesson, { v: 0, lessonId: 'test', slide: 0, seed: SEED, blocks: {}, resets: {} }, block) as CombineState
    let full = { v: 0, lessonId: 'test', slide: 0, seed: SEED, blocks: {}, resets: {} }
    for (const a of actions) full = applyAction(lesson, full, a)
    state = blockStateOf(lesson, full, block) as CombineState
    expect(state.item).not.toBeNull()
    expect(Object.keys(state.picks).sort()).toEqual(['feel', 'why'])
    expect(combineClashes(block, state)).toBe(false)
  })

  it('says the built sentence on demand, in whatever voice the device has', () => {
    m = mount()
    const speech = fakeSpeech()
    const dispatch = vi.fn()
    render({ item: 'dog', picks: { feel: 0, why: 0 }, heard: [] }, dispatch, speech)
    m.click(m.button('Hear it'))
    expect(dispatch).toHaveBeenCalledWith({ t: 'tap', block: 'more', target: 'hear' })
    expect(speech.speak).toHaveBeenCalledWith('I like the dog because it is cute.', 'demand')
  })
})
