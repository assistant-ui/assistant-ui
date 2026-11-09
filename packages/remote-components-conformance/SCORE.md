# Conformance score

`pnpm conformance` (in this package) runs the suite in the official Playwright Linux image
(Docker/OrbStack; see scripts/conformance-docker.sh) on **Chromium,
Firefox and WebKit**, twice: remotes from the Vite dev server (`dev`) and
from `vite build` output served by `vite preview` (`build`).
`node scripts/score.mjs` prints the score per engine and mode.
`RC_ENGINES=chromium` and `RC_REMOTE=dev` narrow a run.

Layout cases compare inline vs remote side by side: geometry of every slot
and every `[data-probe]` element within ±0.5px, and a pixel diff
(pixelmatch, threshold 0.1) that must be **0 pixels** (Chromium runs with
`--disable-lcd-text`, see SPEC.md §7.7).

## Current (version 3, 0.3)

Every remote is a page. By default the suite's components are served as
plain React pages (the Vite plugin's component pages: `<div id="root">`,
`useProps()`, the runtime tag). `RC_VARIANT=static` serves each
component instead as static HTML (rendered on the server, no React in the
frame, plus the component's own small script where it has one).

| Engine | dev | build |
| --- | --- | --- |
| Chromium | 145 / 145 | 146 / 146 |
| Firefox | 144 / 144 | 145 / 145 |
| WebKit | 144 / 144 | 145 / 145 |
| **total** | | **869 / 869** |

Version 2 had 893 cases. Version 3 removes the cases for removed
features (host state, element state, MCP Apps hosts, the render-error
fallback: 5 per engine and mode) and adds `scf-instance` (SCF salt per
`instanceId`). The render-error case now checks that a render error is a
non-fatal `runtime` error. Layout (83 per engine and mode) and layout-dpr
(20/21) are unchanged.

Layout suite (layout 83 + layout-dpr 20/21 per engine, 310 across the
three engines), against the research numbers (branch
`research/html-first`):

| Remote | Research | Version 2 |
| --- | --- | --- |
| plain React page | 298 / 310 | 310 / 310 |
| static HTML page | 280 / 310 | 298 / 310 |

The research's three gaps: `container-query` is fixed (host containers
are emulated, SPEC §7.4) and `dynamic` passes as a static page (the page
carries its own script, as a hand-written page would). `nested` still
fails as a static page: a page with no framework has no host to render a
nested remote with (12 of the 12 static misses).

Arbitrary pages (`RC_PAGES=1`, `tests/pages.spec.ts`): 11 edge-case pages
and 36 LLM-written pages (12 tasks × no guidance, page contract,
fragment), in a 480px slot, block and inside a fit-content box, through
the serving layer; the guided pages also with the author's own tag
(quirks mode) and through Safe Content Frame; plus the create-vite
template app and 12 streamed pages.

| Pages (3 engines) | Shown | Growing | Clipped |
| --- | --- | --- | --- |
| 47 pages × block/fit, serving layer | 282 / 282 | 0 loops (†) | 0 |
| 12 guided pages, author's tag, quirks mode | 36 / 36 | 0 | 0 |
| 12 guided pages through Safe Content Frame | 36 / 36 | 0 | 0 |
| create-vite template app × block/fit | 6 / 6 | 0 | 0 |
| 12 streamed pages: final height = whole page | 36 / 36 | | |

"Clipped" is content cut off at the bottom or beyond the visible frame
(content wider than the slot paints past it, as inline). First reveal
while streaming: 0.2–1.8 s.

† In one WebKit run `plain-weather` changed height once (136px, then
stable at the same height as every other run): the page fetches a live
weather API (public network is on by default) and the container is
offline, so the failure lands at a varying time. No page grows
continuously.

For comparison (version 2 research; the shim can no longer be turned off): without the CSS shim, 11 of 35 pages
keep growing (every page that uses `vh`); with no runtime at all (a plain
300px iframe, `RC_PAGES=full`), 21 of 35 are clipped.

Unit tests: 87 (packages) and 151 (demo).

## Performance

`RC_PERF=1 RC_REMOTE=build pnpm conformance tests/perf.spec.ts` (case
`perf`; skipped in normal runs) writes `.out/perf-<project>.json`. Numbers
from review pass 4, built remotes, in the Linux container (frames run in
the host's process there, so host numbers include the remotes).

| | Chromium | Firefox | WebKit |
| --- | --- | --- | --- |
| First remote on the page, mount to revealed | 76 ms | 104 ms | 75 ms |
| One more remote (warm cache) | 39 ms | 58 ms | 48 ms |
| 20 remotes at once | 186 ms | 386 ms | 458 ms |
| 50 remotes at once | 531 ms | 840 ms | 1058 ms |

Chromium only (CDP): with 50 slots idle, 0 ms of main-thread time per
second. With a clock that changes a text node every 50ms: 75 ms/s after
the position-watcher change (216 before; the page without slots spends
12–17). Host heap per slot (frames in process): 587 KB.

Runtime size (version 3, `pnpm --filter @assistant-ui/remote-components-runtime size`):

| File | min | gzip | brotli | version 2 gzip |
| --- | --- | --- | --- | --- |
| `rc-runtime.js` (first load) | 32.1 KB | 11.3 KB | 10.2 KB | 13.3 KB |
| `rc-overlays.js` (on first overlay) | 10.3 KB | 3.9 KB | 3.5 KB | 3.9 KB |
| `rc-cq.js` (host container emulation, when needed) | 3.1 KB | 1.5 KB | 1.3 KB | 1.5 KB |
| `rc-runtime.full.js` (inlined by hosts) | 41.1 KB | 13.9 KB | 12.6 KB | 17.4 KB |

Version 2 also had `rc-mcp.js` (3.2 KB gzip, MCP Apps hosts only).
Version 1 added 13.9 KB gzip to every compiled React bundle; version 3
loads 11.3 KB gzip once per widget origin, cached and shared by every
remote, with no React. The performance numbers above are from version 1.

## History

| Milestone | Score | Notes |
| --- | --- | --- |
| First full layout run | 41 / 63 | fill cases (reference model), sub-pixel text, frozen `-webkit-text-fill-color` |
| Sub-pixel offset + currentcolor fix + fill reference | 55 / 63 | |
| `--disable-lcd-text` | 58 / 63 | LCD AA impossible in transparent iframes |
| Iframe on device-pixel floor, +1px, position watcher | 59 / 63 | |
| `overflow:hidden` on `<html>` only | **63 / 63** | body clipped the sub-pixel-shifted root |
| Behavioural suite added | 76 / 81 | overlay content token mismatch, focus restore on remote close, opaque CORS, ready-after-error |
| Fixes | **81 / 81** | |
| Repeat x3 | 243 / 243 | no flakes |
| SCF isolation + network capability | **85 / 85** | |
| Reload case (found same-document "reload" bug) + scrollbar-loop case | **88 / 88** | |
| Phase 2: Firefox + WebKit projects (before fixes) | 258 / 264 | Firefox frame-document tab stop, WebKit refused focus after reveal, Firefox no `load` on empty error responses, WebKit dashed-outline repaint |
| Tab across frame edges, focus retries, URL probe | **264 / 264** | 88 per engine |
| Built output (`vite build` + `vite preview`) | **534 / 534** | dev + build |
| Feedback-loop guard, SCF overlays, popover height cap + scrolling, reveal | **555 / 555** | |
| MCP Apps bridge | **567 / 567** | |
| Harder layout: RTL, nested, container queries, many-resize, scrollbars, DPR 1.5/2 + zoom | 48 / 61 DPR, then **749 / 749** | fixed: 1/64px width loss (style string round trip), DPR frame grid, stale frame pixels (clip), RTL root, container info |
| Harder behaviour: tab order across remotes, RPC cancellation, high-frequency props, transitions, selection, teardown | **797 / 797** | added AbortSignal cancellation; nested-remote focus entry |
| Review pass 1: theme transitions, `dir` selectors, focus ring on keyboard entry, radio groups, element state across reload | **839 / 839** | `theme-transition` and `dir-selectors` fail without the fixes (theme stuck on the first frame of a fade, `:dir()` unmatched); the focus ring test also found Firefox restoring a frame's old focused element |
| Review pass 4: ref.focus() after a Tab, theme on `:hover`/`:focus-within`, no reveal on click focus | **857 / 857** | the three new cases fail without their fixes; position watcher 216 → 75 ms/s main-thread time with 50 slots and a ticking clock |
| Phase 4: overlay options while open, Tab through host shadow roots | **869 / 869** | both new cases fail without their fixes: the popover kept its first placement, and in Firefox Tab stopped on the remote's document and could not leave it |
| Version 2 (HTML-first), first full run | 888 / 893 | firefox/webkit network test count, firefox/build RPC identity (pages rendered before connect) |
| Version 2, fixes | **893 / 893** | slot-width layout when the slot is narrower than min-content; ready after the first React commit; pages render after connect |
| Version 3 (0.3), first full run | 863 / 869 | manifest still said protocol 2; the slow page could no longer hold its reveal (now delayed by the server) |
| Version 3, fixes | **869 / 869** | pages corpus unchanged: 282/282 shown, 0 growing, 0 clipped |
