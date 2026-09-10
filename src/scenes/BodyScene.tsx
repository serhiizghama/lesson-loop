import type { SceneProps } from './types'

/**
 * The drawing the Body Parts lesson labels (design D128, D134).
 *
 * Two panels rather than one figure: a large head on the left, a small whole figure on the
 * right. That is not a style choice — nine parts on one figure cannot be spaced far enough
 * apart to be tapped. The stage gives a view about 856 × 510 px and scales it down to about
 * four tenths on the narrowest screen, so neighbouring parts need roughly 110 px between
 * their centres in this space, and six of them stacked down one figure would want 660 px of
 * the 510 there are.
 *
 * Every part is drawn around the centre the lesson declares for it, so the geometry here
 * and the `spots` in `lessons/body-parts.json` are one thing in two files:
 *
 *   hair (250, 62)   eyes (250, 180)  ears (72, 250)   nose (250, 295)
 *   mouth (250, 415) arm (490, 180)   hand (630, 275)  leg (540, 369)   foot (620, 455)
 *
 * The arm and leg are marked on the figure's left, the hand and foot on its right: putting
 * each label on a different limb is what buys the last of the separation.
 *
 * The palette and the friendly, thick-outlined style are the teacher's own page's
 * (`docs/reference/body_parts_lesson.html`); the geometry is not.
 *
 * `aria-hidden` because the drawing carries no information a screen reader needs: every
 * place on it is a labelled button in `HotspotView`, drawn over the top.
 */
export function BodyScene({ className }: SceneProps): React.ReactElement {
  return (
    <svg
      className={className}
      viewBox="0 0 700 480"
      preserveAspectRatio="xMidYMid meet"
      width="100%"
      aria-hidden
      focusable="false"
    >
      {/* ── The head, large enough for five parts ─────────────────────────── */}

      {/* Ears first, so the face's outline runs over where they meet it. */}
      <ellipse cx="72" cy="250" rx="34" ry="46" fill={SKIN} stroke={INK} strokeWidth={STROKE} />
      <ellipse cx="428" cy="250" rx="34" ry="46" fill={SKIN} stroke={INK} strokeWidth={STROKE} />

      <ellipse cx="250" cy="240" rx="175" ry="225" fill={SKIN} stroke={INK} strokeWidth={STROKE} />

      {/* Hair: a cap over the top of the face, centred on (250, 62). */}
      <path
        d="M82 190 Q96 22 250 22 Q404 22 418 190 Q392 96 250 96 Q108 96 82 190 Z"
        fill={HAIR}
        stroke={INK}
        strokeWidth={STROKE}
        strokeLinejoin="round"
      />

      {/* Eyes, centred as a pair on (250, 180). */}
      <ellipse cx="192" cy="180" rx="32" ry="27" fill={WHITE} stroke={INK} strokeWidth={STROKE} />
      <ellipse cx="308" cy="180" rx="32" ry="27" fill={WHITE} stroke={INK} strokeWidth={STROKE} />
      <circle cx="196" cy="184" r="13" fill={INK} />
      <circle cx="312" cy="184" r="13" fill={INK} />

      {/* Nose, centred on (250, 295). */}
      <path
        d="M250 265 Q230 300 242 320 Q250 328 258 320 Q270 300 250 265 Z"
        fill={SKIN_DEEP}
        stroke={INK}
        strokeWidth={STROKE}
        strokeLinejoin="round"
      />

      {/* Mouth, centred on (250, 415). */}
      <path
        d="M188 396 Q250 452 312 396 Q250 418 188 396 Z"
        fill={MOUTH}
        stroke={INK}
        strokeWidth={STROKE}
        strokeLinejoin="round"
      />

      {/* ── The whole figure, for the four parts that are not on a head ────── */}

      <circle cx="560" cy="60" r="36" fill={SKIN} stroke={INK} strokeWidth={STROKE} />
      <path
        d="M520 300 Q520 96 560 96 Q600 96 600 300 Z"
        fill={SHIRT}
        stroke={INK}
        strokeWidth={STROKE}
        strokeLinejoin="round"
      />

      {/* Arms: the lesson marks the one on the figure's left, centred on (490, 180). */}
      <rect
        x="470" y="112" width="40" height="140" rx="20"
        fill={SKIN} stroke={INK} strokeWidth={STROKE}
      />
      <rect
        x="610" y="112" width="40" height="140" rx="20"
        fill={SKIN} stroke={INK} strokeWidth={STROKE}
      />

      {/* Hands: the lesson marks the one on the right, centred on (630, 275). */}
      <circle cx="490" cy="275" r="26" fill={SKIN} stroke={INK} strokeWidth={STROKE} />
      <circle cx="630" cy="275" r="26" fill={SKIN} stroke={INK} strokeWidth={STROKE} />

      {/* Legs: the lesson marks the one on the left, centred on (540, 369). */}
      <rect
        x="520" y="298" width="40" height="145" rx="18"
        fill={TROUSERS} stroke={INK} strokeWidth={STROKE}
      />
      <rect
        x="580" y="298" width="40" height="145" rx="18"
        fill={TROUSERS} stroke={INK} strokeWidth={STROKE}
      />

      {/* Feet: the lesson marks the one on the right, centred on (620, 455). */}
      <ellipse cx="534" cy="455" rx="34" ry="17" fill={INK} />
      <ellipse cx="620" cy="455" rx="36" ry="18" fill={INK} />
    </svg>
  )
}

const INK = '#2E3452'
const HAIR = '#4A3728'
const SKIN = '#FFE0B2'
const SKIN_DEEP = '#F5C98A'
const WHITE = '#FFFFFF'
const MOUTH = '#D9647A'
const SHIRT = '#6EC6E8'
const TROUSERS = '#4B5487'
const STROKE = 3
