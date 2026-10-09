# generative-frame — design

Status: draft for review. Working package name `generative-frame` (free on npm), a sibling of `safe-content-frame`.

## Goal

A framework-agnostic SDK for **model-generated UI** that runs in the browser, works standalone, and plugs into assistant-ui without depending on it. It supports the mechanisms the major hosts use today, behind one host API:

| Mode | Model writes | Rendered by | Prior art |
| --- | --- | --- | --- |
| `html` | an HTML fragment or document, streamed | the in-frame runtime, inside Safe Content Frame | Claude `show_widget`, T3 Code `html_render`, Claude artifacts |
| `svg` | an SVG document, streamed | same as `html` | Claude `show_widget` |
| `spec` | a declarative JSON spec (JSONL patches) against a catalog | trusted host components (no frame) | Vercel json-render, A2UI, ChatKit widgets, OpenUI |

Every `html`/`svg` widget runs in a Safe Content Frame (its own site via the Public Suffix List). The frame speaks the **MCP Apps `ui/*` JSON-RPC protocol** over a private `MessagePort`, so widgets written for MCP Apps hosts (ChatGPT, Claude, VS Code, T3 Code) work, and so do Claude-style (`sendPrompt`) and OpenAI-style (`window.openai`) widgets through compatibility shims.

Later: the same tool, prompt, and repair machinery can back an Assistant Cloud API (server-side preview and screenshots in a headless browser). Out of scope for this package's first version.

## Constraints from research

- Safe Content Frame's shim is external and fixed: content is posted once and shown from a Blob URL; every `renderHtml` makes a new frame and, by default, a new origin. So streaming cannot re-render through SCF. Instead, render a **bootstrap document once** (the in-frame runtime) and stream content to it over a `MessageChannel` port transferred with `rendered.sendMessage(init, [port2])`.
- A cross-origin frame cannot be captured by the host. Screenshots are taken **inside the frame** (SVG `foreignObject` serialization → canvas → PNG) and posted out.
- A CSP `<meta>` injected into the bootstrap is enforced even if the widget tries to remove it. Default: `connect-src 'none'`, scripts/styles/images/fonts only from an allowlist (cdnjs, jsdelivr, unpkg, esm.sh by default), `form-action 'none'`.
- Scripts must not run on partial markup: they are held and executed in document order once the stream completes.

## Packages and entry points

`packages/generative-frame` (MIT, ESM, built with `aui-build`, only dependency `safe-content-frame`):

- `generative-frame` — core, framework-agnostic:
  - `createWidget(options) → WidgetHandle`: mounts a frame in a container. `write(chunk)`, `end()`, `replace(code)`, `setTheme(tokens)`, `setContext(partial)`, `screenshot()`, `inspect()` (errors, console, size, last code), `on(event, fn)`, `dispose()`.
  - Host handlers: `onPrompt(text)`, `onOpenLink(url)`, `onCallTool(name, args)`, `onMessage`, `onRequestDisplayMode`, `onUpdateModelContext`, `onResize`, `onError`.
  - `runtime`: the in-frame runtime as a string (bundled at build time), plus `buildBootstrapHtml({ csp, tokens, compat })`.
  - Theme: `readThemeTokens(element)` reads host CSS custom properties; `toMcpAppsVariables(tokens)` maps to the MCP Apps standard names (`--color-background-primary`, `--color-text-primary`, `--font-sans`, `--border-radius-md`, …). Both sets are applied in the frame.
- `generative-frame/tools` — model-facing tools, provider-agnostic (JSON Schema + `execute`), plus adapters for the AI SDK tool shape:
  - `read_me({ modules, platform })` → guidance text (silent, call once before the first widget).
  - `show_widget({ title, loading_messages, widget_code })` — streams into a widget (`html`/`svg` auto-detected like Claude).
  - `edit_widget({ title, edits: [{ old_string, new_string }] })` — exact string replacement on the last code of a widget, then re-render; errors if an `old_string` is missing or ambiguous.
  - `preview_widget({ widget_code, width?, appearance? })` — renders off-screen and returns `{ ok, kind, width, height, blank, errors, console, screenshot? }` for a repair loop. The assistant-ui toolkit drops the screenshot by default (stage 3).
  - `render_spec({ spec })` / JSONL SpecStream for `spec` mode.
- `generative-frame/prompts` — guidance generator: base rules (fragment vs document, CSS variables only, transparent background, no top-level padding, scripts last, CDN allowlist, accessibility), theme token list generated from the actual tokens, modules (`diagram`, `chart`, `data_viz`, `interactive`, `mockup`, `elicitation`, `art`), platform (mobile/desktop). Deterministic, snapshot-free tests.
- `generative-frame/repair` — `repairLoop({ generate, render, maxRounds })`: render → collect errors/console/blank-render detection (+ optional screenshot) → feed back as the tool result → re-generate or `edit_widget`.
- `generative-frame/agent` — **delegation**: `createWidgetAgent({ model })` where `model` is a BYO streaming completion function; exposes one tool `generate_widget({ brief, data? })` to a main agent, runs read_me/show_widget/preview/repair internally, and streams the result into the host. Inline generation (main agent calls `show_widget` itself) is the default; delegation trades latency for a smaller main context.
- `generative-frame/spec` — declarative mode: `defineCatalog({ components, actions })` (Zod-free: JSON Schema props so it stays dependency-free; accepts Standard Schema if present), `catalog.prompt()`, `createSpecStream()` (RFC 6902 JSONL patches → flat `{ root, elements, state }` spec, json-render compatible), `$state`/`$bindState`/visibility expressions subset, action dispatch. Rendering is per framework.
- `generative-frame/react` — `<Widget code streaming theme … />`, `useWidget()`, `<SpecRenderer spec catalog components />`, `useThemeTokens()`.
- `generative-frame/assistant-ui` — optional peer `@assistant-ui/react`: toolkit entries that render `show_widget`/`edit_widget`/`render_spec` tool calls with streaming args (partial JSON), route `sendPrompt` to the thread composer, and map theme tokens from the assistant-ui theme.

## In-frame runtime

Loaded as the bootstrap document (no content yet). The shim acknowledges the render before it navigates to the Blob URL, so the host cannot know when the bootstrap is listening: the runtime posts `{ type: "genframe:ready" }` to `window.parent` (targeted at the host origin baked into the bootstrap, repeated every 100 ms until answered), and the host answers with `{ type: "genframe:init", context, compat }` plus the transferred port. The runtime then sends `genframe/ready` on the port and speaks JSON-RPC 2.0 there:

- Host → frame: `genframe/write { chunk }`, `genframe/end`, `genframe/replace { code }`, `genframe/screenshot`, `genframe/inspect`, `ui/notifications/host-context-changed`, `ui/notifications/tool-input-partial`, `ui/notifications/tool-input`, `ui/notifications/tool-result`.
- Frame → host: `ui/initialize` (returns host context), `ui/notifications/size-changed`, `ui/open-link`, `ui/message` (sendPrompt), `tools/call`, `ui/request-display-mode`, `ui/update-model-context`, `genframe/log`, `genframe/error`, `genframe/widget-state`. The host also answers the same requests when they arrive as window messages from the frame, which is how `@modelcontextprotocol/ext-apps` widgets talk to `window.parent`.
- Streaming: accumulate the source; on each chunk (rAF-batched) parse the partial markup into a detached template (the parser auto-closes open tags), strip `<script>`s, and **morph** the live root (keyed by position + tag, attributes and text patched in place, new nodes get a short fade-in). On `end`, run held scripts in order (inline and `src`, awaiting each), then report final size.
- Globals for widgets: `genframe` (canonical API), `sendPrompt(text)` (Claude compat), `window.openai` subset (`theme`, `toolInput`, `toolOutput`, `widgetState`, `setWidgetState`, `callTool`, `sendFollowUpMessage`, `openExternal`, `requestDisplayMode`, `openai:set_globals` events) when `compat: ["openai"]`, and the MCP Apps bridge (`ui/*`) for `@modelcontextprotocol/ext-apps` widgets.
- Theme: tokens applied as CSS custom properties on `:root`, `color-scheme`, `prefers-color-scheme` override; `themechange` event.
- Size: `ResizeObserver` on the root → `size-changed` (debounced, rounded).
- Diagnostics: `window.onerror`, `unhandledrejection`, `console.*` (bounded buffer), blank-render detection (zero-size root after end), CSP violations (`securitypolicyviolation`).
- Screenshot: clone root, inline computed styles, embed fonts best-effort, serialize into SVG `foreignObject`, draw to canvas at devicePixelRatio, return PNG data URL.

## Prompt and tool design principles

- `read_me` is lazy and modular (Claude's pattern): small base rules always, modules on demand.
- Widgets are fragments by default (transparent background, inherit host typography via tokens); documents allowed for `preview_widget` and artifacts.
- Order: style → markup → script, so streaming shows structure early.
- Edits are exact string replacements (cheap, reviewable) with full re-emit as fallback.
- Repair loop feeds back **structured** errors (message, line, console excerpt, blank-render flag) and optionally a screenshot; bounded rounds.

## Standalone first

Nothing in the core imports assistant-ui. The React binding depends only on React. The assistant-ui entry is optional and thin.

## Open questions (for the maintainer)

1. Ship `generative-frame` as an unscoped package (like `safe-content-frame`) or as `@assistant-ui/generative-frame`?
2. Should the `spec` mode reuse assistant-ui's `JSONGenerativeUI` vocabulary in the assistant-ui entry, or only the json-render-style catalog?
3. Is an Assistant Cloud endpoint for server-side preview/screenshot (headless Chromium) wanted next?
4. Could the SCF shim gain a streaming bootstrap mode, removing the extra hop?

## Stage 1 implementation notes

Built: core (`createWidget`, `previewWidget`, `buildBootstrapHtml`, `buildCsp`, theme helpers, runtime), `/react`, `/tools`, `/prompts`, `/repair`. Stage 2 added the rest; see below.

Deviations from the sections above, with reasons:

- **Runtime bundling is a prebuild step.** `aui-build` compiles modules one by one, so `scripts/build-runtime.mjs` bundles `src/runtime` with rolldown (already in the toolchain through tsdown, now a devDependency) into a gitignored `src/runtime/generated.ts` before `build`, `test`, and `typecheck`. This is a new build step and needs maintainer sign-off.
- **Runtime scripts sit at the end of `<body>`**, after `#gf-root`, so the runtime finds its root synchronously.
- **`replace` remounts after scripts ran.** Re-running classic scripts in the same document redeclares top-level `let`/`const` and re-binds libraries to the same canvas, so `replace` morphs in place only while no script has run; otherwise it renders a new frame hidden in the same container and swaps it in when the new code has ended.
- **`screenshot()` resolves with `{ dataUrl, width, height }`** rather than a bare data URL. Web fonts loaded by URL are not embedded: fetching them would need `connect-src`, which stays `'none'` by default.
- **Preview frames stay inside the viewport** (fixed, opacity 0.01, behind the page). Chrome stops animation frames in cross-origin frames outside the viewport, which froze Chart.js mid-animation in screenshots.
- **The frame hides its scrollbar** unless content exceeds the host's `maxHeight` (sent as `containerDimensions.maxHeight`); otherwise the scrollbar flashes while the iframe catches up with its content and steals width.
- **The AI SDK adapter takes the SDK's `jsonSchema` helper as an argument** (`toAISDKTools(tools, { jsonSchema })`), so `ai` is neither a dependency nor a peer.
- **Widget state** (`genframe.setState`, `window.openai.setWidgetState`) is a `genframe/widget-state` notification handled by `onWidgetState`.
- **Streaming morph** matches children by position, tag, and `id`, with one node of lookahead for single insertions and deletions. A trailing unclosed `<style>` is held back until it closes. After held scripts run, the runtime dispatches `DOMContentLoaded` and `load` once, for widgets written for a fresh page.


## Stage 2 implementation notes

Built: `spec` (+ `SpecRenderer`/`useSpecStream` in `/react`, `render_spec` and the `spec` read_me module in `/tools`), `agent`, and `assistant-ui`. Also fixed in-frame screenshots clipping the right edge.

Deviations and decisions:

- **Screenshot defaults come from a shadow root.** Default styles used to be probed in the frame document, so rules such as `*{box-sizing:border-box}` and element margins counted as defaults and were dropped from the clone, which then grew past the right edge. Probes now live in a closed shadow root that document rules cannot reach, and the capture is the root's full scroll size at its layout width.
- **Spec format.** Elements are `{ type, props, children, slots?, visible?, repeat: { path, key? }, on: { event: action }, watch: { pointer: action } }`. Named slots are an addition; `"default"` is `children`. Catalog components declare `slots` and `events`, so the validator can reject children and event bindings a component does not support. Patch lines may also be an array of operations or a whole spec. Bad lines are skipped and reported rather than aborting the stream. In inline mode, patches sit in a ```spec fence or on bare `{"op"` lines.
- **Expressions** add `$bindItem` (two-way binding inside `repeat`) and `$event` (the payload of the event that triggered an action) to the json-render-style set. Templates use `${/pointer}`. Unknown condition shapes evaluate to false, so half-streamed conditions hide rather than throw.
- **State.** `createStateStore().seed(state)` replaces the model-provided base and re-applies user writes, so state streamed later never discards what the user changed.
- **Validation is JSON Schema only, in-house.** A small validator covers the subset the catalog needs; expression values are placeholders. A Standard Schema is used through its own `validate` (skipped when a value contains an expression) and its `~standard.jsonSchema` for prompts.
- **`render_spec` input** is `{ title, patches?, spec? }`. Patches on a known title apply to that title's previous spec, which makes repairs small; the result carries `issues` and a `feedback` text.
- **The agent** owns its loop rather than reusing `repairLoop`, because it must stream tool-call deltas into the sink while the model writes and forward feedback as tool results. Only the first `show_widget` streams; later full re-emits replace once complete, since a frame cannot restart a stream after its scripts ran. Without a `preview`, it checks the sink's `inspect()` after `settleMs`. `tools` takes a `createWidgetTools()` instance (to share the registry and catalog) and `extraTools` adds data tools; the brief named `tools?` in the original sketch maps to these two.
- **Tool-call deltas** are parsed with a small partial JSON parser in `/agent`, keeping the package dependency-free instead of importing `assistant-stream`.
- **assistant-ui.** `createWidgetToolkit()` returns `{ toolkit, tools, registry }` with frontend toolkit entries by default (`execution: "backend"` renders only). Renderers derive their state from the thread (`resolveWidgetCode`, `resolveSpecBase`) instead of the in-memory registry, so edits and spec patches render after a reload; the registry is synced from rendered calls so `edit_widget` executes after a reload too. Theme tokens are read shadcn-first because Tailwind v4 aliases `--color-accent` to shadcn's muted `--accent`. Bare HSL channels from older shadcn themes are wrapped in `hsl()` in core. Instructions go through `useAssistantInstructions`; servers can use `getToolDeclarations` and `buildWidgetInstructions` from `/tools`.
- **Demo.** The demo pre-bundles `@assistant-ui/react` in Vite, because workspace packages are not pre-bundled and `@assistant-ui/tap`'s React shim re-exports CommonJS React. `LocalRuntime` adapters run frontend tools themselves, so the fake adapter in the thread demo executes `context.tools` before ending with `requires-action`.

## Stage 3 implementation notes

Built: the landing page at `/generative-frame` and the docs site at `/generative-frame/docs` in the docs app; live render reports and `preview_widget` in the assistant-ui toolkit.

- **Render reports.** The toolkit renders frames with `useWidget` directly instead of `<Widget>`, so each tool call's frame can report its first `end` (after `settleMs`) to the `show_widget` or `edit_widget` call waiting on the same `toolCallId`. A report that arrives before `execute` waits is kept briefly; a call whose frame never renders resolves with `status: "timeout"` after `timeoutMs`.
- **`preview_widget` in the toolkit** drops the screenshot by default and adds `feedback` text, because frontend tool results reach the model as JSON.
- **Size reports skip zero-width layouts.** A frame laid out at zero width (a collapsed container, or Chrome's full-page capture) wraps its content one word per line, so the runtime reported a height of thousands of pixels and the host sized the iframe to it. The runtime now reports only while `#gf-root` has a layout width.
- **One name for patches-only output.** `catalog.prompt({ mode })` takes `"jsonl" | "inline"`, the same `SpecStreamMode` as `createSpecStream`; it was `"standalone"` before.
