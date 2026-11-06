# Design

Why remote components are shaped the way they are. SPEC.md is the
normative protocol; this file is the rationale.

## 1. The page is the component

A remote component is an iframe that behaves like inline content. Strip
the protocol down and ask, for each thing it carries, whether the host can
do it from outside the frame or whether something inside has to
cooperate:

| Capability | From outside? | Why |
| --- | --- | --- |
| Isolation (sandbox, origin, CSP) | Yes | Attributes on the iframe, response headers, or the SCF shim. |
| Network policy | Yes | CSP `connect-src`, from the serving layer or the host. |
| Width | Partly | The host sizes the iframe, but frame viewports are whole pixels. Fractional width and sub-pixel offset need a script inside. |
| Height, intrinsic widths | No | A cross-origin document's size cannot be read from outside. This alone makes a runtime necessary. |
| Theme | No | Styles do not cross a document boundary; only `color-scheme` on the iframe does. |
| Props, callbacks, overlays | No | They need a channel and someone at the other end. |
| Focus | Partly | Native Tab crosses frames in some engines; the edge cases need the inside. |

So the floor is one script inside the document, and nothing that makes a
remote look inline can be done from outside, while everything that makes
it safe can. That split is the design:

- **Isolation from outside.** Sandbox, origin, CSP and network policy are
  set by the host and the serving layer. The page is never trusted with
  them.
- **Everything else from one runtime.** Layout, theme, props, focus and
  overlays come from `rc-runtime.js`. The author writes no glue.
- **The document is the component.** Version 1 compiled a React component
  into a document of our own and mounted it in `#rc-root`. Version 2 has no
  inner root: any HTML document with the runtime is a remote, and
  `<html>` is the slot. What an LLM writes (a page, often without a
  doctype, sometimes a fragment), what a developer builds (any SPA) and
  what a compiler emits are all the same kind of thing.
- **Web APIs first, and as few of ours as possible.** The page API is
  `rc.props`, `rc.overlay()` and two events on `rc`. Anything the platform
  already does (storage, network limits, which sites may embed a page)
  stays the platform's: a page uses `localStorage` (where its origin has
  one), its own CSP `<meta>`, and the server's `frame-ancestors`. React
  hooks and the Vite plugin are thin optional packages on top.

The research behind this (branch `research/html-first`, HTML-FIRST.md)
ran the whole layout suite with every remote replaced by a page, and 47
arbitrary pages (36 written by an LLM) through the runtime. The numbers
for the shipped design are in SCORE.md.

### Packages

| Package | Role |
| --- | --- |
| `@assistant-ui/remote-components-runtime` | `rc-runtime.js` and its lazy chunks; the same code as ESM. Everything inside the frame. No framework. |
| `@assistant-ui/remote-components-serve` | The serving layer: `normalizeHtml` (doctype, runtime tag, CSP), a Node middleware. Used by widget servers, the Vite plugin and the host. |
| `@assistant-ui/remote-components-host-react` | `<RemoteComponent src \| html>`, provider, overlays. |
| `@assistant-ui/remote-components-react` | Optional hooks over `window.rc`. |
| `@assistant-ui/remote-components-vite` | Optional: runtime tag in `index.html`, component files as pages, single-file builds. |
| `@assistant-ui/remote-components-protocol` | Messages, value codec, channel, validation. No DOM. Internal: pages never see it. |

## 2. Layout: the invisible boundary

Reference model: a remote behaves like its content inside
`<div style="display:flow-root; height:100%">` placed in the slot. The
remote's `<html>` is that block: the root element already establishes a
block formatting context, so it needs no wrapper. Every decision below
exists to make the model true to the pixel.

1. **`<html>` is the slot.** The runtime writes width, height, offset,
   margin, padding, border, overflow, `zoom` and `transform` on `<html>`
   with `!important`, and nothing else. Author rules on `html`
   (`height: 100%`, `min-height: 100vh`) lose; author rules everywhere else
   win. The research showed the suite passes with `<html>` as the root, so
   `#rc-root` bought nothing but a contract every page had to follow.
2. **Intrinsic sizes.** CSS has no way to give an iframe arbitrary
   min/max-content contributions. The host's sizer does it with a
   *compressible replaced element* (a canvas with `width: max-content;
   max-width: 100%`, whose min-content contribution is 0) plus
   `min-width: min-content`. Verified in every flex/grid/float/fit-content
   context (spikes/).
3. **Exact width.** Browsers round an iframe's viewport to whole pixels, so
   the page never lays out against its viewport: the host sends the exact
   fractional width and the runtime puts it on `<html>`.
4. **Sub-pixel placement.** A frame is painted at a snapped position;
   inline text at fractional positions is not. The host anchors the iframe
   on a grid line that is whole CSS px and whole device px at or before the
   slot corner and sends the remainder; the runtime offsets `<html>` by it.
5. **One-pass measurement** of height, min-content and max-content, by
   restyling `<html>` synchronously and restoring it: no paint in between,
   so no flicker.
6. **Height constraints.** The sizer's `min-height` is the content height
   and its `height: 100%` lets a definite host height win; the host sends
   that height so percentage heights resolve. `body { height: 100% }` and
   the same for `#root`/`#app`/`#__next`, at zero specificity, carry it to
   the content (the research's plain React variant went from 92 to 100 of
   104 with it).
7. **The slot is the viewport.** In an auto-height frame the viewport *is*
   the content, so `min-height: 100vh` means "as tall as I already am" and
   grows by the frame's rounding slack forever. Without the CSS shim, 11 of
   35 pages in the research corpus looped, every page that used `vh`. The
   shim rewrites `vh` to the slot's height, or to `auto` for sizing
   properties when the height is auto. Models write pages as if they owned
   a browser window; with the shim those pages behave as widgets without
   the model knowing it is in one.
8. **Host containers.** A page can only be a query container of its own
   size, because its root *is* the slot. When the slot is the host's
   nearest container, `<body>` is made one (the root element does not
   match `@container` in Chromium). When the slot sits in a wider
   container, the runtime emulates it: container units read variables with
   the host container's size, and each `@container` rule gets a twin
   `@media` rule that the runtime switches on when the browser, testing a
   hidden probe of the host container's size, says the condition holds.
   The emulation loads only for pages that need it.
9. **Quirks mode.** No doctype means quirks mode, where an `auto`-height
   `<html>` fills the viewport: the same loop through a different door. The
   serving layer adds the doctype; for a tag the author placed, the runtime
   uses `max-content` instead of `auto`.
10. **Ready cannot wait for animation frames.** Chromium gives a hidden
    cross-origin frame no `requestAnimationFrame`, and the host keeps the
    frame hidden until ready. Ready is `load` (or DOMContentLoaded + 1.5s)
    plus two tasks, then fonts. There is one mode: a page never says when
    it is ready. The Vite plugin's React pages commit their first render
    synchronously on the first `props-changed`, which lands before those
    two tasks.
11. **What does not cross:** baselines, overflow past a constrained height,
    LCD text anti-aliasing (impossible over transparency), `position: fixed`
    escaping the slot.

## 3. Functions across the boundary

Functions are addressed by `(scope, path)` and resolved against the latest
value of their scope (latest-ref). This removes reference counting and leak
risk, makes inline arrow props free (no message on re-render), and keeps
proxies stable for `useEffect` dependencies. The cost: a function's identity
is its position, so moving a callback to a different prop path is a new
function, and calling a removed prop fails with `stale-function`.

Functions in call arguments and results are rejected (no callable
capability smuggling; no lifetime problem).

## 4. Overlays

Rendered by the host in a portal: they cannot escape the iframe otherwise.
The overlay content is itself a remote component: a URL (same origin by
default) or an HTML document the host shows like its `html` prop, so a
page can keep its menu in a string. Menus and dialogs get layout
passthrough and theming for free, and their
callbacks route back to the owner remote through the host (scope
`overlay:<id>`). A page-wide stack handles Escape, outside pointer-downs
(reported by every remote, since clicks inside iframes never reach the host
document), nesting, modality (`inert`) and focus restore.

## 5. Page API: props, overlays, two events

`window.rc` is an `EventTarget` with `props` and `overlay()`. Changes are
events on it, `props-changed` and `theme-changed`, with no payload: the
listener reads `rc.props` or re-reads computed styles. That is how the
platform does it (`MediaQueryList`, `navigator.connection`): no custom
subscription API, `{ signal }` removes a listener, and `window`'s event
namespace stays clean.

The first `props-changed` fires when the host has connected **and** the
document is parsed. Until then `rc.props` is an empty frozen object. A
page cannot know whether the host connected before its script ran, so the
runtime makes sure it did not: every script in the document, deferred and
module scripts included, has run before the first event. The idiom is
"render `rc.props`, then listen", and it never misses an update.

The host↔runtime protocol is private. Pages get these two events, never
messages, so the wire can change without touching pages.

What the page API leaves out, on purpose:

- **Host state.** The host used to persist a key-value store per
  `instanceId`. A host that wants to keep a widget's data passes it as a
  prop and takes changes through a callback prop, like any React
  component. Pages on their own origin (or an SCF origin with a stable
  salt) can use `localStorage`.
- **Declarative attributes** (`data-rc-text`, `data-rc-action`, …). A few
  lines of script do the same, and models write that script anyway.
- **Ready and fail.** Every page is revealed the same way (§2.10).
  Uncaught errors are reported as non-fatal `runtime` errors; the host
  decides what to show.
- **Document options** (`<meta name="rc-*">`, attributes on the tag). The
  CSS shim is always on. A page narrows its network with a CSP `<meta>` of
  its own, which browsers enforce next to the host's. Which hosts may
  embed a page is the CSP `frame-ancestors` header from the serving layer
  (`frameAncestors`), which the browser enforces before any script runs.
- **MCP Apps bridge.** See §7.

## 6. Network

Version 1 gave remotes no network at all (`connect-src 'none'`) and relayed
`fetch` through the host after the user approved each declared origin.
Version 2 drops the relay.

- **Public by default.** Remotes fetch public `https`/`wss` endpoints
  directly. A weather widget calls the weather API; nothing in between.
  CSP is `connect-src https: wss:`.
- **No host relay, no host credentials.** The host never fetches for a
  remote and never attaches its cookies or tokens. A remote runs on its own
  origin (no host cookies) or an opaque one (no cookies). Anything that
  needs the host's data or the user's authority is a prop or a host
  callback, which the host implements and authorizes like any API.
- **The host can lock it down.** `network="none"` or an allowlist. For
  documents the host shows (`html`, SCF) it writes the CSP itself. For URL
  remotes it sets `<iframe csp>`, which the serving layer accepts
  (`Allow-CSP-From: *`); only Chromium enforces that attribute, so on other
  engines a URL remote's network is what its server's CSP says.
- **A page can narrow, never widen.** A page's own
  `<meta http-equiv="Content-Security-Policy" content="connect-src …">` is
  enforced next to the host's policy; the browser applies both.
- **The trade-off.** With network on by default, a remote can send its
  props to any public endpoint. Version 1 made that an explicit
  user decision. Version 2 treats remote code like a third-party script
  embed: give it data only if you would give that publisher the data, and
  turn the network off (`network="none"`) for code you do not trust with
  it, such as strangers' widgets. CSP cannot express address ranges, so
  private and loopback addresses are reachable by `https:` too; they get
  no host credentials, and Chromium's Private Network Access blocks public
  frames from reaching private addresses. THREAT_MODEL.md B7.

## 7. Relationship to safe-content-frame, generative-frame and MCP Apps

- **safe-content-frame** (SCF) renders content bytes in a sandboxed iframe
  on `https://<hash(product, salt, hostOrigin)>-h184756.scf.auiusercontent.com`,
  a Public Suffix List domain, so every hashed subdomain is its own site.
  It is a first-class way to show a remote: `isolation="scf"` with `src`
  (the host fetches the page and adds `<base href>` so relative URLs still
  reach the widget server) or with `html`. Salt `rc:v2:<publisher>` by
  default, so each publisher gets one origin; `salt: "instance"` adds the
  `instanceId`, so each instance keeps its own origin and storage. The
  same rules apply as for any other frame: runtime inlined, doctype, CSP.
- **generative-frame** streams model-written HTML into an SCF frame with
  its own bootstrap document and JSON-RPC. With version 2 the two
  converged: a model's page *is* a remote, the runtime is the bootstrap,
  and the rules generative-frame needed to avoid sizing bugs ("never
  100vh", "no fixed at the top level") become advice, because the runtime
  handles them. The canonical theme tokens (`--color-text`,
  `--color-surface`, `--radius-md`, …) are the same.
- **MCP Apps.** The wire borrows its shape: JSON-RPC 2.0 envelopes,
  `rc/initialize` like `ui/initialize`, `rc/notifications/size-changed`
  like `ui/notifications/size-changed`, kebab-case names. The `rc/` prefix
  keeps anything from being mistaken for real MCP. Params and results
  still cross by structured clone (functions as paths, `Date`, `Map`),
  which MCP Apps' JSON does not need; the envelope does not care. Version
  2 also bridged to MCP Apps hosts (`ui/initialize` probing, `rc.mcp`,
  token aliases). It is gone: an MCP App gets tool input as JSON and has
  no layout passthrough, overlays or callbacks, so a page written for one
  is a different page. Version 3 keeps one host model.

## 8. Runtime delivery

- One classic script, `rc-runtime.js`, versioned with the package and
  served from the widget origin, so every remote from that origin shares
  one cached copy. A classic script in `<head>` runs before the body is
  parsed: the handshake starts at once, and streaming pages are sized as
  they arrive. (A module script would wait for the whole document.)
- Three ways in, one file: the author's tag, the serving layer, or the
  host (inlined into `srcdoc`/SCF documents; a blob or `srcdoc` document
  cannot load a relative script).
- Rarely used parts load on first use from the same directory: overlays
  and host container emulation. Size (SCORE.md): about 11 KB gzip for the
  core, against 13.9 KB gzip that version 1's runtime added to every
  compiled React bundle. The core is mostly the protocol
  (channel, codec, validation), focus handling and the CSS shim.
- Bundled apps import `@assistant-ui/remote-components-runtime`; the Vite plugin points
  that import at the tag's `window.rc` so it is not loaded twice.

## 9. Conformance environment

Headless browsers on the macOS host produce no animation frames while the
display sleeps (rAF and ResizeObserver never fire), which makes layout tests
meaningless. The suite runs in the official Playwright Linux image through
Docker/OrbStack; all servers run inside the container.

## 10. What version 2 removed

- `mount()`, `#rc-root`, `BASE_CSS`, `ensureDocument`: the page is the
  component.
- `@remote-components/remote`: split into `@assistant-ui/remote-components-runtime`
  (no React) and `@assistant-ui/remote-components-react` (hooks only).
- Host-proxied network: `net.fetch`, `useHostFetch`, `approveNetwork`,
  `NetworkBroker`, `dataProps`, `hello.network` (§6).
- `useRuntime()` and the `RemoteRuntime` class as public API: `window.rc`
  is the API.
- The `tab` capability (every version-2 host handles Tab), the faked query
  containers on `<html>`/`<body>` (emulated instead, §2.8), client-side
  state limit checks (the host is authoritative), `scf.csp` (the network
  policy is the CSP), the Vite plugin's `connectSrc` option and its
  `mount()` entry.
- Protocol version 1.

## 10b. What version 3 removed

Version 3 cuts the page API to `rc.props`, `rc.overlay()` and two events
(§5). Removed, with no compatibility:

- The MCP Apps bridge: `rc-mcp.js`, `ui/initialize` probing, `rc.mcp`,
  `rc.host`, `useMcpApp`, the MCP token aliases.
- Declarative attributes: `data-rc-text`, `-show`, `-action`, `-args`,
  `-submit`, `-state`, and `rc-declarative`.
- `rc.ready()`, the `rc-ready` / `data-ready` modes (`manual`, `stream`),
  `rc.fail()` and the `render` error code.
- Host state: `rc.state`, `useRemoteState`, the `state.*` messages, the
  stores (`createMemoryStore`, `createLocalStorageStore`,
  `createHttpStore`), `RemoteHostProvider` `store` / `stateLimits`, and
  the `state` error code. `instanceId` stays only for SCF instance salts.
- Duplicates: `rc.call`, `rc.on`, `rc.connected`, `rc.theme`,
  `rc.version`, the `rc:*` window events, `useRemoteProps` (now
  `useProps`), `useHostTheme`, `useColorScheme`, `useRemoteReady`.
- Document options: every `<meta name="rc-*">` and every `data-*` option
  on the runtime tag (`rc-viewport`, `rc-network`, `rc-hosts`), and the
  Vite plugin's `allowedHostOrigins`.
- The wire envelope `{type, …}` / `{type:"req"}` and the `$rc` handshake:
  now JSON-RPC (§7). Protocol version 2.

## 11. Per-publisher origins without SCF

SCF gives each publisher a hashed origin on a shared shim domain. A host
can get the same separation on its own infrastructure with one wildcard
subdomain per publisher. This section is the design; nothing in the
packages depends on it, and the demo does not implement it (see the end).

### When it matters

With an opaque sandbox (no `allow-same-origin`, the demo's default) every
frame already has its own opaque origin, with no cookies, no storage and
no access to other frames, so publishers can share one server origin.

Per-publisher origins matter once remotes run with `allow-same-origin`:
they get origin storage (IndexedDB, caches, a service worker) and can
reach each other's same-origin frames through `window.parent.frames`. Two
publishers on one origin could read each other's data. The host's own
policy also keys on the remote origin (`overlayOrigins`), so separate
origins also keep publishers apart there.

### Setup

```
*.rc.example-usercontent.net   wildcard DNS → one remote server
                                wildcard TLS certificate
https://<label>.rc.example-usercontent.net/<component>/
label = lowercase base32(sha256("rc:v1:" + publisherId))[0:26]
```

- The host's registry maps a publisher to its label and builds `src`. The
  label is one DNS label, stable, and reveals nothing about the publisher.
- The remote server routes by `Host`. A label serves only its publisher's
  components and answers 404 for anything else. If it served every
  component on every label, any publisher's code could run on any origin.
- Each response sends a strict CSP (`default-src 'none'` plus what the
  document needs, `connect-src` from the network policy) and `frame-ancestors` with the hosts allowed to embed it.
- The domain is used for nothing else. No cookies are ever set on the
  parent domain, and HSTS (`includeSubDomains`) is on.
- The host page allows the domain in its own CSP: `frame-src
  https://*.rc.example-usercontent.net`.

### Public suffix requirement

Browsers group origins by site (scheme plus registrable domain), and the
registrable domain comes from the Public Suffix List. Without a PSL entry,
`a.rc.example-usercontent.net` and `b.rc.example-usercontent.net` are the
same site, `example-usercontent.net`. Different origins still separate
storage and DOM access, but same-site origins:

- can set cookies for each other (`Domain=example-usercontent.net`, cookie
  tossing), and `SameSite` treats them as one party;
- may share a renderer process, since site isolation works per site. Code
  in one could read the other's memory through a Spectre-style side channel;
- could relax to a common `document.domain` in browsers that still allow it.

So the domain, or a dedicated subdomain of it, goes on the PSL's private
section, like `googleusercontent.com`. Then each label is its own site:
separate cookie jars and processes. A PSL change ships with browser
releases, which takes months. Until then, use a dedicated registrable
domain per trust level, or keep `allow-same-origin` off.

Local development needs no PSL entry. `localhost` is not on the list, so by
the default rule each `<label>.localhost` is its own site. Chromium and
Firefox resolve `*.localhost` to loopback; Safari may need a hosts entry.
A Tailscale name (`host.tailnet.ts.net`) has no wildcard DNS or
certificate, so it cannot serve publisher subdomains.

### Why the demo does not do this

The demo keeps the opaque sandbox, where this adds nothing, and it is
often reached over Tailscale, where wildcard subdomains do not resolve. With
`WIDGET_ISOLATION=scf` the Extensions example already gives each publisher
its own SCF origin (`scf.salt` returns the publisher).
