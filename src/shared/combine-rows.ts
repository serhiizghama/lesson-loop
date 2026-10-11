import type { CombineMood, CombineOption, CombineRow } from './types'

/**
 * The parts of a sentence-combining block that both validation and the view need, kept
 * apart from `blocks/combine.ts` so that `validate.ts` can use them without importing a
 * module that itself imports `validate.ts` (design D155).
 */

export type OptionRow = Extract<CombineRow, { id: string }>

export function optionRows(rows: CombineRow[]): OptionRow[] {
  return rows.filter((row): row is OptionRow => 'id' in row)
}

/** Whether an option is offered while `itemId` is the chosen item. */
export function offeredFor(option: CombineOption, itemId: string | null): boolean {
  return option.for === undefined || (itemId !== null && option.for.includes(itemId))
}

/**
 * One option per row whose moods agree — every option with a mood shares it — for the
 * given item, or null when there is none. `random` picks among the candidates, so the view
 * can vary its "Surprise me" while validation, passing nothing, gets the first that fits.
 */
export function agreeingPicks(
  rows: CombineRow[],
  itemId: string,
  random: () => number = () => 0,
): Record<string, number> | null {
  const moods: Array<CombineMood | null> = random() < 0.5 ? ['good', 'bad', null] : ['bad', 'good', null]
  for (const mood of moods) {
    const picks: Record<string, number> = {}
    let complete = true
    for (const row of optionRows(rows)) {
      const candidates = row.options
        .map((option, index) => ({ option, index }))
        .filter(({ option }) => offeredFor(option, itemId))
        .filter(({ option }) => mood === null ? option.mood === undefined : option.mood === undefined || option.mood === mood)
      if (candidates.length === 0) {
        complete = false
        break
      }
      const pick = candidates[Math.min(candidates.length - 1, Math.floor(random() * candidates.length))]!
      picks[row.id] = pick.index
    }
    if (complete) return picks
  }
  return null
}

/** The moods of the chosen options, distinct; more than one means the parts disagree. */
export function chosenMoods(rows: CombineRow[], picks: Record<string, number>): CombineMood[] {
  const moods = new Set<CombineMood>()
  for (const row of optionRows(rows)) {
    const index = picks[row.id]
    const mood = index === undefined ? undefined : row.options[index]?.mood
    if (mood !== undefined) moods.add(mood)
  }
  return [...moods]
}
