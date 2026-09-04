## Context

See proposal.md — Why for the motivation, and `specs/app-identity/spec.md` for the
behaviour being contracted.

What exists: `index.html` is nine lines with a `<title>` and no icon of any kind. There is
no `public/` directory, so Vite's default static root is unused and available. The palette
is already fixed in `src/ui/styles.css` — `--ink #23213a`, `--paper #fdf7ee`,
`--gold #f0ac2b` — under `color-scheme: light`.

Three constraints shape the work:

1. **The Worker serves no client assets yet.** `vite dev` serves the app and proxies
   `/api` and `/ws` to `wrangler dev` (design D17); the assets binding is
   `add-cloudflare-deploy` (D-18). Anything placed in `public/` is served in dev and
   copied verbatim into `dist/` at build, so it is already in the right place when that
   change lands, and `worker/` need not be touched here.
2. **No rasteriser exists in the toolchain.** There is no `rsvg-convert`, ImageMagick,
   Inkscape or resvg on the development machine and none in `devDependencies`. Any plan
   that turns an SVG into a PNG during the build is a plan to add a native dependency.
3. **The lesson must not learn about the network.** Principle 4 — solo mode is mandatory —
   means the identity may not put anything on the lesson's critical path.

Decisions continue the shared `Dn` sequence, last used at D25 by
`restrict-student-pacing`, because code comments cite decisions by bare number.

## Goals / Non-Goals

**Goals**

- One mark, authored once, that survives being drawn at 16 pixels.
- Every icon slot the target devices actually read — a tab, an iPad home screen, an
  Android tile — filled with a form that slot accepts.
- The wiring guarded by a test, because a broken icon is invisible in review and obvious
  only to the person teaching.

**Non-Goals**

- No service worker, no offline caching, no install prompt. The app is already usable
  with the network gone; a cache layer would add a stale-content failure mode in front of
  a child in exchange for nothing.
- No change to `worker/`, `wrangler.jsonc` or the deploy story — that is
  `add-cloudflare-deploy`.
- No splash screens, no per-platform icon matrix beyond the slots named below, and no
  change to the tab title.

## Decisions

### D26 — The mark is the loop: a gold ring with an arrow head, on an ink field

A rounded-square ink field (`--ink #23213a`), a thick gold ring (`--gold #f0ac2b`) drawn
with a gap, and an arrow head closing the gap: the lesson going round.

*Why:* it says the app's name without spelling it, and it is two shapes — at 16 pixels a
ring is still a ring. The colours are already the product's, so the tab, the tile and the
page agree without a second palette being invented.

*Rejected:* an "L" monogram — anonymous, and the letter is the first thing every other app
reaches for. *Rejected:* two overlapping speech bubbles (teacher and student on one
lesson) — a better story, but overlap is exactly the detail that dissolves at tab size.
*Rejected:* an emoji drawn into the SVG with `<text>` — free, but PLAN §10 already lists
"emoji render differently on Windows and iOS" as a risk we are actively avoiding, and an
icon is the worst place to accept it.

### D27 — SVG for the tab, PNG for the slots that refuse SVG

Four files in `public/`:

| File | Slot | Why this form |
|---|---|---|
| `icon.svg` | `<link rel="icon" type="image/svg+xml">` | sharp at any size a browser picks |
| `icon-180.png` | `<link rel="apple-touch-icon">` | Safari takes no SVG here |
| `icon-192.png` | manifest icon | Android tile |
| `icon-512.png` | manifest icon | Android splash and store-size tile |

*Why:* the home-screen icon was the explicit ask, and the home screen is precisely the slot
that will not take a vector. iOS given no `apple-touch-icon` puts a screenshot of the page
on the home screen — a grey rectangle of a half-loaded lesson.

*Rejected:* SVG only — fails the one slot the change exists for. *Rejected:* a `.ico`
container — its whole purpose is holding several sizes for browsers that predate SVG
favicons, none of which are on a teacher's iPad or a modern Chrome. *Rejected:* a PNG-only
set with no SVG — loses sharpness on the high-density displays this app is used on.

### D28 — The PNGs are committed artefacts, not build output

The rasters are produced once from the mark's geometry and committed. No rasteriser enters
`devDependencies`, no build step is added, and `npm run build` stays `vite build`.

*Why:* constraint 2. `sharp` or `@resvg/resvg-js` is a native, platform-specific
dependency that CI then has to install on every run — bought for four files that change
about once a year.

*Rejected:* rasterising in the build — the dependency and the build step cost more, every
day, than the drift they prevent. *Rejected:* leaving the files unguarded — a raster that
is not the size it is declared at is invisible until someone installs the app on a tablet,
which is why D31 exists.

### D29 — The manifest is a static file, hand-written

`public/manifest.webmanifest`, linked from `index.html`. It carries `name`, a `short_name`
short enough to sit under a tile, the three PNGs plus the SVG, `background_color` and
`theme_color` from the palette, `display` and `start_url`.

*Rejected:* `vite-plugin-pwa` — it exists to generate a service worker and an update
lifecycle. That is a behaviour, not a convenience: it would decide when the teacher gets
new code, and a stale cache mid-lesson is a worse failure than the problem this change
solves. A manifest is twelve lines of JSON; a plugin that writes it and a service worker
we do not want is not a saving.

### D30 — The shortcut opens the app's home screen, in its own window

`start_url: "/"` and `display: "standalone"`; `theme_color` is `--paper #fdf7ee`, matching
the page, and `background_color` the same.

*Why:* the tile is the teacher's way in, and her way in is choosing a lesson — the app's
home screen, never a stale lesson or a dead room code. Standalone gives her a second
window beside Zoom without a URL bar taking a strip of a tablet screen. Paper as the theme
colour keeps the chrome continuous with the page; ink would read as a different app's
title bar.

*Rejected:* `start_url` pointing at a lesson — she picks the lesson per lesson.
*Rejected:* `display: "browser"` — keeps the URL bar, which on a tablet is the space the
exercise needed. Students are unaffected either way: they arrive by a link from a message,
not from a tile.

### D31 — The wiring is guarded by a test that reads what the app declares

`tests/app-icon.test.ts` parses `index.html` for its icon, touch-icon and manifest links,
parses `public/manifest.webmanifest`, and asserts that every referenced path exists in
`public/` and that each PNG's real pixel size matches the size it is declared at. A PNG's
dimensions are read straight from the IHDR chunk — bytes 16–24 of the file — so no image
library is needed.

*Why:* this is the spec requirement "Every icon the app declares exists and is what it
claims", and it is the failure mode D28 accepts in exchange for having no rasteriser.

*Rejected:* a snapshot of `index.html` — it asserts the text of a link, which is exactly
the part that is already correct when the file behind it is missing.

## Risks / Trade-offs

- **The SVG and the PNGs drift apart** — someone edits the mark and forgets the rasters,
  and the tab and the tile stop matching. → The test cannot see this; the mark is
  deliberately two shapes, and `icon.svg` carries a comment naming the three files that
  must be redrawn with it. Accepted, because the alternative is a native build dependency
  (D28).
- **"Add to home screen" cannot be tested in CI** — it is a per-device gesture behind a
  browser menu. → The automated tier proves the files exist and are declared correctly;
  installing on a real tablet stays a manual acceptance step, named as manual.
- **A standalone window has no URL bar** — a teacher who wanted to paste a link into it
  cannot. → She never needs to: rooms are created from inside the app, and the student's
  link is copied out of it, not into it.
- **The icons are extra bytes in `dist/`** — four small files. → They are fetched by the
  browser when it wants them, never by the app, so no screen waits on one; the offline
  guarantee is untouched.

## Migration Plan

Nothing to migrate: four static files, four lines of markup and a test. Rollback is
deleting `public/` and the `<link>` lines — the app returns to a blank tab and nothing
else changes. No state, no schema, no deployed resource is involved.

## Open Questions

- Whether `add-cloudflare-deploy` should additionally serve a `/favicon.ico` for clients
  that request it by convention rather than by link. Deferrable: it concerns how the
  Worker answers a request for a path this change never declares, and changes neither
  these specs nor this task breakdown.
