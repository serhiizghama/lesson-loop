## Why

The app is the teacher's second window, open beside Zoom while a child waits. Right now
its tab has no icon: at a glance it is indistinguishable from Zoom, the lesson plan and
her mail, and browsers show a favourite or a home-screen shortcut for it as a blank sheet.
Every second she spends hunting for the right tab mid-lesson is a second the child spends
watching her look away.

An icon fixes the finding problem, and a home-screen shortcut removes it: the lesson
becomes something she taps once, not a link she has to locate.

## What Changes

- A new `app-identity` capability: how LessonLoop presents itself outside its own page —
  the browser tab, the bookmark, the home-screen shortcut.
- A mark is introduced: a gold loop with an arrow head on an ink field, named for the
  lesson going round. It is authored once, at a size that still reads at 16×16.
- The mark ships as `icon.svg` for the tab, plus committed PNG rasters at the sizes Safari
  and Android require, because neither accepts SVG where they matter most.
- `index.html` gains the icon links, an `apple-touch-icon`, a manifest link and a
  `theme-color`.
- A web app manifest gives the shortcut its name, its icons and its colours, so adding the
  app to a tablet home screen produces a real app tile rather than a screenshot.
- A test guards the wiring: every file `index.html` and the manifest reference exists, and
  each PNG really is the size it claims. A broken icon is invisible in review and obvious
  only to the teacher, which is the wrong order.

Explicitly out of scope: making the tab title reflect the lesson or the role, offline
caching / service worker, and a full PWA install prompt. Serving the icons in production
belongs to `add-cloudflare-deploy`, which is what adds the assets binding (D-18); until
then `vite dev` serves them and `vite build` copies them into `dist/`.

## Capabilities

### New Capabilities

- `app-identity`: how the app names and pictures itself where the browser shows it rather
  than the page — the tab, the bookmark, the home-screen shortcut — and what a device gets
  when the teacher installs it.

### Modified Capabilities

None. No lesson, room or view behaviour changes.

## Impact

- `index.html` — the only markup change: icon, touch-icon, manifest and theme-color links.
- A new `public/` directory, Vite's default static root. Files in it are served verbatim in
  dev and copied into `dist/` at build; no bundler or import graph is involved.
- `docs/PLAN.md` §8 — the project tree gains `public/`.
- `README.md` — a line on where the mark lives and how to change it.
- No new runtime dependency, and no new build step. The mark is one small SVG plus three
  PNGs; the page still makes no network request it did not make before, because the icons
  are same-origin static files the browser fetches only when it wants them.
- No change to `worker/`. The Worker serves no client assets in this change (D-17); when
  `add-cloudflare-deploy` gives it the assets binding, the icons are already part of
  `dist/` and need nothing further.
