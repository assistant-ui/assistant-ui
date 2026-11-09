# Remote Components — Specification (v3)

Status: draft, implemented by the packages in this repo (0.3). Normative
words (MUST, SHOULD) follow RFC 2119. Version 3 replaces version 2; there
is no compatibility between them.

## 1. Terms

- **Host**: the page that renders `<RemoteComponent src=… />` (or
  `html=…`).
- **Remote**: an HTML document with the runtime in it, shown in an iframe.
  The document *is* the component.
- **Runtime**: `rc-runtime.js` (`@assistant-ui/remote-components-runtime`), the script
  that makes a document a remote. It exposes `window.rc`.
- **Slot**: the host element that takes part in host layout for a remote.
- **Root**: the remote's `<html>` element. `<html>` is the slot's content
  box inside the frame.
- **Serving layer**: whatever delivers the document: a widget server, the
  Vite plugin, or the host itself (`html` prop, Safe Content Frame).
- **Channel**: the dedicated `MessagePort` pair created at handshake.
- **Page API**: `window.rc` (§11): `rc.props`, `rc.overlay()` and two
  events. Everything else is plain web platform.

## 2. What a remote component is

A remote component is an HTML document with the runtime in it.

- Any HTML is valid input: a page without a doctype, a fragment without
  `<html>`, a full page, a built single-page app. The serving layer
  normalizes it (§13): it adds a doctype if there is none, the runtime tag
  first in `<head>` if the page has none, and a Content-Security-Policy
  for the network policy (§12).
- The runtime can come from three places, with the same file and the same
  protocol: a tag the author writes (`<script src=".../rc-runtime.js">`),
  the serving layer, or the host (inlined into documents it shows itself).
- **`<html>` is the slot.** The host owns `<html>`'s box: width, height,
  position, margin, padding, border, overflow, `zoom` and `transform`. The
  runtime writes these with `!important`. The author owns everything
  inside `<html>`, and author CSS wins everywhere else, including over
  the runtime's defaults (§7.5) and the tunnelled theme (§8).
- **The slot is the viewport.** `vh` means the slot (its height when the
  host gives it one, the content otherwise); `vw` is the slot width;
  container queries and units see the host's containers (§7.4).
- **Isolation comes from outside.** Sandbox, origin, CSP and network
  policy are set by the host and the serving layer, never trusted to the
  page. Layout, theme, props, focus and overlays come from the runtime.
  The author writes no glue for either.
- The runtime takes no options: no meta tags, no attributes on its tag.
- Everything else is optional:

| Optional | How | Default |
| --- | --- | --- |
| Props | `rc.props`, the `props-changed` event | the page ignores props |
| Callbacks | `rc.props.onX(…)` (returns a Promise) | none |
| Theme in script | the `theme-changed` event, then re-read computed styles | CSS just works |
| Overlays | `rc.overlay({ kind, src \| html, … })` | none |
| Network | the page's own `<meta http-equiv="Content-Security-Policy" content="connect-src …">` narrows it | the host's policy (§12) |
| Embedding hosts | the serving layer's CSP `frame-ancestors` (§13) | any host |
| React | `@assistant-ui/remote-components-react`: `useProps()`, `useThemeVersion()`, `useOverlay()` | none |

A document opened directly (not framed) is a normal page: the runtime
installs `window.rc` with empty props, never fires `props-changed`, and
changes nothing else.

## 3. Versioning

- Protocol versions are integers. This document is version **3**. Hosts and
  runtimes of this version support exactly `{min: 3, max: 3}`.
- Each side supports a contiguous range `{min, max}`. The host picks
  `min(host.max, remote.max)` if it is ≥ `max(host.min, remote.min)`;
  otherwise it answers `rc/initialize` with an error and reports a
  `protocol` error.
- Additive changes (new optional fields, new notifications, new methods)
  do not bump the version: receivers MUST ignore unknown fields, MUST drop
  unknown notifications, and MUST answer unknown methods with an
  `unsupported` error (JSON-RPC `-32601`).

## 4. Handshake

```
host                                       remote (iframe)
 │ iframe.src = src#rc-nonce=N              │   (or srcdoc / SCF: nonce "")
 │ ───────────────── load ────────────────▶ │
 │ ◀── window.postMessage(req, "*") ─────── │  {jsonrpc:"2.0", id:S, method:"rc/initialize",
 │        (repeated every 100ms, ≤30s)      │   params:{nonce:N, session:S, protocol:{min,max}, runtime}}
 │ check: source === iframe.contentWindow   │
 │        origin === expected origin        │
 │        nonce === N                       │
 │ new MessageChannel()                     │
 │ ── contentWindow.postMessage(res, ─────▶ │  {jsonrpc:"2.0", id:S, result:{nonce:N, protocol:v, init}}
 │        remoteOrigin, [port2])            │  check: source === parent, id, nonce
 │ ◀──── port: rc/notifications/ready ───── │  {size}
```

- The runtime starts the handshake as soon as it runs, usually from
  `<head>` before the body is parsed.
- The nonce is 128 random bits (base64url) in the URL **fragment** under
  `rc-nonce`. An existing fragment is kept: `#/x` → `#/x&rc-nonce=N`. The
  fragment is reserved for the host; remotes SHOULD NOT use hash routing.
- `rc/initialize` carries no secrets; it is posted with target `"*"`
  because the remote does not know the host origin yet. Its `id` is the
  session.
- The result MUST be posted with `targetOrigin` = the remote's exact
  origin (own-origin mode) or `"*"` (opaque mode, §14), and transfers the
  channel port.
- After the handshake, all messages use the port.
- `rc/initialize` repeats every 100ms until answered (the host may
  register the frame late, e.g. when Safe Content Frame creates it). After
  30s the runtime gives up (`timeout`). All repeats carry the same random
  `session`; the host ignores a session it already handled.
- An `rc/initialize` with a **new** session from the same frame means the
  document reloaded itself: the host closes the old channel and repeats the
  handshake (resending props, theme, layout).
- No common protocol version: the host answers with a JSON-RPC error
  (`-32600`, `data: {name, message, code: "protocol", nonce, supported}`).
- Documents that cannot see a URL fragment (`srcdoc` and SCF documents)
  send `nonce: ""`; the host then relies on the source window and exact
  origin.
- Which pages may embed a remote is set by the serving layer, with CSP
  `frame-ancestors` (§13, §14).
- Frame sources:
  - **url**: the host navigates its own iframe to `src`.
  - **srcdoc** (`html` prop): the host prepares the document (§13) and
    shows it with `srcdoc`, always without `allow-same-origin` (a `srcdoc`
    document with it would run on the host's origin). Origin `"null"`.
  - **scf** (`isolation="scf"`, with `src` or `html`): the host prepares the
    document and shows it with `SafeContentFrame.renderHtml`; origin
    `https://<hash(product, salt, hostOrigin)>-h184756.<shim domain>`, salt
    `rc:v2:<publisher origin>` by default (`scf.salt: "instance"` adds the
    `instanceId`, so each instance keeps its own origin and storage). For
    `src`, the host fetches `src` + `single.html` when `src` ends in `/`
    (falling back to `src`), else `src`, and adds `<base href>` so the
    page's relative URLs still point at the widget server.
  Policy (overlay origin checks) uses the origin of `src` (`"null"` for
  `html`).

### 4.1 Init payload (`result.init`)

| Field | Type | Meaning |
| --- | --- | --- |
| `src` | string | the remote URL (base for relative overlay URLs); `""` for `html` documents |
| `props` | `Record<string, Encoded>` | all props, encoded per key (§6) |
| `theme` | `ThemeSnapshot` | §8 |
| `layout` | `LayoutInfo` | §7 |
| `overlay?` | `{kind}` | present when this remote renders overlay content |

## 5. Channel messages

Every message is a JSON-RPC 2.0 object, with names in the style of MCP
Apps (`ui/initialize`, `ui/notifications/size-changed`) under the `rc/`
prefix:

- **Notifications** `{jsonrpc:"2.0", method, params}`: fire and forget,
  delivered in order. Names are `rc/notifications/<kebab-case>`.
- **Requests** `{jsonrpc:"2.0", id, method, params}` answered by exactly
  one `{jsonrpc:"2.0", id, result}` or `{jsonrpc:"2.0", id, error}`. `id`
  is a positive safe integer unique per sender. A request whose `id` is
  still being served is answered with a `protocol` error and not run.
  Closing the channel rejects all pending requests with a `closed` error.
- **Errors** `{code, message, data}`: `code` is the JSON-RPC number
  (`-32601` for `unsupported`, `-32600` for `protocol`, `-32000`
  otherwise); `data` is the full error (§6.4), with the remote-components
  code in `data.code`.
- `params` and `result` cross with the structured clone algorithm, not
  JSON (§6): they may hold `Date`, `Map`, `undefined` and encoded
  functions. The envelope itself is plain JSON-RPC.

Every inbound message MUST be validated structurally; invalid messages are
dropped.

### 5.1 Host → remote notifications

| method | params | notes |
| --- | --- | --- |
| `rc/notifications/props-changed` | `{seq, set, del}` | §6.3 |
| `rc/notifications/theme-changed` | `{theme}` | full snapshot, sent only when it changed |
| `rc/notifications/layout-changed` | `{layout}` | sent only when it changed |
| `rc/notifications/overlay-dismissed` | `{id, reason}` | `escape`, `outside`, `host`, `error`, `unmount` |

### 5.2 Remote → host notifications

| method | params | notes |
| --- | --- | --- |
| `rc/notifications/ready` | `{size}` | once per document (§11.3), after fonts (≤1s) |
| `rc/notifications/size-changed` | `{size}` | after ready, whenever a measurement changed |
| `rc/notifications/error` | `{error}` | uncaught errors and unhandled rejections; never fatal |
| `rc/notifications/overlay-anchor-changed` | `{id, anchor}` | anchor rect moved (remote viewport coords) |
| `rc/notifications/pointer-down` | `{insideAnchorOf}` | pointer-down while the remote has open overlays; ids of those whose anchor contains the target |
| `rc/notifications/escape-pressed` | `{}` | Escape keydown not `defaultPrevented` |
| `rc/notifications/focus-exit` | `{direction}` | Tab left the first/last stop (§10) |
| `rc/notifications/focus-enter` | `{}` | document focused with nothing focused in it (§10) |
| `rc/notifications/focus-changed` | `{rect}` | element focused; host scrolls it into view (§10) |

Both directions: `rc/notifications/cancelled {requestId}` (§6.2).

### 5.3 Requests

| method | direction | params → result |
| --- | --- | --- |
| `rc/call` | both | `{ref, args}` → `Encoded` (§6.2) |
| `rc/focus` | host → remote | `{target, focusVisible?}` → `null`; `first`, `last`, `restore`; `focusVisible` as in `HTMLElement.focus()` (§10) |
| `rc/overlay/open` | remote → host | §9 → `null` |
| `rc/overlay/update` | remote → host | `{id, props?, anchor?, placement?, offset?, label?, matchAnchorWidth?}` → `null` |
| `rc/overlay/close` | remote → host | `{id}` → `null` |

## 6. Values and props

### 6.1 Encoding

Values cross with the structured clone algorithm, after a walk that
replaces functions:

```ts
interface Encoded { v: unknown; f?: Path[] }   // Path = (string | number)[]
```

`v` is the value with each function replaced by `null`; `f` lists the
paths where functions were. The receiver puts a proxy at each path.

| Value | Behaviour |
| --- | --- |
| primitives, `undefined`, `NaN`, `-0`, bigint | preserved |
| plain objects, arrays | walked; functions inside become proxies |
| `Date`, `RegExp`, `Map`, `Set`, `ArrayBuffer`, typed arrays, `Blob`, `File`, `Error`, boxed primitives | structured clone (Map/Set contents are checked: functions/symbols inside are errors) |
| other class instances | own enumerable string keys copied; **prototype dropped** |
| functions | proxies (props and overlay props only) |
| symbols, Promises, thenables, `WeakMap`/`WeakSet`/`WeakRef`, DOM nodes, windows | `data` error naming the path |
| symbol-keyed properties | ignored |
| cycles, shared references | preserved |
| own property `__proto__` | preserved as an own property; the prototype setter is never invoked |

`Error` through structured clone keeps `name` (standard names only),
`message`, and `stack` in Chromium; errors thrown across RPC use the
explicit serialised form (§6.4) instead.

### 6.2 Functions

A function is addressed by **(scope, path)**, never by identity. Scope
`props` resolves against the host's *current* props; scope `overlay:<id>`
against the remote's current props for that overlay.

- Calling a proxy sends `rc/call {ref:{scope, path}, args: Encoded}`.
- The callee looks up the function at the path in the **latest** value
  (latest-ref semantics). If there is none: `stale-function` error.
- The callee serves only paths it sent: the `f` paths of the latest
  encoding of that scope. Any other path is a `stale-function` error, even
  if a function is reachable there (a prop that failed to encode, such as
  a React element or a DOM node, or a non-enumerable property).
- The proxy always returns a Promise of the decoded return value; sync
  returns, async returns and throws all map to resolve/reject.
- Proxies are cached per (scope, path): the same function prop keeps the
  same identity across updates.
- Arguments and return values MUST NOT contain functions (`data` error).
- **Cancellation.** An `AbortSignal` in the arguments (at any depth) is
  sent as a marker (`Encoded.s` lists the paths). The callee gets a fresh
  signal at the same places. Aborting the caller's signal rejects the
  call at once with the signal's reason and sends
  `rc/notifications/cancelled {requestId}`; the callee's signal then
  aborts with a `cancelled` error. Closing the
  channel aborts every call being served. A result that arrives after a
  cancel is dropped. Signals anywhere else (props, results) are a `data`
  error.

### 6.3 Prop updates

- The host encodes each top-level prop and compares it structurally with the
  last encoding sent. Only changed keys are sent (`set`); removed keys are
  listed in `del`.
- A new function identity at the same path is **not** a change (no message).
- Updates from one host task are coalesced into one message (microtask).
- `seq` increases by one per message, starting at 1 after the handshake (init
  props are seq 0). The remote ignores messages with `seq ≤ last`.
- The remote applies a patch atomically: one new props object, one render.
- A prop that cannot be encoded is reported to the host's `onError`
  (`data`, non-fatal) and treated as absent.
- Host-only props are not forwarded (§15); `remoteProps` forwards any name.
- The page sees the new props object (`rc.props`) and a `props-changed`
  event (§11).

### 6.4 Errors

```ts
interface SerializedError { name: string; message: string; stack?: string; code?: string; data?: unknown }
```

The receiver rebuilds an `Error` with `name`, `message`, `stack`. If
`code` is a known code (§16) it is a `RemoteComponentError`.

## 7. Layout

### 7.1 Reference model

**A remote component lays out exactly like its content wrapped in a block
that establishes a new block formatting context:**

```html
<div class="slot" style="position: relative">     <!-- host styles go here -->
  <div style="display: flow-root; height: 100%"> …the page's <body> content… </div>
</div>
```

The remote's `<html>` plays the `flow-root` block: the root element
already establishes a block formatting context, so margins inside do not
collapse through it. Consequences (all tested in the conformance suite):

- Width comes from the host (block: fill; flex/grid/float/fit-content:
  shrink-to-fit using the remote's intrinsic widths).
- Height is the content height at that width (auto height).
- min-content and max-content contributions equal the content's.
- Percent heights in the page resolve when the host gives the slot a
  definite height (explicit height, flex/grid stretch, `flex: 1` in a column,
  `aspect-ratio`); otherwise they behave as `auto`.

### 7.2 Slot DOM (host)

```
slot  <div data-rc-slot style="position:relative; …user style">
  sizer <div data-rc-sizer style="position:relative; min-width:{minContent}px;
                                   min-height:{height}px; height:100%">
    <canvas style="display:block; width:{maxContent}px; max-width:100%; height:0">
    <iframe style="position:absolute; inset:0; width:100%; height:100%">
```

- The canvas is a *compressible replaced element* with a percentage
  `max-width`: its min-content contribution is 0 and its max-content
  contribution is `maxContent`. The sizer's `min-width` lifts the
  min-content contribution to `minContent`. (spikes/)
- `min-height` gives auto height; `height: 100%` lets a definite host height
  win (and overflow like inline content when the content is taller).
- The iframe fills the sizer, so its width is the slot's content width (or
  `minContent` when the slot is narrower: overflow like inline content).

### 7.3 Messages

```ts
interface LayoutInfo { width: number; height: number | null; offsetX: number; offsetY: number; containers?: ContainerInfo[]; viewportHeight?: number }   // host → remote
interface SizeReport { width: number; height: number; minContent: number; maxContent: number }
```

- `layout.width` is the sizer's exact (fractional) width, or the slot's
  content width when the sizer is wider (the slot is narrower than the
  content's min-content width). Inline, the flow-root block would be the
  slot's width there: its scroll containers scroll, and content that
  cannot shrink overflows (in a remote it is clipped at the slot). Browsers round
  the iframe viewport to whole pixels, so the runtime sets `<html>`'s width
  to `layout.width` (`!important`): the page never lays out against the
  viewport width.
- `layout.height` is the sizer's height when it exceeds the reported content
  height (host constrains the height), else `null`. `<html>` gets that
  height so percentage heights resolve (`body { height: 100% }`, the page
  defaults in §7.5), and `auto` otherwise.
- The runtime measures in one synchronous pass, with no paint in between:
  `height` = `<html>` height with `height:auto` at `layout.width`;
  `minContent`/`maxContent` = `<html>` width with `width:min-content` /
  `max-content`. Then it restores `<html>`'s styles.
- Measurement triggers: DOM mutations anywhere in the document (except the
  runtime's own style writes on `<html>` and `<body>`), `<html>` resize,
  font loads, resource loads, layout and theme notifications, CSS shim
  rewrites. Coalesced per microtask; a report is sent only if a value
  changed.
- `SizeReport.width` echoes the width the height was measured at.
- Sub-pixel placement: frames are anchored on a grid whose step is the
  smallest whole number of CSS px that is also a whole number of device px
  (1 at DPR 1 and 2, 2 at DPR 1.5, 4 at DPR 1.25). Engines snap a frame's
  origin differently (WebKit and Firefox to device px, Chromium to whole
  CSS px); a grid line is both. `offsetX/offsetY` ∈ [0, step) is the
  distance of the slot's corner from the grid line at or before it. The
  host places the iframe on that line (`left: -offsetX`); the runtime
  positions `<html>` at `(offsetX, offsetY)` (`position: relative`). Content then lands on the
  same sub-pixel positions as inline content. The host re-checks positions
  in a short rAF burst after any layout activity (slots can move without
  resizing) and when `devicePixelRatio` changes.
- Frame size: the sizer plus the offset plus 1px, rounded up to a whole
  number of CSS px that is also a whole number of device px (a frame's
  viewport is whole CSS px; a fractional element makes engines scale the
  frame's content). The part beyond the slot, rounded out to device px, is
  clipped with `clip-path`, so it never paints or takes pointer events.
- `layout.containers`: the slot's nearest query containers (the slot
  itself counts), nearest first, at most 2, as `{width, height, name,
  type}` (content-box sizes). See §7.4.
- `layout.viewportHeight`: the host's viewport height (§7.4).
- `<html>` has `margin-right: auto`, so it starts at the left edge in RTL
  documents too (the frame is wider than the slot).
- Implementation note: never restore a length from a style string. Engines
  serialise lengths to 6 significant digits (`101.3125px` reads back as
  `101.312px`), which loses 1/64 px.
- Only `<html>` clips (`overflow: hidden`). A page that wants scrolling
  inside the slot scrolls an element of its own.

### 7.4 The slot is the viewport

A page written for a browser window would read the frame where it should
read the slot. The runtime's CSS shim rewrites those few features. It
covers same-origin stylesheets (also `@import`, `@media`, nesting),
`insertRule` (CSS-in-JS) and inline `style` attributes. It is always on.

- **Viewport height.** In an auto-height frame the viewport *is* the
  content, so `min-height: 100vh` would grow by the frame's rounding slack
  on every report, forever. Instead:
  - definite slot height H: `1vh` = H / 100 (`vh`, `svh`, `lvh`, `dvh`);
  - auto slot height: `height`, `min-height`, `max-height` and their
    `block-size` forms that use `vh` become `auto`, `0px` and `none`, so
    the content decides (a page "centred in the window" becomes its
    content; an `h-screen` app shell becomes the height of its content).
    Other `vh` lengths use the host's viewport height
    (`layout.viewportHeight`, 800px if absent).
- **Viewport width.** `vw` already means the slot width (the frame is the
  slot's width, rounded).
- **Query containers.** When the slot itself is the host's nearest query
  container, `<body>` becomes a container of the same type and name (the
  root element does not match `@container` in every engine). When the
  nearest container is an ancestor of a different size (the slot sits in
  a wider container), the page cannot be inside it, so the runtime
  emulates it:
  - container units (`cqw`, `cqh`, `cqi`, `cqb`, `cqmin`, `cqmax`) become
    `calc(n * var(--rc-cqw, 1cqw))`, with the variables set on `<html>`
    from `layout.containers[0]`. Rules that make an element a container
    reset the variables, so its descendants use it natively;
  - every `@container` rule gets a twin `@media` rule with the same
    contents right after it, switched to `all` when the host container the
    rule names (or the nearest one, unnamed) matches the condition and to
    `not all` otherwise. The browser evaluates the condition itself, on a
    hidden probe with the host container's size and type. This part
    (`rc-cq.js`) loads only for pages that have `@container` rules and a
    host container that is not the slot; `ready` waits for it (≤1s).
- Not covered: cross-origin stylesheets without CORS, JavaScript that reads
  `innerHeight`, `@media (height)`, `vmin`/`vmax`.

### 7.5 Page defaults

The runtime puts this first in `<head>`:

```css
html { overflow: hidden !important; margin: 0 auto 0 0 !important; padding: 0 !important;
       border: 0 !important; box-sizing: border-box !important; min-width: 0 !important;
       max-width: none !important; min-height: 0 !important; max-height: none !important;
       transform: none !important; zoom: 1 !important }
:where(body) { margin: 0; height: 100% }
:where(body > #root, body > #app, body > #__next) { height: 100% }
```

- A component has no 8px page margin. Any author `body` rule overrides it
  (`:where()` has specificity 0).
- `height: 100%` on `body` and on conventional app mount points lets fill
  cases work (explicit height, stretch, `flex: 1`, `aspect-ratio`), like
  the reference model's `height: 100%`. With an auto slot height it is
  `auto`.
- Quirks mode (a page without a doctype that the serving layer did not
  normalize, e.g. an author-placed tag): an `auto`-height `<html>` fills the
  viewport there, so the runtime uses `height: max-content` on `<html>` and
  `<body>` instead.

### 7.6 Reveal and feedback loops

- Before `ready` (§11.3) the sizer is out of flow (absolute, zero height, hidden)
  and the fallback is in flow. The iframe still has the slot's width so the
  remote can measure.
- On `ready` the sizer takes the reported sizes; the iframe stays hidden
  until a size report's `width` matches the sizer's current width
  (**settled**), so the first visible frame is already correct. A 250ms cap
  prevents staying hidden.
- Intrinsic widths do not depend on the slot width, so width → height is
  one-directional. A loop exists only if host layout makes width depend on
  height (e.g. a scrollbar that appears at one width and not the other).
- Guard: if the reported width flips between two values at least 4 times
  within 1s, the host pins the slot's height to the larger height seen
  (the remote is not told). The width then settles at the narrower value,
  as browsers settle scrollbars. The pin is released when the width moves
  outside that pair or the content height changes at an unchanged width.

### 7.7 Known differences from inline

- Baseline alignment: the slot has no text baseline (it synthesises one
  from its bottom edge). `align-items: baseline` and inline-block
  `vertical-align: baseline` differ.
- Overflow beyond a host-constrained height is clipped by the iframe
  instead of painting outside the slot.
- LCD (subpixel) text anti-aliasing: text in a transparent iframe is
  grayscale; inline text on an opaque page may use LCD AA (Windows/Linux
  Chromium). The conformance suite runs with `--disable-lcd-text`.
- `position: fixed` inside the remote is relative to the iframe, which is
  the slot: a fixed bottom bar sits at the bottom of the component. It is
  out of flow, so it adds no height.
- A page is a query container only of its own size: a host container
  wider than the slot is emulated (§7.4), not native. Elements inside the
  page's own containers match the host container's emulated rules too
  when the host container matches.
- Vertical writing modes: the slot takes its width from the host and its
  height from the content, as in horizontal text. In a `vertical-rl` or
  `vertical-lr` container the inline axis is vertical, so an inline block
  would take its height from the container and its width from the
  content. `writing-mode` is tunnelled, so the remote's text runs
  vertically, but the slot is still sized the horizontal way. Untested.
  Wrap the slot in a `horizontal-tb` box with a set width, or give the
  remote an explicit size.
- Percentage `width` in the remote's root children with intrinsic sizing
  behaves per CSS (cyclic percentages), same as inline.

## 8. Theme ("CSS tunnelling")

```ts
interface ThemeSnapshot {
  inherited: Record<string, string>;  // allowlisted inherited properties at the slot
  vars: Record<string, string>;       // custom properties at the slot
  fonts: FontFaceSpec[];
  lang: string;
  rootFontSize: string;               // host <html> font-size, so rem matches
}
```

- The host reads `getComputedStyle(slot)`. Inherited properties: the list in
  `TUNNELLED_PROPERTIES` (color, color-scheme, font-*, line-height,
  letter/word-spacing, text-*, direction, writing-mode, cursor, …).
  Non-inherited properties never cross; they style the slot itself.
- `line-height` heuristic: computed px divided by font-size; if the ratio is
  exact to 1/1000 it is sent unitless (so it inherits as a factor).
- Custom properties: all, or filtered by `theme.vars` (names / `prefix*` /
  predicate), plus `extraVars`.
- The remote applies vars and inherited properties to `<html>`,
  `rootFontSize` as the `<html>` font-size (so `rem` matches the host), and
  the slot's font-size on `<body>` (so `em` and inherited text size match
  the inline position). Author CSS wins over all of these, as an author
  rule would win over inherited values inline.
- `color-scheme` MUST match between the iframe element (inherits from the
  slot) and the remote document; otherwise browsers paint an opaque canvas
  behind the remote. Tunnelling `color-scheme` keeps the iframe transparent.
- The remote also sets `<html dir>` to the tunnelled `direction`, so
  `:dir()` and `[dir]` selectors (Tailwind's `rtl:` variants) match as
  they would inline. The CSS property alone does not make them match.
- Re-sent (full snapshot, only if changed) when: the slot's class/style
  props change, any class/style/lang/dir/data-theme attribute changes in the
  document, stylesheets change, `prefers-color-scheme` changes, the window
  resizes (media queries), the slot resizes (container queries), the
  pointer or focus moves so that `:hover` or `:focus-within` changes on an
  element that contains the slot (pointer over the remote counts). At most
  once per frame.
- After applying a snapshot (and once at connect) the runtime fires
  `theme-changed` on `rc` (§11), for script that reads computed styles.
- Transitions and animations: while a transition of a tunnelled or custom
  property (or any animation) runs on an element that contains a slot, the
  host re-reads every frame until it ends (at most 5s without an end
  event). A theme switch that fades colours therefore ends on the final
  values in the remote, and the remote fades along.

### 8.1 Fonts

```ts
interface FontFaceSpec { family; src; weight?; style?; stretch?; display?; unicodeRange? }
```

- Default: every `@font-face` in readable stylesheets, URLs absolutised.
- The remote sanitises: `src` items must be `url("http(s)://…")`,
  `url("data:font/…")` or `local("…")`, optionally with `format()`/`tech()`;
  other descriptors are keyword-only.
- **CORS**: font loads are CORS requests from the remote's origin. Font
  files MUST be served with `Access-Control-Allow-Origin` that matches the
  remote origin, or `*`. Opaque-origin remotes send `Origin: null`, which
  only `*` satisfies.

## 9. Overlays

Remotes cannot draw outside their frame. They ask the host:

```ts
rc/overlay/open {
  id, kind: "popover" | "dialog",
  content: { src, props: Encoded }      // content is another remote component,
         | { html, props: Encoded },    // or an HTML document shown like the html prop
  anchor?: Rect,                        // popover: remote viewport coords
  placement?: { side, align }, offset?, label?, matchAnchorWidth?
}
```

- For `src` content the host checks the origin (default: same origin as
  the requester; configurable). `html` content needs no check: it is shown
  like the `html` prop (opaque `srcdoc`, or SCF for an SCF owner) under the
  owner's network policy. The host decodes props with proxies in scope
  `overlay:<id>`, and renders the content with `<RemoteComponent>` in a
  portal on `document.body`, with the owner's isolation (an SCF owner's
  overlays run on the same hashed origin).
- **Popover**: `position: fixed`, placed by `computePosition` (side, flip to
  the opposite side if it overflows and the other side has more room, align,
  shift into the viewport with 8px padding). Re-positioned on
  `rc/notifications/overlay-anchor-changed` (the remote tracks its anchor
  every frame while open),
  host scroll (capture) and resize, and content size changes. Hidden until
  the content is settled and positioned.
- **Height cap**: a popover may take the room on its side (after flipping)
  minus the padding; a dialog the viewport minus 16px on each side. Taller
  content scrolls in the host container around the frame, like an inline
  popover with `max-height` and `overflow-y: auto`.
- **Dialog**: full-viewport backdrop, centered panel `role="dialog"
  aria-modal="true" aria-label`, rest of the page `inert`, focus sentinels
  so Tab cycles inside, initial focus on the content's first tabbable
  element.
- Dismissal (`rc/notifications/overlay-dismissed` to the owner):
  - `escape`: Escape in the content or the owner (owner's topmost overlay),
    or in the host page (topmost overlay);
  - `outside`: pointer-down anywhere outside the popover and its descendant
    overlays (host page, other remotes, the owner) except on the popover's
    own anchor (the owner toggles it), or on a dialog's backdrop.
- Closing via `rc/overlay/close` sends no dismissal.
- The runtime sends `rc/overlay/update` only when the props encode
  differently from the last ones sent (a new object literal with the same
  data sends nothing; functions resolve against the latest props anyway).
- Focus restore: when an overlay that held focus (or any dialog) closes,
  the host focuses the owner's iframe and sends `rc/focus {target:"restore"}`;
  the owner focuses the element that was active when the overlay opened.
  `focusVisible` is true after an Escape dismissal and false after an
  outside click, as the browser would decide inline.
- Overlays nest: overlay content can open overlays.
- The remote chooses only the content's props. Host settings of the
  content frame (sandbox, `allow`, style, isolation) come from the owner's
  host, never from the request.
- When the owner's document reloads itself or the owner fails, its
  overlays are closed and it gets no more host services.

## 10. Focus and keyboard

- Sequential focus navigation into and out of the iframe is native: Tab from
  the element before the slot enters the remote's first tabbable element;
  Tab past the remote's last element continues in the host.
- `ref.focus("first" | "last", { focusVisible }?)` focuses the iframe and
  asks the remote to focus its first/last tabbable element.
- Tab across the frame edge is explicit, because engines differ (Firefox
  stops on the frame element and on the frame document):
  - remote: Tab on its last stop (Shift+Tab on its first), or any Tab with
    no stops, is prevented and sent as `rc/notifications/focus-exit
    {direction}`;
  - host: moves focus to the stop after (before) the iframe in its own tab
    order; if that stop is another remote's iframe, it focuses the iframe
    and sends `rc/focus {first|last}`; with no stop left it blurs the
    iframe (or, inside a remote, continues outward through that remote);
  - host: Tab whose next stop is a remote's iframe is prevented and enters
    the remote the same way;
  - `rc/notifications/focus-enter`: the remote document got focus with
    nothing focused in it; if a Tab happened in the host within 1s, the
    host enters it. A pointerdown in the host ends that Tab. While the host
    focuses the iframe itself (`ref.focus()`, focus restore) it ignores
    `focus-enter` for 1s, since it already sent the target.
  - nested remotes: when a runtime's first/last stop is an iframe, it
    dispatches the internal DOM event `rc/focus-enter {target}` on that
    iframe; the nested host in the same document enters it. A nested host
    with no stop left dispatches `rc/focus-exit {direction}` on its
    window, and the runtime there continues with `focus-exit`. These two
    DOM events are private to the packages, not page API.
  Tab order: positive `tabindex` first, then document order. Open shadow
  roots are walked in place of their host's children and slots in place
  of their assigned elements; closed roots are skipped. A radio group (same `name` and form) is one stop:
  its checked radio, or its first radio when none is checked.
- Focus ring: the Tab that moves focus into a remote happens in the host,
  so the remote's own `:focus-visible` heuristic would guess wrong (after
  a click inside the remote, a later Tab into it would show no ring). The
  host sends `focusVisible: true` when it enters a remote on Tab (and for
  the dialog's focus sentinels); the remote passes it to `focus()`. Host
  stops reached on Tab out of a remote get `focusVisible: true` too.
  `ref.focus(target, { focusVisible })` lets the host choose.
- `rc/focus {first|last}` holds the stop for 30 frames: it focuses it again
  if focus moved elsewhere in the remote, unless the user pressed a key or
  a pointer in the remote meanwhile. WebKit refuses focus right after a
  frame is revealed, and Firefox moves focus back to the frame's
  previously focused element once the frame itself gets focus. A remote
  with no stops answers with `focus-exit`.
- `rc/notifications/focus-changed {rect}`: sent on `focusin` in the remote
  and when the remote focuses a stop for `rc/focus {first|last}`; the host scrolls its scrollers
  the least amount that makes the rect visible (WebKit does not do this
  across a cross-origin frame). Not sent for the focus a click gives the
  clicked element (the first focus within 1s of a pointerdown, on an
  element that contains its target): inline, that does not scroll.
- Keyboard events inside the remote do not reach the host page. Only
  Escape is forwarded (`rc/notifications/escape-pressed`) for overlay
  dismissal.
- The iframe has a `title` (`frameTitle`, default "Remote component").

## 11. Page API

### 11.1 `window.rc`

```ts
interface Rc extends EventTarget {
  readonly props: Readonly<Record<string, unknown>>;   // same object until a prop changes; function props are async proxies
  overlay(options: { kind: "popover" | "dialog"; src?: string; html?: string; props?: object;
                     anchor?: Element; placement?: { side; align }; offset?: number;
                     label?: string; matchAnchorWidth?: boolean; onDismiss?(reason): void })
    : { update(props): void; setOptions(options): void; close(): void; ready: Promise<void> };
}
```

- `window.rc` (also the global `rc`) exists from the moment the runtime
  runs. `rc.props` is an empty frozen object until the host connected and
  the document is parsed, never a new object per read (React's
  `useSyncExternalStore` would loop).
- `rc.overlay()` returns a handle at once; the overlay code
  (`rc-overlays.js`) loads on first use. Opened directly, `ready` rejects
  (`overlay`).
- Types without an import: `/// <reference types="@assistant-ui/remote-components-runtime/global" />`
  (or `"types": ["@assistant-ui/remote-components-runtime/global"]`).
- `@assistant-ui/remote-components-runtime` (ESM) is the same code: importing it starts
  the runtime (idempotent) and exports `rc`.

### 11.2 Events

`rc` is an `EventTarget` (like `MediaQueryList`). Both events are plain
`Event`s with no payload; nothing is dispatched on `window`.

| type | fires | then |
| --- | --- | --- |
| `props-changed` | once when the first props are visible (host connected and the document parsed, so every script in it, deferred and module scripts included, can listen first), then on every prop change | read `rc.props` |
| `theme-changed` | once at the same moment, then each time the runtime re-applied a new theme snapshot (§8) | re-read computed styles |

```js
const render = () => { /* … rc.props … */ };
render();
rc.addEventListener("props-changed", render, { signal });   // AbortSignal removes it
```

The wire protocol (§5) is private to the packages. Pages never see its
messages.

Uncaught errors and unhandled rejections are reported to the host as
non-fatal `runtime` errors (`rc/notifications/error`). A page has no way
to report a fatal error.

### 11.3 Reveal

The host keeps its fallback up and the frame hidden until `ready`. The
runtime sends it after:

1. the `load` event (or `DOMContentLoaded` + 1.5s, so slow images do not
   hold the reveal) and the first `props-changed`;
2. two more tasks, so script-rendered content (React's first commit, a
   chart drawn on load) is in the first size. Not
   `requestAnimationFrame`: a hidden cross-origin frame gets no animation
   frames;
3. web fonts (≤1s) and, when needed, `rc-cq.js` (≤1s).

There is no other mode. The Vite plugin's component pages render on the
first `props-changed` (with `flushSync`), so the component never sees
empty props.

### 11.4 Delivery

`rc-runtime.js` is one classic script, versioned with the package. It
loads rarely used parts from the same directory on first use:
`rc-overlays.js` (overlays) and `rc-cq.js` (host container emulation,
§7.4). `rc-runtime.full.js` has everything in one file, for documents that
cannot load scripts by URL (`srcdoc`, SCF);
`@assistant-ui/remote-components-runtime/source` exports it as a string. Bundled apps
import `@assistant-ui/remote-components-runtime`; the Vite plugin points those imports
at the tag's `window.rc` so the code is not loaded twice.

## 12. Network

Remotes fetch public endpoints directly. There is no host relay: anything
that needs the host's data or the user's authority goes through props and
host callbacks, which the host implements and authorizes.

- Policy is CSP `connect-src`, set from outside:
  - `"public"` (default): `connect-src https: wss:`. Requests are
    credential-less from the host's point of view: the remote runs on its
    own origin (no host cookies) or an opaque one (no cookies at all). CORS
    applies as usual.
  - `"none"`: `connect-src 'none'`.
  - a list of origins (`https://api.example.com`, `https://*.example.com`):
    exactly those.
- A page narrows its own policy with a CSP of its own:
  `<meta http-equiv="Content-Security-Policy" content="connect-src
  https://api.example.com">`. The browser enforces every policy, so a page
  can never widen the host's.
- Where it is enforced:
  - documents the host shows (`html`, SCF): a CSP `<meta>` the host writes;
  - URL remotes: the serving layer's CSP header. A host tightens it with
    `<iframe csp="connect-src …">` (CSP Embedded Enforcement): the serving
    layer sends `Allow-CSP-From: *` so the document accepts it. Only
    Chromium enforces the attribute; in other engines a URL remote's policy
    is whatever its server sends.
- Private networks: CSP cannot express address ranges, so `https:` also
  matches loopback, private, link-local and metadata addresses and the
  host's own origin. Those requests carry no host credentials, and
  Chromium's Private Network Access blocks public-origin frames (opaque
  frames count as public) from reaching private addresses without a
  preflight. A host that must guarantee it uses `"none"` or an allowlist.
- `rc.fetch` does not exist; pages use `fetch()`.

## 13. Serving layer

`@assistant-ui/remote-components-serve` normalizes any HTML into a remote:

- `normalizeHtml(html, { runtime, network, frameAncestors, cspMeta })` →
  `{ html, headers }`: adds `<!doctype html>` when the document does not
  start with one (no doctype means quirks mode); adds the runtime tag
  first in `<head>` (creating the head context a fragment implies) unless
  the page loads `rc-runtime*.js` itself; returns
  `Content-Security-Policy: connect-src …` (§12; plus `frame-ancestors`),
  `Allow-CSP-From: *` and `X-Content-Type-Options: nosniff`.
  `runtime: { inline }` inlines the runtime; `cspMeta` puts the CSP in a
  `<meta>` for documents shown without headers.
- `frameAncestors: ["https://app.example"]` (on `normalizeHtml`, the
  middleware and the Vite plugin) sets CSP `frame-ancestors`: which host
  pages may embed the remote. `[]` means none. Browsers ignore
  `frame-ancestors` in a `<meta>`, so it is a header only.
- `streamPrefix()`: the bytes to send before a streamed page: a doctype and
  the runtime tag, so the runtime connects before the body arrives. A
  doctype later in the page is ignored by the parser.
- `@assistant-ui/remote-components-serve/node`: `remoteComponentsMiddleware({ root,
  network, frameAncestors, runtimeBase })` serves the runtime files
  (CORS open, so opaque frames can load them) and normalizes every
  `*.html` under `root`.
- The Vite plugin uses the same functions; the host uses them for `html`
  and SCF documents, with the runtime inlined.

## 14. Security

See THREAT_MODEL.md. Requirements:

- The host MUST check `event.source`, `event.origin` and the nonce on
  `rc/initialize`, and post the result to the exact remote origin.
- The runtime MUST accept the result only from `window.parent`, with its
  session id and nonce. Publishers SHOULD restrict which hosts may embed
  them with CSP `frame-ancestors` (§13).
- **Own-origin mode** (default sandbox includes `allow-same-origin`): the
  remote MUST be on a different origin than the host; the host refuses
  otherwise. Remotes from different publishers SHOULD be on different
  sites: one subdomain per publisher of a domain on the Public Suffix
  List, or SCF (DESIGN.md §11).
- **Opaque mode** (sandbox without `allow-same-origin`, and always for
  `srcdoc`): origin `"null"`, no cookies or storage; the handshake result uses target
  `"*"`.
- Network: §12.

## 15. Host API (React)

`<RemoteComponent … />` host-only props: `src`, `html`, `fallback`,
`errorFallback`, `onError`, `onReady`, `timeout`, `loading`, `instanceId`,
`className`, `style`, `frameTitle`, `sandbox`, `allow`, `isolation`,
`network`, `remoteProps`, `ref`. All others are forwarded to the remote.
Exactly one of `src` and `html` is used (`html` wins). `instanceId` only
matters with `isolation="scf"` and `scf.salt: "instance"` (§4).

`<RemoteHostProvider>`: `theme`, `timeout`, `sandbox`, `allow`,
`network`, `overlayOrigins`, `overlayZIndex`, `isolation`, `scf`
(`product`, `shimDomain`, `salt`, `loadHtml`),
`dangerouslyAllowSameOrigin`.

Slot attributes for styling and tests: `data-rc-slot`, `data-rc-status`
(`idle` | `loading` | `ready` | `error`), `data-rc-revealed`.

## 16. Error codes

Kebab-case: `timeout`, `protocol`, `runtime`, `data`, `closed`,
`cancelled`, `stale-function`, `overlay`, `unsupported`, `load`,
`security`.

Fatal (host shows `errorFallback`): `timeout`, `load`, `protocol`,
`security`. Non-fatal (reported to `onError` only): `runtime` (uncaught
errors in the remote, React render errors included), `data` (a prop that
cannot be sent). The rest reject a single call.

## 17. Lifecycle

```
idle ──(visible / eager)──▶ loading ──rc/initialize──▶ (connected) ──ready──▶ ready
  ▲                            │                                           │
  └──── reload() / retry ◀─────┴──── error (timeout | load | protocol | security)
```

- `loading="lazy"`: the iframe loads when the slot comes within 200px of the
  viewport.
- Unmount: the channel closes (pending calls reject with `closed`), the
  iframe is removed.
- Load failures: if the document fires `load` but no `rc/initialize`
  arrives within 3s (the page has no runtime), error `load`. If not ready within `timeout`
  (default 10s), `timeout`.
