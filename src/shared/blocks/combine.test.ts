import { describe, expect, it } from 'vitest'
import { answerKeyFor, applyAction, isBlockComplete } from '../reducer'
import { harness } from '../__fixtures__/harness'
import { agreeingPicks, combineClashes, combineSentence, isBuilt } from './combine'
import type { BlockOf, CombineState } from '../types'

const block: BlockOf<'combine'> = {
  id: 'more', type: 'combine', title: 'Say more', items: { select: 'ids', ids: ['dog', 'cat'] },
  rows: [
    { id: 'feel', label: 'Feel', options: [{ text: 'I like', mood: 'good' }, { text: "I don't like", mood: 'bad' }] },
    { items: true, label: 'Which?' },
    {
      id: 'why', label: 'Why',
      options: [
        { text: 'it is cute', mood: 'good' },
        { text: 'it is scary', mood: 'bad' },
        { text: 'it barks', for: ['dog'] },
      ],
    },
  ],
  template: '{row:feel} the {en} because {row:why}.',
}
const { lesson, tap, run, stateOf } = harness<CombineState>(block)
const dog = lesson.items.find((i) => i.id === 'dog')!

describe('combine', () => {
  it('builds the sentence from the choices', () => {
    const s = stateOf(run([tap('dog'), tap('row:feel:0'), tap('row:why:0')]))
    expect(isBuilt(block, s)).toBe(true)
    expect(combineSentence(block, s, dog)).toBe('I like the dog because it is cute.')
  })

  it('clears a pick that does not belong to the newly chosen item', () => {
    const s = stateOf(run([tap('dog'), tap('row:feel:0'), tap('row:why:2'), tap('cat')]))
    expect(s.picks).toEqual({ feel: 0 })
  })

  it('refuses an option that belongs to another item', () => {
    const onCat = run([tap('cat')])
    expect(applyAction(lesson, onCat, tap('row:why:2'))).toBe(onCat)
  })

  it('refuses to be heard while a row is empty', () => {
    const partial = run([tap('dog'), tap('row:feel:0')])
    expect(applyAction(lesson, partial, tap('hear'))).toBe(partial)
  })

  it('is complete when a sentence has been heard for every item', () => {
    const dogDone = run([tap('dog'), tap('row:feel:0'), tap('row:why:0'), tap('hear')])
    expect(isBlockComplete(lesson, dogDone, block)).toBe(false)
    const both = run([tap('cat'), tap('hear')], dogDone)
    expect(stateOf(both).heard).toEqual(['dog', 'cat'])
    expect(isBlockComplete(lesson, both, block)).toBe(true)
  })

  it('notices parts whose moods disagree, without refusing them', () => {
    const s = stateOf(run([tap('dog'), tap('row:feel:0'), tap('row:why:1')]))
    expect(combineClashes(block, s)).toBe(true)
    expect(combineClashes(block, stateOf(run([tap('dog'), tap('row:feel:1'), tap('row:why:1')])))).toBe(false)
  })

  it('finds only picks whose moods agree, for every random draw', () => {
    for (let k = 0; k < 50; k++) {
      let n = k
      const random = () => ((n = (n * 9301 + 49297) % 233280) / 233280)
      const picks = agreeingPicks(block.rows, 'dog', random)!
      const s: CombineState = { item: 'dog', picks, heard: [] }
      expect(combineClashes(block, s)).toBe(false)
    }
  })

  it('keys each item with its sentence', () => {
    const key = answerKeyFor(lesson, run([tap('dog'), tap('row:feel:0'), tap('row:why:0')]), block)!
    expect(key.rows.find((r) => r.id === 'dog')!.value).toBe('I like the dog because it is cute.')
  })
})
