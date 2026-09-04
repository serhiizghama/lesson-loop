# Verification — add-app-icon

Two tiers. The automated tier is `npm test` and can be re-run by anyone. The manual tier
is what a person had to look at, and it is named as manual throughout: an icon is only
really verified on the screen it appears on.

Date: 2026-09-04. Client: Chrome on macOS 15.6, driven through browser automation.

## Automated — `tests/app-icon.test.ts`, 18 tests, part of `npm test`

| What it proves | Spec requirement |
|---|---|
| `index.html` declares `icon`, `apple-touch-icon` and `manifest`, and each names a file present in `public/` | "Every icon the app declares exists and is what it claims" |
| every `icons` entry in `manifest.webmanifest` names a file that exists | same |
| each declared PNG really is its declared size, read from the IHDR chunk | "A raster that is not the size it claims" |
| no icon reference in the page or the manifest contains `://`, and every one is root-relative | "No third party is asked" |

The suite as a whole: **239 tests, 18 files, all passing**. `npm run typecheck` passes
(client and Worker). `npm run build` passes and puts `icon.svg`, `icon-180.png`,
`icon-192.png`, `icon-512.png` and `manifest.webmanifest` at the root of `dist/`.

### The negative tests were run, not assumed (task 3.3)

Each failure was introduced, observed, and reverted:

| Injected fault | Result |
|---|---|
| `public/icon-192.png` renamed away | 2 tests failed — `/icon-192.png is declared but missing` |
| manifest `"sizes"` changed to `196x196` | 1 test failed — `expected '192x192' to be '196x196'` |
| manifest `src` changed to `https://cdn.example.com/icon-512.png` | 3 tests failed — `points at another origin` |

After each revert the suite returned to 18/18 passing and `git diff` was clean.

## Manual — performed

| Check | How | Result |
|---|---|---|
| `icon.svg` renders as the intended mark (1.1) | opened `/icon.svg` in Chrome and looked at it | the ink rounded square, the gold ring with its gap, the arrow head closing it — as designed (D26) |
| the mark survives tab size (1.2) | drew the SVG into a 16×16 canvas in Chrome, magnified 17× nearest-neighbour, and looked at it; also at 24 and 32 | the ring, the gap on the right and the arrow-head wedge at the top right are each distinguishable at 16 px. This is an eye judgement and is **not** covered by any test |
| the PNGs are the sizes claimed (1.3) | `sips -g pixelWidth -g pixelHeight` | 180×180, 192×192, 512×512. `git diff package.json` empty — no rasteriser or image library entered the project (D28) |
| the browser really asks for the declared files (5.1, partial) | served `dist/` behind a logging static server and loaded the app | Chrome requested `/manifest.webmanifest` and `/icon.svg` (twice: once for the tab, once for the manifest's icon entry). **Nothing else was requested** beyond the app's own JS and CSS — no third-party host appears in the log |
| playing with the network gone (5.5) | loaded the app, opened the *Animals* lesson, then **killed the server** (`curl` then returns nothing) and carried on | cards flipped and showed `rabbit / うさぎ / usagi`, block navigation moved 1/9 → 2/9 → 3/9, and the matching game paired 🐱 with "cat" and marked both done. No console errors. Behaviour identical to before this change (principle 4 intact) |

## Manual — performed by the repository owner

These need a device or a browser surface the automation cannot reach, so they were left
open at implementation time and confirmed separately by the repository owner on
2026-09-04. They are recorded here on their report, not on anything this session observed:
no test covers them, and re-running `npm test` does not re-check them.

| Check | Status |
|---|---|
| 5.1 the tab, at a glance, beside several others | confirmed by the owner. The automation could only show that Chrome fetches `/icon.svg` for the tab and that the mark reads at 16 px; the "findable at a glance" judgement is theirs |
| 5.2 the bookmark carries the same mark | confirmed by the owner — bookmarking is browser UI the automation cannot drive |
| 5.3 the iPad home screen: tile, label, and no URL bar on open | confirmed by the owner. No iOS device was reachable from this session |
| 5.4 the Android home screen, or the manifest in Chrome's Application panel | confirmed by the owner. No Android device was reachable from this session, and DevTools panels cannot be opened through the automation |

Anything later found wrong in these four belongs to the manual tier, not to a gap in
`tests/app-icon.test.ts`: the test guards the wiring, never the appearance.
