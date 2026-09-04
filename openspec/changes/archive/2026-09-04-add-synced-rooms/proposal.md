## Why

Today the app is a lesson the teacher plays on her own screen. In a real lesson the
student is on the other side of a video call, and the only thing she can do is share her
screen — which turns the student back into the passive viewer the PDF worksheet already
made them. A child who cannot touch the exercise does not practise it.

This change puts both people on the same lesson from two different links, and takes the
asymmetry seriously: the same tap moves both screens, but the teacher additionally sees
what to say and what the answer is, and the student never does. That asymmetry is the
whole reason to build this instead of using Wordwall or Baamboozle — screen sharing
cannot show two people two different things.

## What Changes

- A **room**: the teacher, mid-lesson, presses "Invite student" and gets a short link.
  Opening a lesson from the home screen stays solo and offline, exactly as it is now —
  the network is opted into, never imposed.
- **Two roles from two links.** The teacher's link carries the teacher view; the student's
  link carries the exercise and nothing else. A student joining mid-lesson lands on
  whatever is currently on screen, already in progress.
- **Every tap is shared.** Flipping a card, making a pair, placing an item, moving between
  exercises — either participant acts, both screens follow. The existing pure reducer
  becomes the authority: it runs optimistically in the browser and authoritatively inside
  a Durable Object, so a tap is instant locally and still settles the same way for both.
- **A teacher view** over the shared exercise: navigation, reset of the current exercise,
  a "student is watching" lock for when a child runs ahead, a connection indicator, and
  the answer key for the exercise on screen — which pairs belong together, which bucket
  an item goes to, which word is being asked. The key is computed from the lesson data;
  no lesson file changes.
- **The room outlives the lesson** (D-11): the teacher switches to another lesson in place
  and the student follows, so one link covers the whole session.
- **Losing the socket is not losing the lesson.** On disconnect the app keeps working,
  says it is unsynced, and reconnects on its own; it never shows a blank screen mid-lesson.
- Deployment is deliberately **not** here. This change is done when two browsers on
  `wrangler dev` hold one lesson together; publishing it to the internet is
  `add-cloudflare-deploy`.

## Capabilities

### New Capabilities
- `synced-rooms`: what a room is and how two screens come to agree — room codes and the
  two links, joining and leaving, which taps travel, how divergence is settled, how long a
  room lives, and what the app does when the connection is gone.
- `teacher-view`: the surface only the teacher gets — lesson controls, the lock on student
  input, the connection indicator, and the answer key derived from the lesson for the
  exercise currently on screen.

### Modified Capabilities
- `lesson-player`: the offline guarantee is currently absolute ("no network request after
  the application has loaded"), which a synced room contradicts. It becomes a guarantee
  about the solo lesson plus a guarantee that no exercise ever depends on the connection.
  Free navigation likewise gains its one exception: a student whose input the teacher has
  locked.

## Impact

- **New:** `worker/` (the Worker entry and the `Room` Durable Object), `src/net/` (socket
  client, reconnect, solo fallback), `src/ui/` teacher panel, URL-based routing to replace
  the current `useState` lesson picker, and `wrangler.jsonc` for local `wrangler dev`.
- **Changed:** `src/ui/useLesson.ts` gains a synced source of truth beside the local one;
  `createLessonState` draws its seed on the server for a room, so both screens shuffle
  alike. `src/shared/` is unchanged in behaviour and now genuinely runs in two places —
  the purity test that has been guarding it starts earning its keep.
- **Dependencies:** `wrangler` and `@cloudflare/workers-types` as dev dependencies. No
  runtime dependency is added to the browser bundle, and still no database, no accounts,
  no persistence.
- **Out of scope:** production deploy, custom domain, static-asset serving from the Worker,
  and CI deployment — all `add-cloudflare-deploy`.
