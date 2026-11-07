// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { act } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SpellView } from './SpellView'
import { fakeSpeech, mount } from './view-harness'
import { blockLogic, spellLetters, spellTarget, spellWord } from '@/shared/blocks'
import { testLesson } from '@/shared/__fixtures__/lesson'
import { itemById } from '@/shared/text'
import { quietable } from '@/speech/policy'
import { stageScale } from '@/ui/stage'
import type { Speech } from '@/speech/speech'
import type { Action, BlockOf, Item, SpellState } from '@/shared/types'

const lesson = testLesson()
const block = lesson.blocks.find((b) => b.type === 'spell') as BlockOf<'spell'>
const SEED = 4242

let view: ReturnType<typeof mount>
afterEach(() => view.unmount())

function render(state: SpellState, speech: Speech, dispatch: (a: Action) => void = () => {}): void {
  view.render(
    <SpellView
      lesson={lesson}
      block={block}
      state={state}
      seed={SEED}
      dispatch={dispatch}
      speech={speech}
    />,
  )
}

const initial = (): SpellState => blockLogic.spell.init(lesson, block, SEED)
const itemOf = (state: SpellState) => itemById(lesson, spellTarget(state) as string) as Item
const buttons = () => [...view.container.querySelectorAll<HTMLButtonElement>('button')]
const hear = () => buttons().find((b) => b.textContent?.includes('Listen')) as HTMLButtonElement
const forward = () => buttons().find((b) => b.textContent === 'Next word →')
const tiles = () => buttons().filter((b) => b !== hear() && b !== forward())
const places = () => [...view.container.querySelectorAll('[class*="spellPlace"]:not([class*="spellPlaces"])')]
const wholeOf = (state: SpellState): SpellState => ({ ...state, placed: spellWord(itemOf(state)).length })

describe('the spelling view', () => {
  it('offers the word’s letters, shuffled, and one empty place for each', () => {
    view = mount()
    const state = initial()
    render(state, fakeSpeech())
    expect(tiles().map((b) => b.textContent)).toEqual(spellLetters(lesson, state, SEED))
    expect(places()).toHaveLength(spellWord(itemOf(state)).length)
    expect(places().every((p) => p.textContent === '')).toBe(true)
  })

  it('does not write the word or its gloss before it has been spelled', () => {
    view = mount()
    const state = initial()
    render(state, fakeSpeech())
    const item = itemOf(state)
    const shown = view.container.innerHTML
    expect(shown).not.toContain(`>${item.en}<`)
    expect(view.container.textContent).not.toContain(item.en)
    expect(view.container.textContent).not.toContain(item.l1?.word as string)
    expect(view.container.querySelector(`img[alt="${item.en}"]`)).toBeNull()
  })

  it('places the letter whose tile was tapped', () => {
    view = mount()
    const dispatch = vi.fn()
    render(initial(), fakeSpeech(), dispatch)
    const tile = tiles()[0]
    act(() => tile?.click())
    expect(dispatch).toHaveBeenCalledWith({
      t: 'pick', block: block.id, side: 'a', target: tile?.textContent,
    })
  })

  it('fills the places in order and disables the tile that was used', () => {
    view = mount()
    const state = { ...initial(), placed: 1 }
    render(state, fakeSpeech())
    const first = spellWord(itemOf(state))[0] as string
    expect(places()[0]?.textContent).toBe(first)
    expect(places()[1]?.textContent).toBe('')
    expect(tiles().filter((b) => b.disabled).map((b) => b.textContent)).toEqual([first])
  })

  it('marks a refused letter, and leaves it tappable', () => {
    view = mount()
    const state = initial()
    const wrong = spellLetters(lesson, state, SEED).find((l) => l !== spellWord(itemOf(state))[0]) as string
    render({ ...state, wrong }, fakeSpeech())
    const marked = tiles().filter((b) => b.className.includes('tileWrong'))
    expect(marked.map((b) => b.textContent).every((t) => t === wrong)).toBe(true)
    expect(marked.length).toBeGreaterThan(0)
    expect(marked.every((b) => !b.disabled)).toBe(true)
  })

  it('says nothing when a word appears or as letters land', () => {
    view = mount()
    const speech = fakeSpeech()
    const state = initial()
    render(state, speech)
    render({ ...state, placed: 1 }, speech)
    expect(speech.speak).not.toHaveBeenCalled()
  })

  it('speaks the word once when its last letter lands, and not again on re-render', () => {
    view = mount()
    const speech = fakeSpeech()
    const state = initial()
    render(state, speech)
    render(wholeOf(state), speech)
    render({ ...wholeOf(state), wrong: null }, speech)
    expect(speech.speak).toHaveBeenCalledTimes(1)
    expect(speech.speak).toHaveBeenCalledWith(itemOf(state).en)
  })

  it('says the word on demand, and that changes nothing about the exercise', () => {
    view = mount()
    const speech = fakeSpeech()
    const dispatch = vi.fn()
    const state = initial()
    render(state, speech, dispatch)
    act(() => hear().click())
    expect(speech.speak).toHaveBeenCalledWith(itemOf(state).en, 'demand')
    expect(dispatch).not.toHaveBeenCalled()
  })

  it('with the sound off, volunteers nothing but still says the word on demand', () => {
    view = mount()
    const base = fakeSpeech()
    const quiet = quietable(base, true)
    const state = initial()
    render(state, quiet)
    render(wholeOf(state), quiet)
    expect(places().map((p) => p.textContent).join('')).toBe(itemOf(state).en)
    expect(base.speak).not.toHaveBeenCalled()
    act(() => hear().click())
    expect(base.speak).toHaveBeenCalledWith(itemOf(state).en, 'demand')
  })

  it('offers the next word only when this one is whole', () => {
    view = mount()
    const state = initial()
    render(state, fakeSpeech())
    expect(forward()).toBeUndefined()
    const dispatch = vi.fn()
    render(wholeOf(state), fakeSpeech(), dispatch)
    act(() => forward()?.click())
    expect(dispatch).toHaveBeenCalledWith({ t: 'tap', block: block.id, target: spellTarget(state) })
    expect(tiles().every((b) => b.disabled)).toBe(true)
  })

  it('offers no way past the last word', () => {
    view = mount()
    const state = { ...initial(), index: initial().order.length - 1 }
    render(wholeOf(state), fakeSpeech())
    expect(forward()).toBeUndefined()
  })
})

describe('a letter tile under a finger (design D169)', () => {
  it('is at least 44 px at the narrowest supported width', () => {
    const css = readFileSync(join(process.cwd(), 'src/blocks/blocks.module.css'), 'utf8')
    const rule = /\.spellTile \{([^}]*)\}/.exec(css)?.[1] ?? ''
    const px = (name: string) => Number(new RegExp(`${name}: ([\\d.]+)rem`).exec(rule)?.[1]) * 16
    // What the stage is actually given in a 380 px window: `.split` keeps 0.75 rem each side.
    // Measured on screen, because the window's own width overstated this tile by 2 px.
    const available = 380 - 2 * 0.75 * 16
    expect(px('width') * stageScale(available)).toBeGreaterThanOrEqual(44)
    expect(px('height') * stageScale(available)).toBeGreaterThanOrEqual(44)
  })
})
