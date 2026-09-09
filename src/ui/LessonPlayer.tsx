import {
  useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode,
} from 'react'
import { blockViews, type BlockView } from '@/blocks'
import { preloadPictures } from '@/blocks/Picture'
import { speakableLines } from '@/shared/blocks'
import { blockStateOf, isLessonComplete, isNextDue, lessonTrail } from '@/shared/reducer'
import { seedFor } from '@/shared/rng'
import type { BlockType, Lesson } from '@/shared/types'
import { speech } from '@/speech/speech'
import { quietable } from '@/speech/policy'
import { sound } from '@/sound/sound'
import { quietSound } from '@/sound/policy'
import { withEffects } from './voice'
import { momentBlock, snapshotOf } from './moment'
import type { LessonStore } from './useLesson'
import styles from './app.module.css'

/**
 * How long the celebration lasts. Long enough to be seen and heard, short enough that a
 * child who is ready for the next exercise is never waiting on it — and it never blocks
 * the exercise underneath in any case.
 */
const MOMENT_MS = 1500

/**
 * The confetti, decided once at module load rather than per render (design D81).
 *
 * Each particle's direction comes from the golden angle and its distance from `i mod 3`,
 * so the burst looks scattered without a single call to `Math.random` — which matters
 * twice over: a re-render mid-burst draws the same burst rather than reshuffling it, and
 * the one rule this code base has about randomness keeps its one meaning.
 */
/** How far apart the closing screen's stars arrive, and how long its burst lasts. */
const CLOSING_STEP_MS = 250
const BURST_MS = 1000

const CONFETTI = Array.from({ length: 20 }, (_, i) => {
  const radians = i * 137.5 * (Math.PI / 180)
  const distance = 62 + (i % 3) * 46
  return {
    x: Math.round(Math.cos(radians) * distance),
    y: Math.round(Math.sin(radians) * distance),
    hue: (i * 47) % 360,
    delay: (i % 5) * 30,
  }
})

export type LessonPlayerProps = {
  lesson: Lesson
  /** A local lesson or a room; the player is not told which (design D13). */
  store: LessonStore
  onExit: () => void
  /** Shown above the exercise: unsynced, whose turn it is, an invitation. */
  notice?: ReactNode
  /** Sits beside the exercise on a wide window and below it on a narrow one. */
  aside?: ReactNode
  /** An extra control in the header, e.g. "Invite student". */
  headerAction?: ReactNode
  /**
   * Whether this screen paces the lesson: moving between exercises and resetting one.
   * False for a student in a room, where those belong to the teacher (design D22). The
   * controls are then absent from the markup rather than disabled — a greyed-out arrow
   * is still a control the student may not use, and a child taps it anyway.
   *
   * Distinct from `readOnly`, which is the stronger and temporary "hands off the
   * exercise itself": a student who cannot steer can still play.
   */
  canSteer?: boolean
  /** The learner may look but not touch — the room is what actually refuses (D14). */
  readOnly?: boolean
  /**
   * Whether the teacher's panel on this screen carries the sound control, in which case
   * the header does not also (design D72). One setting gets one control: a lesson played
   * alone has no panel, so its control is the header's.
   */
  soundControlInPanel?: boolean
}

export function LessonPlayer({
  lesson, store, onExit, notice, aside, headerAction,
  canSteer = true, readOnly = false, soundControlInPanel = false,
}: LessonPlayerProps) {
  const { state, dispatch, muted, setMuted } = store

  // Nothing to arm: speech rides on the sticky user activation the tap that opened this
  // lesson already gave (design D39). Leaving still stops whatever is mid-word.
  //
  // The lesson's recordings and its pictures are fetched here, all at once, so that
  // nothing waits on the network in the middle of an exercise — which on a poor connection would land on
  // exactly the word a child was asked to identify (design D56). They are fetched whether
  // or not the lesson is quiet: sound can come back at any moment, and the word it comes
  // back for is the one that would then wait.
  useEffect(() => {
    speech.preload(speakableLines(lesson))
    preloadPictures(lesson)
    return () => speech.cancel()
  }, [lesson])

  /**
   * The lesson's sound setting, applied once here rather than in six block views
   * (design D67). Memoised on `muted` alone, which is deliberate: the views hold their
   * automatic lines in effects keyed on this object, so changing the setting re-runs them
   * — an exercise whose question is a spoken word says it again the moment sound comes
   * back, while one that only answers taps stays quiet (design D70).
   */
  /**
   * The lesson's effects, wrapped by the same rule and memoised the same way (design D78).
   * PLAN D-27 settled that the teacher's one control covers the chime and the notes as
   * well as the words, so there is nothing here for the player to decide — only an edge to
   * apply it at.
   */
  const effects = useMemo(() => quietSound(sound, muted), [muted])

  const voice = useMemo(() => withEffects(quietable(speech, muted), effects), [muted, effects])

  // Turning it off stops the word already in the air rather than letting it finish: the
  // teacher pressed this because she wants to talk now.
  useEffect(() => {
    if (muted) {
      speech.cancel()
      // The mirror of the line above, for the other kind of sound: a chime or a run of
      // notes already scheduled stops rather than finishing (spec — "Turning the sound off
      // mid-effect"). The raw module, not the wrapper, because the wrapper's whole purpose
      // is to be silent in exactly this state.
      sound.stop()
    }
  }, [muted])

  /**
   * Derived here rather than held in the store (design D75): it is a pure function of the
   * two things the player already has, and putting it in the store would mean teaching
   * `useLesson`, `useRoom` and three hand-built fake stores about a value none of them
   * needs.
   */
  const trail = useMemo(() => lessonTrail(lesson, state), [lesson, state])
  const earned = trail.filter((slot) => slot.done).length

  const block = lesson.blocks[state.slide]
  /** The closing slide when it is the one on screen, so the hooks below can key on it. */
  const closing = block?.type === 'finish' ? block : null

  /**
   * The moment (design D76). A ref of what the trail looked like last render — which
   * exercises were done and which was on screen — started at the current one so that
   * arriving at a lesson three exercises in celebrates none of them, and reset when the
   * lesson itself changes.
   *
   * Both devices hold the same state, so both reach this with the same trail and play the
   * same moment within a network hop of each other — no message, and a lesson played alone
   * runs it unchanged.
   */
  /**
   * The mark elements, so the flying star can be told where to land (design D81). A map
   * rather than an array: slots are keyed by block id, which survives a lesson switch in a
   * way an index does not.
   */
  const slotNodes = useRef(new Map<string, HTMLElement>())

  /** The stage, so the star has somewhere to fly *from*. */
  const stageNode = useRef<HTMLElement | null>(null)
  /**
   * Where the star has to travel, measured once when the moment starts (design D81). Null
   * means "could not be measured" — a slot that has wrapped away, a layout mid-change —
   * and the star then pops where it is instead. The moment still reads; only the line
   * joining the exercise to its mark is lost.
   */
  const [flight, setFlight] = useState<{ dx: number; dy: number } | null>(null)

  const wasShowing = useRef(snapshotOf(trail))
  const forLesson = useRef(lesson.id)
  const [celebrating, setCelebrating] = useState<string | null>(null)
  /** The closing screen's larger burst, once the last star has landed. */
  const [bursting, setBursting] = useState(false)

  useEffect(() => {
    if (forLesson.current !== lesson.id) {
      forLesson.current = lesson.id
      wasShowing.current = snapshotOf(trail)
      setCelebrating(null)
      return
    }
    const earnedNow = momentBlock(wasShowing.current, trail)
    wasShowing.current = snapshotOf(trail)
    if (earnedNow === null) return
    setCelebrating(earnedNow)
  }, [lesson.id, trail])

  // The moment's own timers, kept together so that leaving, or a second completion
  // arriving on top of the first, clears every one of them.
  useEffect(() => {
    if (celebrating === null) return
    const timers = [
      // A beat after the flourish starts, so the chime lands with the star rather than
      // with the tap that earned it.
      window.setTimeout(() => effects.chime(), 200),
      window.setTimeout(() => setCelebrating(null), MOMENT_MS),
    ]
    return () => timers.forEach(window.clearTimeout)
    // Deliberately keyed on the celebration alone. Re-running this because the state
    // object changed — which it does on every tap — would chime twice for one completion.
  }, [celebrating])

  useLayoutEffect(() => {
    if (celebrating === null) {
      setFlight(null)
      return
    }
    const slot = slotNodes.current.get(celebrating)
    const stage = stageNode.current
    if (slot === undefined || stage === null) return

    const to = slot.getBoundingClientRect()
    const from = stage.getBoundingClientRect()
    // A zero box is an element that is not laid out; flying to the top-left corner of the
    // window would be worse than not flying at all.
    if (to.width === 0 && to.height === 0) return

    setFlight({
      dx: Math.round(to.left + to.width / 2 - (from.left + from.width / 2)),
      dy: Math.round(to.top + to.height / 2 - (from.top + from.height / 2)),
    })
  }, [celebrating])

  /**
   * The closing sequence (design D82): the stars arrive one at a time with a note each,
   * then a larger burst. Nothing is said — the celebration is a sound and a picture, and
   * the message is on the screen to be read.
   *
   * Through the wrapped instance, so a quiet lesson gets the stars and the burst in
   * silence (spec: "A closing screen in a quiet lesson"). Every timer is cleared on the
   * way out, so moving back to an exercise halfway through stops it at once.
   */
  useEffect(() => {
    if (closing === null) return
    const gold = trail.filter((slot) => slot.done).length
    effects.notes(gold, CLOSING_STEP_MS)

    const afterStars = Math.max(gold, 1) * CLOSING_STEP_MS
    const timers = [
      window.setTimeout(() => setBursting(true), afterStars),
      window.setTimeout(() => setBursting(false), afterStars + BURST_MS),
    ]
    return () => {
      timers.forEach(window.clearTimeout)
      setBursting(false)
      effects.stop()
    }
    // Keyed on arriving at the slide, not on the trail: a star cannot be earned while the
    // closing screen is the thing on screen, and re-running would restart the notes.
  }, [closing?.id, lesson.id])

  if (block === undefined) return null

  const blockState = blockStateOf(lesson, state, block)
  const View = blockViews[block.type] as unknown as BlockView<BlockType>
  const generation = state.resets[block.id] ?? 0
  const finished = isLessonComplete(lesson, state)
  // Only a screen that steers has anything to draw attention to (design D22, D83).
  const nextDue = canSteer && isNextDue(lesson, state)

  return (
    <div className={styles.player}>
      <header className={styles.header}>
        <button type="button" className={styles.back} onClick={onExit} aria-label="Back to lessons">
          ←
        </button>

        {/* Everything but the way out sits in the middle of the header. The way out stays
            pinned to the left edge, where a child looks for it; the grid keeps an empty
            track of the same width on the right, so the group is centred on the page and
            not merely on the space left over. */}
        <div className={styles.headerCenter}>
            <div className={styles.headerTitle}>
            <span className={styles.headerEmoji}>{lesson.emoji}</span>
            {lesson.title}
          </div>
          {/* One mark per exercise, in lesson order (design D75). "43%" is a number without
              feeling to a seven-year-old; a row of stars is a thing you can see filling up.
              It reports, it does not steer — there is no button in here, and tapping a mark
              does nothing (spec: "The trail is not a way to navigate"). One label for the
              row, and the marks themselves hidden from a screen reader, so it reads as
              "3 of 8 done" rather than as eight identical stars.

              It stands down on the closing screen, where the same stars are the whole page,
              large enough to count. Two rows of the same thing makes neither the point. */}
          {closing === null && (
          <div
            className={styles.trail}
            role="img"
            aria-label={`${earned} of ${trail.length} done`}
            title={`${earned} of ${trail.length} done`}
            /* How many marks there are, so the stylesheet can give the row its natural
               width. Left to work it out from the marks, a browser sizes the row by the
               star glyph instead and the trail collapses to a huddle. */
            style={{ '--slots': trail.length } as CSSProperties}
          >
            {trail.map((slot) => (
              <span
                key={slot.blockId}
                ref={(node) => {
                  if (node === null) slotNodes.current.delete(slot.blockId)
                  else slotNodes.current.set(slot.blockId, node)
                }}
                aria-hidden
                className={[
                  styles.slot,
                  slot.done ? styles.slotEarned : '',
                  slot.current ? styles.slotCurrent : '',
                  celebrating === slot.blockId ? styles.slotLanding : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                ★
              </span>
            ))}
          </div>
          )}

          {/* The teacher is the voice of a live lesson, so she decides when the app is one
              too (design D72). It rides on `canSteer` — the screen that paces the lesson —
              so it is absent from the student's markup rather than merely disabled, like
              every other control they may not use (design D22). In a room it sits in the
              teacher's panel beside the lock instead of here; this is the lesson played
              alone, which has no panel. */}
          {canSteer && !soundControlInPanel && (
            <button
              type="button"
              className={muted ? styles.soundOff : styles.soundOn}
              aria-pressed={muted}
              aria-label={muted ? 'Sound is off — turn it on' : 'Sound is on — turn it off'}
              title={muted ? 'Sound is off — turn it on' : 'Sound is on — turn it off'}
              onClick={() => setMuted(!muted)}
            >
              {muted ? '🔇' : '🔊'}
            </button>
          )}

          {headerAction}
        </div>
      </header>

      {notice}

      <div className={styles.split}>
        {/* `inert` takes the whole exercise out of reach in one place, so no block view
            has to learn what a lock is. The room refuses the action regardless. */}
        <main className={styles.stage} ref={stageNode} inert={readOnly}>
          {/* The stars actually earned, one per exercise (design D82). They used to be
              five painted on the slide, the same five whether a child had finished
              everything or nothing — and a child notices that stars nobody can fail to get
              are not worth having. The row lives here rather than in `FinishView` because
              only the player holds the trail, and widening the block-view contract for the
              sake of one view is what design D13 exists to prevent. */}
          {closing !== null && (
            <div
              className={styles.closingRow}
              role="img"
              aria-label={`${earned} of ${trail.length} stars`}
            >
              {trail.map((slot, i) => (
                <span
                  key={slot.blockId}
                  className={slot.done ? styles.closingStarEarned : styles.closingStar}
                  style={{ animationDelay: `${i * CLOSING_STEP_MS}ms` }}
                >
                  ★
                </span>
              ))}
            </div>
          )}

          {/* The closing slide's message is its heading. Its `title` says the same thing
              in fewer words — "Great job!" above "Great job learning animals!" — so the
              slide shows one of them, not both. Lessons keep the field; every other block
              still shows it. */}
          {closing === null && <h2 className={styles.blockTitle}>{block.title}</h2>}
          {block.type !== 'finish' && block.hint !== undefined && (
            <p className={styles.blockHint}>{block.hint}</p>
          )}
          <View
            key={`${block.id}#${generation}`}
            lesson={lesson}
            block={block}
            state={blockState}
            seed={seedFor(state.seed, block.id, generation)}
            dispatch={dispatch}
            speech={voice}
          />

          {/* The celebration, over the exercise and never in its way: `aria-hidden` so it
              is not read out, `pointer-events: none` so the exercise stays tappable
              throughout, and gone the moment `celebrating` clears (spec: it "SHALL NOT
              block, hide or disable the exercise"). */}
          {bursting && (
            <div className={`${styles.flourish} ${styles.flourishBig}`} aria-hidden>
              {CONFETTI.map((particle, i) => (
                <span
                  key={i}
                  className={styles.confetti}
                  style={
                    {
                      '--to-x': `${particle.x * 2}px`,
                      '--to-y': `${particle.y * 2}px`,
                      '--tint': `hsl(${particle.hue} 85% 62%)`,
                      animationDelay: `${particle.delay}ms`,
                    } as CSSProperties
                  }
                />
              ))}
            </div>
          )}

          {celebrating !== null && (
            <div className={styles.flourish} aria-hidden>
              <span
                className={flight === null ? styles.starPop : styles.starFlies}
                style={
                  flight === null
                    ? undefined
                    : ({ '--fly-x': `${flight.dx}px`, '--fly-y': `${flight.dy}px` } as CSSProperties)
                }
              >
                ⭐️
              </span>
              {CONFETTI.map((particle, i) => (
                <span
                  key={i}
                  className={styles.confetti}
                  style={
                    {
                      '--to-x': `${particle.x}px`,
                      '--to-y': `${particle.y}px`,
                      '--tint': `hsl(${particle.hue} 85% 62%)`,
                      animationDelay: `${particle.delay}ms`,
                    } as CSSProperties
                  }
                />
              ))}
            </div>
          )}
        </main>

        {aside}
      </div>

      {/* Where you are stays whoever is looking (design D24): "how much is left" is what
          keeps a child going, and it is not a control. Only the controls are conditional. */}
      <footer className={styles.nav}>
        {canSteer && (
          <button
            type="button"
            className={styles.navButton}
            disabled={readOnly || state.slide === 0}
            onClick={() => dispatch({ t: 'nav', slide: state.slide - 1 })}
          >
            ←
          </button>
        )}

        {canSteer && (
          <button
            type="button"
            className={styles.resetButton}
            disabled={readOnly}
            onClick={() => dispatch({ t: 'reset', block: block.id })}
          >
            ↺ Reset
          </button>
        )}

        <span className={styles.navCount}>
          {state.slide + 1} / {lesson.blocks.length}
          {finished && <span className={styles.navDone}> · done 🎉</span>}
        </span>

        {canSteer && (
          <button
            type="button"
            className={nextDue ? `${styles.navButton} ${styles.navButtonDue}` : styles.navButton}
            disabled={readOnly || state.slide === lesson.blocks.length - 1}
            onClick={() => dispatch({ t: 'nav', slide: state.slide + 1 })}
          >
            →
          </button>
        )}
      </footer>
    </div>
  )
}
