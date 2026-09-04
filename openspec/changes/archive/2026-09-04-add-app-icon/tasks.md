## 1. The mark

- [x] 1.1 Author `public/icon.svg`: an ink rounded-square field (`#23213a`), a thick gold
  ring (`#f0ac2b`) drawn with a gap, and an arrow head closing it (design D26). Give it a
  `viewBox` and no fixed `width`/`height`, so a browser may draw it at any size.
  **Check:** the file opens in a browser as the intended mark, and it carries a comment
  naming `icon-180.png`, `icon-192.png` and `icon-512.png` as the rasters that must be
  redrawn with it (design D28, Risks).
- [x] 1.2 Confirm the mark survives tab size. **Check:** rendered at 16×16 the ring, its
  gap and the arrow head are each still distinguishable; judged by eye and recorded as a
  manual check, never as test coverage (spec "The mark at tab size").
- [x] 1.3 Produce `public/icon-180.png`, `public/icon-192.png` and `public/icon-512.png`
  from the same geometry and commit them (design D28). **Check:** `sips -g pixelWidth -g
  pixelHeight` reports 180×180, 192×192 and 512×512, and `git diff package.json` is empty
  — no rasteriser or image library entered the project.

## 2. Every slot the devices read

- [x] 2.1 Add to `index.html`'s `<head>`: `<link rel="icon" type="image/svg+xml"
  href="/icon.svg">`, `<link rel="apple-touch-icon" href="/icon-180.png">`,
  `<link rel="manifest" href="/manifest.webmanifest">` and
  `<meta name="theme-color" content="#fdf7ee">` (design D27, D30). **Check:** the four
  lines are present, and `npm run build` puts all five files at the root of `dist/`.
- [x] 2.2 Write `public/manifest.webmanifest` with `name`, `short_name`, the three PNGs
  and the SVG under `icons`, `background_color` and `theme_color` `#fdf7ee`,
  `display: "standalone"` and `start_url: "/"` (design D29, D30). **Check:** it parses as
  JSON, every `icons` entry names a file that exists, and `short_name` is at most 12
  characters so a tile label is not truncated.

## 3. The wiring cannot rot

- [x] 3.1 Add `tests/app-icon.test.ts`: read `index.html`, extract the `icon`,
  `apple-touch-icon` and `manifest` hrefs, and assert each names a file present in
  `public/` (design D31, spec "A declared icon that is missing"). **Check:** a named test
  per slot, and `npm test` passes.
- [x] 3.2 In the same test, parse `public/manifest.webmanifest` and assert every icon it
  declares exists and that each PNG's real pixel size — read from the IHDR chunk, bytes
  16–24 — equals the size declared in `sizes` (spec "A raster that is not the size it
  claims"). **Check:** the test reads the bytes itself, with no image library added.
- [x] 3.3 Prove the test actually catches both failures. **Check:** temporarily rename one
  PNG and then temporarily mis-declare one `sizes` value; `npm test` fails each time and
  passes again once reverted. Report this as performed, not assumed.
- [x] 3.4 Assert nothing is fetched from a third party: every icon reference in
  `index.html` and the manifest is a root-relative path (spec "No third party is asked").
  **Check:** a named test rejects any reference containing `://`.

## 4. Docs and quality gates

- [x] 4.1 Update `README.md`: where the mark lives, that `icon.svg` is the source, and
  that the three PNGs are committed rasters to be redrawn with it. **Check:** a reader can
  change the icon from the README alone, without opening `design.md`.
- [x] 4.2 Update `docs/PLAN.md` §8 — the project tree gains `public/` — and add a `D-22`
  row to §12: the app is installable to a home screen, and deliberately stops short of a
  service worker (design D29). **Check:** no statement left in `PLAN.md` contradicts the
  delta spec, principle 4 included.
- [x] 4.3 Run the full gate. **Check:** `npm run typecheck`, `npm test` and `npm run build`
  all pass, and the result is reported honestly, naming anything skipped.

## 5. Acceptance

- [x] 5.1 Open the app beside several other tabs. **Check:** its tab carries the mark, and
  it is findable at a glance rather than by reading titles (spec "Picking the lesson out
  of a row of tabs").
- [x] 5.2 Bookmark the app. **Check:** the bookmark shows the same mark as the tab.
- [x] 5.3 Add the app to an iPad home screen. **Check:** the tile shows the mark and not a
  screenshot of the page, the label reads as the app's name, and tapping it opens the
  app's home screen with no URL bar (spec "Added to a tablet home screen", "Opening from
  the tile").
- [x] 5.4 Add the app to an Android home screen, or inspect the manifest in Chrome's
  Application panel if no device is available. **Check:** the 192 and 512 icons are the
  ones picked up; if this was done in DevTools rather than on a device, say so.
- [x] 5.5 Play a lesson with the network turned off after load. **Check:** every exercise
  behaves exactly as before this change, whether or not any icon was ever fetched (spec
  "Playing with the network gone").
- [x] 5.6 Report which checks were automated and which were performed by hand, in the
  change's `verification.md`. **Check:** the manual tier is named as manual, never
  presented as test coverage, and any device not actually tested is listed as untested.
