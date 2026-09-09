import {
  ERASER_RADII, INK_COLOURS, PEN_WIDTHS, type Tool,
} from './ink-tools'
import styles from './app.module.css'

/**
 * The pencil and what it holds (spec `shared-drawing`).
 *
 * The pencil itself is always there in one tap; the rest appears only once it is down, so
 * an exercise nobody is drawing on is not surrounded by tools. Everything here is this
 * participant's own — the other screen neither sees it nor is changed by it (design D108).
 */
export function InkToolbar({
  drawing, tool, onTool, colour, onColour, size, onSize,
  onUndo, onClear, canUndo, canClear, allowed,
}: {
  /** Whether this participant's pencil is down. The switch itself lives in the header. */
  drawing: boolean
  tool: Tool
  onTool: (value: Tool) => void
  colour: string
  onColour: (value: string) => void
  /** 0 or 1: the thin or the thick of whichever tool is held. */
  size: number
  onSize: (value: number) => void
  onUndo: () => void
  onClear: () => void
  canUndo: boolean
  canClear: boolean
  /** False while the teacher is holding this participant's pen (design D107). */
  allowed: boolean
}) {
  // Nothing at all until the pencil is down: an exercise nobody is drawing on should not
  // be surrounded by tools, and the switch that brings them out is in the header.
  if (!allowed || !drawing) return null

  return (
    <div className={styles.inkBar}>
      <button
        type="button"
        className={tool === 'pen' ? styles.inkToolOn : styles.inkTool}
        aria-pressed={tool === 'pen'}
        onClick={() => onTool('pen')}
        title="Pen"
      >
        🖊️
      </button>
      <button
        type="button"
        className={tool === 'eraser' ? styles.inkToolOn : styles.inkTool}
        aria-pressed={tool === 'eraser'}
        onClick={() => onTool('eraser')}
        title="Eraser — removes a whole mark"
      >
        🧽
      </button>

      <span className={styles.inkDivider} />

      {/* Two sizes of whichever tool is held. For the eraser this is how near a mark
          you must come to remove it, not how much of it goes (design D104). */}
      {[0, 1].map((step) => (
        <button
          key={step}
          type="button"
          className={size === step ? styles.inkSizeOn : styles.inkSize}
          aria-pressed={size === step}
          onClick={() => onSize(step)}
          title={step === 0 ? 'Thin' : 'Thick'}
        >
          <span
            className={styles.inkSizeDot}
            style={{
              width: `${step === 0 ? 6 : 12}px`,
              height: `${step === 0 ? 6 : 12}px`,
              background: tool === 'pen' ? colour : 'currentColor',
            }}
          />
        </button>
      ))}

      {tool === 'pen' && (
        <>
          <span className={styles.inkDivider} />
          {INK_COLOURS.map((swatch) => (
            <button
              key={swatch}
              type="button"
              className={colour === swatch ? styles.inkSwatchOn : styles.inkSwatch}
              aria-pressed={colour === swatch}
              style={{ background: swatch }}
              onClick={() => onColour(swatch)}
              title={`Draw in this colour`}
            />
          ))}
        </>
      )}

      <span className={styles.inkDivider} />

      <button
        type="button"
        className={styles.inkTool}
        onClick={onUndo}
        disabled={!canUndo}
        title="Undo my last mark"
      >
        ↩︎
      </button>
      <button
        type="button"
        className={styles.inkTool}
        onClick={onClear}
        disabled={!canClear}
        title="Clear this exercise"
      >
        🗑️
      </button>
    </div>
  )
}

/** The pen width or the eraser radius the chosen size means. */
export function sizeOf(tool: Tool, size: number): number {
  const scale = tool === 'pen' ? PEN_WIDTHS : ERASER_RADII
  return scale[size === 1 ? 1 : 0]
}
