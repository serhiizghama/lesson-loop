import type { ReactNode } from 'react'
import type { BlockType } from '@/shared/types'
import { buildLine } from '@/version'
import app from './app.module.css'
import styles from './guide.module.css'

/**
 * The teacher's guide (spec `teacher-guide`).
 *
 * A page to read, not a lesson to play: it holds no lesson state, opens no room, speaks
 * nothing and offers no pencil — not because anything is switched off here, but because
 * none of that machinery is on this screen (design D9).
 *
 * Two things in it can rot, and both are held down by `guide.test.tsx`: the exercise
 * table, which is checked against the block registry, and the pictures, which are checked
 * to exist. Everything else is prose, and prose is reviewed (design D2, D8).
 */

/**
 * One picture of the real app. Every shot is the same window — 1456×822 — scaled to
 * 1000 px wide, so the set reads as one set (design D3).
 */
type Shot = { file: string; alt: string; width: number; height: number }

const SHOT_WIDTH = 1000
const SHOT_HEIGHT = 564

function shot(file: string, alt: string): Shot {
  return { file, alt, width: SHOT_WIDTH, height: SHOT_HEIGHT }
}

/**
 * The pictures the guide names, in one place so a test can check each one is published
 * (design D3). Re-taking them is a list, not a memory: see README, "The teacher's guide".
 */
export const PICTURES = {
  home: shot(
    'home.jpg',
    'The home screen with the Animals card open, offering its first five words, its second five, and all ten',
  ),
  exercise: shot(
    'exercise.jpg',
    'An exercise in play: five picture cards, two of them turned over to show the English and Japanese words, with the star trail across the top of the screen',
  ),
  locked: shot(
    'locked.jpg',
    "The student's screen while the lesson is locked: the exercise is still there, with the notice that it is the teacher's turn",
  ),
  teacher: shot(
    'teacher.jpg',
    "The teacher's screen: the exercise on the left, and on the right the panel of controls, the student link with a Copy button, and the answer key",
  ),
  student: shot(
    'student.jpg',
    "The student's screen: the same exercise, its instruction and the star trail, and no controls at all",
  ),
  pencil: shot(
    'pencil.jpg',
    'An exercise with a box drawn round one card, and the pen, eraser, two thicknesses, colours, undo and clear tools in a row above it',
  ),
  stars: shot(
    'stars.jpg',
    'The closing screen: a row of seven stars with the first one gold and the rest grey, above the message Great job! You know your animals now!',
  ),
  offline: shot(
    'offline.jpg',
    'An exercise carrying the notice: working without sync, the lesson still works, and it will catch up on its own',
  ),
} as const satisfies Record<string, Shot>

type PictureId = keyof typeof PICTURES

/**
 * A picture never carries an instruction on its own (spec): the caption says what the
 * section already said, so the guide reads the same with images blocked.
 */
function Picture({ id, caption }: { id: PictureId; caption: string }) {
  const { file, alt, width, height } = PICTURES[id]
  return (
    <figure className={styles.shot}>
      <img src={`/guide/${file}`} alt={alt} width={width} height={height} loading="lazy" />
      <figcaption>{caption}</figcaption>
    </figure>
  )
}

/**
 * Every exercise the app can play, keyed by the type the registry knows it as. The key is
 * what `guide.test.tsx` compares against `blockViews`; the teacher is shown the name.
 *
 * `finish` is not an exercise — it is the send-off, and it is described under Stars.
 */
export const EXERCISES: readonly {
  type: Exclude<BlockType, 'finish'>
  name: string
  child: string
  teacher: string
}[] = [
  {
    type: 'cards',
    name: 'Flip cards',
    child: 'Taps a card to turn it over and hear the word.',
    teacher: 'Say it with them. The exercise is done when every card has been turned.',
  },
  {
    type: 'match',
    name: 'Matching',
    child: 'Taps one side, then the other, to make a pair.',
    teacher: 'Your key lists the pairs. A wrong pair shakes and stays where it was.',
  },
  {
    type: 'sentence',
    name: 'Say it bigger',
    child: 'Picks a word, then grows it into a sentence, a step at a time.',
    teacher: 'Read each step out loud before they tap the next one.',
  },
  {
    type: 'sort',
    name: 'Sorting',
    child: 'Taps an item, then the group it belongs in.',
    teacher: 'Ask "why?" before they tap — the sorting is the easy half.',
  },
  {
    type: 'listen',
    name: 'Which one is it?',
    child: 'Hears a word and taps the picture it names.',
    teacher: 'The speaker replays it. Let them ask twice before you help.',
  },
  {
    type: 'tpr',
    name: 'Move like me',
    child: 'Hears an instruction and does it with their body.',
    teacher: 'Do it with them. Nothing on screen judges this one — you decide it is done.',
  },
  {
    type: 'phrases',
    name: 'Say it after me',
    child: 'Taps the speaker on a model sentence, then says it back.',
    teacher: 'These are the sentences to use around the words all lesson.',
  },
  {
    type: 'quiz',
    name: 'Guess it',
    child: 'Sees a clue and taps the item it describes.',
    teacher: 'Your key names the answer. Read the clue as a riddle, not a question.',
  },
  {
    type: 'describe',
    name: 'Describe it',
    child: 'Answers two questions about one item, then hears the whole sentence.',
    teacher: 'Ask both questions out loud first; let the taps confirm the answer.',
  },
  {
    type: 'hotspot',
    name: 'Label the drawing',
    child: 'Taps a word, then the place on the drawing it belongs to.',
    teacher: 'Your key says where each word goes, in plain words.',
  },
  {
    type: 'memory',
    name: 'Memory',
    child: 'Turns cards face up two at a time to find the pairs.',
    teacher: 'Slow them down: say each word aloud as it turns over.',
  },
  {
    type: 'scramble',
    name: 'Build it',
    child: 'Builds a sentence out of its words, shuffled.',
    teacher: 'Read the finished sentence out first, then let them rebuild it.',
  },
]

/**
 * The two links, drawn rather than photographed: a screenshot of two windows side by side
 * is smaller than either of them, and the point here is the idea, not the pixels
 * (design D3).
 */
function TwoLinks() {
  return (
    <figure className={styles.diagram}>
      <svg viewBox="0 0 520 200" role="img" aria-labelledby="two-links-title" focusable="false">
        <title id="two-links-title">
          One room, two links: your link ends in slash t and carries the exercise, the answer
          key and the controls; the student&rsquo;s link ends in slash r and carries the
          exercise alone. Every tap on either screen moves both.
        </title>
        <rect x="4" y="30" width="200" height="140" rx="14" className={styles.dBox} />
        <text x="24" y="60" className={styles.dHead}>
          Your link
        </text>
        <text x="24" y="82" className={styles.dCode}>
          /t/AB12#…
        </text>
        <text x="24" y="110" className={styles.dLine}>
          the exercise
        </text>
        <text x="24" y="130" className={styles.dLine}>
          + the answer key
        </text>
        <text x="24" y="150" className={styles.dLine}>
          + the controls
        </text>

        <rect x="316" y="30" width="200" height="140" rx="14" className={styles.dBox} />
        <text x="336" y="60" className={styles.dHead}>
          The student&rsquo;s link
        </text>
        <text x="336" y="82" className={styles.dCode}>
          /r/AB12
        </text>
        <text x="336" y="110" className={styles.dLine}>
          the exercise
        </text>
        <text x="336" y="130" className={styles.dLine}>
          and nothing else
        </text>

        <path d="M214 92 H306" className={styles.dArrow} />
        <path d="M306 108 H214" className={styles.dArrow} />
        <text x="260" y="82" className={styles.dMid} textAnchor="middle">
          one room
        </text>
        <text x="260" y="140" className={styles.dMid} textAnchor="middle">
          every tap
        </text>
        <text x="260" y="158" className={styles.dMid} textAnchor="middle">
          moves both
        </text>
      </svg>
      <figcaption>
        One room, two links. Yours carries the answers; theirs carries the exercise alone.
      </figcaption>
    </figure>
  )
}

type Section = { id: string; title: string; body: ReactNode }

/**
 * The guide itself. The contents list is derived from this array, so a section cannot
 * exist without an entry in the navigation or the other way round (design D2).
 */
export const SECTIONS: readonly Section[] = [
  {
    id: 'what-it-is',
    title: 'What this is',
    body: (
      <>
        <p>
          LessonLoop is the second window in your lesson. Your video and your voice stay in
          the call you already use; this is the page you and the child tap together.
        </p>
        <p>
          You open a lesson on your own. When you want the child in it, you send them a
          link. From then on both screens show the same exercise, and every tap — yours or
          theirs — moves both.
        </p>
        <p>
          Nothing is saved. There is no sign-up, no password, and no record of a lesson
          once it is over.
        </p>
      </>
    ),
  },
  {
    id: 'start',
    title: 'Start here',
    body: (
      <>
        <p>Five steps, and you are teaching:</p>
        <ol>
          <li>Pick a topic on the home screen.</li>
          <li>Pick how much of it this sitting teaches — five words, or the whole topic.</li>
          <li>Play the first exercise yourself, so you have seen what the child will see.</li>
          <li>
            Press <b>👋 Invite student</b>. A room opens carrying the lesson exactly as it
            stands, progress and all.
          </li>
          <li>
            Copy the <b>Student link</b> and paste it into your call. Stay where you are —
            that address is yours.
          </li>
        </ol>
        <p>Everything below this is detail.</p>
        <Picture
          id="exercise"
          caption="An exercise in play. The row of stars at the top is the lesson, one mark per exercise; Invite student is in the same header."
        />
      </>
    ),
  },
  {
    id: 'choosing',
    title: 'Choosing a topic, and how long the sitting is',
    body: (
      <>
        <p>
          A topic too long for one sitting is offered in parts. Tap it on the home screen
          and it shows what it can be — for Animals, three choices:
        </p>
        <ul>
          <li>
            <b>5 new words · Animals 1</b> — the first five, and the first sitting of the
            topic.
          </li>
          <li>
            <b>5 new words · Animals 2</b> — the next five, in a lesson of ten: it teaches
            its own and revises the five before them, so you prepare nothing extra.
          </li>
          <li>
            <b>All 10 words</b> — the whole topic in one sitting.
          </li>
        </ul>
        <p>
          Choose by the child in front of you. Five new words is the usual sitting; ten is
          for a child who has met them before. A topic short enough for one sitting offers
          nothing to choose and simply opens.
        </p>
        <p>Changing the size starts the lesson again from the beginning.</p>
        <Picture
          id="home"
          caption="The home screen with a topic open. Each choice says what it teaches before you take it."
        />
      </>
    ),
  },
  {
    id: 'alone',
    title: 'Teaching on your own',
    body: (
      <>
        <p>
          A lesson opened from the home screen is yours alone. It needs no connection at
          all, sends nothing anywhere, and every control belongs to you.
        </p>
        <p>
          Use it to look through a topic before the lesson, or to teach a child sitting
          beside you. You can invite a student at any moment — the room carries whatever
          progress the lesson already has.
        </p>
      </>
    ),
  },
  {
    id: 'two-links',
    title: 'Inviting the student: two links',
    body: (
      <>
        <p>Pressing Invite opens one room with two addresses, and they are not the same:</p>
        <TwoLinks />
        <p>
          <b>Yours</b> carries the exercise, the answer key, the controls that pace the
          lesson, the student&rsquo;s link, and whether they are connected.{' '}
          <b>Theirs</b> carries the exercise, its instruction, where they are in the lesson
          and the stars they have earned. Nothing else.
        </p>
        <p>
          <b>Send the Student link, never the address you are on.</b> Yours shows the
          answers. For the same reason, do not share your screen in the call: send the link
          and let the child tap on their own device.
        </p>
        <p>
          A child who joins late lands on whatever is on screen. You can change lesson
          without sending a new link. Up to four people can be in one room. A room is
          discarded after about three hours of quiet, and nothing in it is kept afterwards.
        </p>
        <Picture
          id="student"
          caption="The student's screen. No Next, no Reset, no answers — this is by design."
        />
      </>
    ),
  },
  {
    id: 'controls',
    title: 'Your controls',
    body: (
      <>
        <p>
          The panel down the side of your screen. None of it exists on the child&rsquo;s
          screen.
        </p>
        <ul>
          <li>
            <b>← Previous</b> and <b>Next →</b> move the lesson. Next brightens when the
            exercise on screen has been finished — it never moves on by itself.
          </li>
          <li>
            <b>↺ Reset this exercise</b> starts the one on screen again, and leaves the rest
            of the lesson alone.
          </li>
          <li>
            <b>🔄 Change lesson</b> puts a different lesson on both screens. The
            student&rsquo;s link stays the same.
          </li>
          <li>
            <b>🔓 Student can tap</b> / <b>🔒 Student locked</b> takes the exercise out of
            the child&rsquo;s hands for a moment. Their screen says
            &ldquo;It&rsquo;s the teacher&rsquo;s turn.&rdquo;
          </li>
          <li>
            <b>🔊 Voice on</b> / <b>🔇 Voice off</b> decides whether the app speaks and
            chimes — on both screens at once.
          </li>
          <li>
            <b>✏️ Student can draw</b> / <b>🚫 Student pen off</b> decides whether the child
            may draw. Marks they have already made stay where they are.
          </li>
          <li>
            <b>● synced</b> and <b>● student here</b> tell you the room is reaching you and
            that the child is in it.
          </li>
          <li>
            The <b>answer key</b> sits under the controls, for the exercise on screen. An
            exercise with nothing to be right about shows none.
          </li>
          <li>
            <b>✕</b> folds the panel away when you want the exercise on its own;{' '}
            <b>👩‍🏫 Teacher panel</b> brings it back.
          </li>
        </ul>
        <Picture
          id="teacher"
          caption="Your screen: the exercise, the controls, the student link to send, and the key for what is on screen."
        />
        <Picture
          id="locked"
          caption="What the lock looks like from the child's side: the exercise stays up, their taps do not."
        />
      </>
    ),
  },
  {
    id: 'pencil',
    title: 'Drawing on the exercise',
    body: (
      <>
        <p>
          The pencil is in the header. Put it down and the tools appear: a pen, an eraser
          that removes a whole mark, two thicknesses, a few colours, undo, and clear.
        </p>
        <p>
          Marks are shared — what you draw appears on the child&rsquo;s screen, and theirs
          on yours. A mark belongs to the exercise it was made on, so leaving an exercise
          and coming back finds it as you left it, and Reset clears it with the exercise.
        </p>
        <p>
          There is no pencil on the home screen, none on the closing screen, and none in a
          lesson you are playing alone — it is a thing for two people looking at one
          exercise.
        </p>
        <Picture
          id="pencil"
          caption="Marking the answer. Both of you see it; the eraser lifts a whole stroke."
        />
      </>
    ),
  },
  {
    id: 'exercises',
    title: 'The exercises, one by one',
    body: (
      <>
        <p>
          Twelve kinds. Which of them a lesson uses is up to the lesson; every one of them
          works the same way in every topic.
        </p>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Exercise</th>
                <th scope="col">The child</th>
                <th scope="col">You</th>
              </tr>
            </thead>
            <tbody>
              {EXERCISES.map((exercise) => (
                <tr key={exercise.type}>
                  <th scope="row">{exercise.name}</th>
                  <td>{exercise.child}</td>
                  <td>{exercise.teacher}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          Tapping is the only gesture anywhere: nothing has to be dragged, which is what
          makes the lesson work on a tablet and with a small hand.
        </p>
      </>
    ),
  },
  {
    id: 'stars',
    title: 'Stars, and the end of the lesson',
    body: (
      <>
        <p>
          A star is for <b>finishing</b> an exercise, never for getting it right first time.
          A wrong answer is a shake and another try, and nothing anywhere counts mistakes.
        </p>
        <p>
          The moment an exercise is finished, a star flies up to the trail at the top, a
          chime sounds and confetti bursts — on both screens at once. It takes about a
          second and a half, the exercise stays playable, and the lesson waits for you.
        </p>
        <p>
          The app says nothing. Praise is yours to give: an app talking a beat after the
          child finishes is talking across the person who was about to.
        </p>
        <p>
          The last screen shows one star per exercise, gold only where it was earned. Stars
          nobody can fail to get are not worth having.
        </p>
        <Picture
          id="stars"
          caption="The closing screen: the stars actually earned, not a painted row."
        />
      </>
    ),
  },
  {
    id: 'connection',
    title: 'When the connection drops',
    body: (
      <>
        <p>
          The screen says so: <i>Working without sync — the lesson still works, and it will
          catch up on its own.</i>
        </p>
        <p>
          The exercise stays fully playable while that notice is up. The app reconnects by
          itself and brings the two screens back into agreement; you do not need to reload
          anything.
        </p>
        <p>
          Carry on through your own copy — you are the one pacing the lesson. The child
          holds the exercise they are on until the room is back, then catches up to you.
        </p>
        <p>A lesson opened from the home screen never needs a connection at all.</p>
        <Picture
          id="offline"
          caption="The notice both of you see. Keep teaching; it comes back on its own."
        />
      </>
    ),
  },
  {
    id: 'running-a-lesson',
    title: 'Running a sitting, and what to do when something looks wrong',
    body: (
      <>
        <p>
          <b>Before.</b> Pick the topic and the size, and play it through once on your own.
          Two minutes here is worth ten in the lesson.
        </p>
        <p>
          <b>During.</b> You set the pace. Talk, let the child tap, and press Next when you
          are both ready — not when the star appears. Use the lock when you need their eyes
          on you rather than on the screen.
        </p>
        <p>
          <b>After.</b> Close the tab. There is nothing to save and nothing to tidy up.
        </p>
        <p>When something looks wrong:</p>
        <ul>
          <li>
            <b>The child cannot find the button to move on.</b> There isn&rsquo;t one. Their
            screen has no controls; move the lesson yourself.
          </li>
          <li>
            <b>Their screen seems stuck.</b> Look at <b>● synced</b> on your panel. If it
            says unsynced, wait — it comes back and catches up.
          </li>
          <li>
            <b>The link does not work.</b> A room lasts about three hours. Open a new one
            from the lesson and send the new student link.
          </li>
          <li>
            <b>Reloading.</b> Safe, on either screen. The room remembers where the lesson
            was.
          </li>
          <li>
            <b>The app does not match this guide.</b> This page describes the version named
            at the foot of it. Quote that line when you tell us.
          </li>
        </ul>
      </>
    ),
  },
]

export function Guide({ onExit }: { onExit: () => void }) {
  return (
    <div className={styles.guide}>
      <header className={app.homeBar}>
        <div className={app.homeBarInner}>
          <img className={app.homeMark} src="/icon.svg" alt="" width={36} height={36} />
          <span className={app.homeWordmark}>LessonLoop</span>
          <button type="button" className={styles.back} onClick={onExit}>
            ← Back to the lessons
          </button>
        </div>
      </header>

      <div className={styles.body}>
        <nav className={styles.contents} aria-label="Sections of this guide">
          <h2 className={styles.contentsTitle}>Teacher&rsquo;s guide</h2>
          <ol>
            {SECTIONS.map((section) => (
              <li key={section.id}>
                <a href={`#${section.id}`}>{section.title}</a>
              </li>
            ))}
          </ol>
        </nav>

        <main className={styles.text}>
          <h1 className={styles.title}>Teacher&rsquo;s guide</h1>
          <p className={styles.standfirst}>
            Everything the app does, in the order you will meet it. Five minutes end to end;
            after that, use the list beside it to find one answer.
          </p>

          {SECTIONS.map((section) => (
            <section key={section.id} id={section.id} className={styles.section}>
              <h2>{section.title}</h2>
              {section.body}
            </section>
          ))}

          {/*
            The same line the home screen carries (design D10): "the guide is wrong" is a
            report nobody can act on; "the guide for this build is wrong" is one they can.
          */}
          <p className={styles.buildLine}>{buildLine(__APP_VERSION__, __BUILT_AT__)}</p>
        </main>
      </div>
    </div>
  )
}
