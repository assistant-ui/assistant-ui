# `generative-frame`

Render model-generated HTML and SVG widgets safely while they stream. Each widget runs in a [Safe Content Frame](https://www.npmjs.com/package/safe-content-frame) on its own site, under a strict Content Security Policy, and code streams into it chunk by chunk without reloading the frame.

- **Streaming**: partial markup renders as it arrives and is morphed in place, so finished elements stay put while new ones fade in. Scripts are held and run once, in order, when the code is complete.
- **Host bridge**: widgets call `sendPrompt(text)`, `openLink(url)`, and `genframe.callTool(name, args)`. The frame speaks the MCP Apps `ui/*` JSON-RPC protocol, so MCP Apps widgets work too.
- **Theming**: your page's theme (shadcn/ui variables or the canonical tokens) becomes CSS variables in the frame, also under the MCP Apps standard names, and updates live.
- **Diagnostics**: errors, unhandled rejections, console output, failed resources, CSP violations, and blank renders, plus a PNG screenshot taken inside the frame.
- **Model side**: provider-agnostic tool definitions (`read_me`, `show_widget`, `edit_widget`, `preview_widget`, and `render_spec` from the spec entries), a deterministic guidance generator, and a repair loop.
- **Spec mode**: the model streams JSONL patches against a catalog of your own components; no frame, your design system.
- **assistant-ui**: toolkit entries that render the tool calls in a thread as their arguments stream.

Framework-agnostic; the React and assistant-ui bindings are optional.

| Entry | Contents |
| --- | --- |
| `generative-frame` | `createWidget`, `previewWidget`, theme, CSP, runtime |
| `generative-frame/react` | `<Widget>`, `useWidget`, `useThemeTokens` |
| `generative-frame/tools` | widget tools, `toAISDKTools`, `getToolDeclarations`, `buildWidgetInstructions` |
| `generative-frame/prompts` | `buildWidgetGuidance` |
| `generative-frame/repair` | `repairLoop` |
| `generative-frame/assistant-ui` | `createWidgetToolkit`, `useWidgetInstructions`, `useAssistantUiThemeTokens` |
| `generative-frame/spec` | `defineCatalog`, `createSpecStream`, `applyPatch`, `validateSpec`, expressions, state, actions |
| `generative-frame/spec/react` | `<SpecRenderer>`, `useSpecStream` |
| `generative-frame/spec/tools` | `createSpecTools` (`render_spec`), `specGuidanceModule` |
| `generative-frame/spec/assistant-ui` | `createSpecToolkit` |

The frame entries and the spec entries never import each other, so an app that only renders HTML widgets ships no spec code, and a spec-only app ships no frame, runtime, or Safe Content Frame. Combine them by passing values in, as shown under Spec mode. `src/bundle-boundary.test.ts` enforces this.

## Installation

```bash
npm install generative-frame
```

## Usage

```ts
import { createWidget, readThemeTokens } from "generative-frame";

const widget = createWidget({
  container: document.getElementById("widget")!,
  tokens: readThemeTokens(),
  onPrompt: (text) => sendChatMessage(text),
});

for await (const chunk of modelStream) widget.write(chunk);
await widget.end();
```

`createWidget` returns immediately; writes made before the frame connects are queued. The iframe resizes to its content (`maxHeight` caps it).

| Method | Purpose |
| --- | --- |
| `write(chunk)` | Append streamed code. Rendering is coalesced to animation frames. |
| `end()` | Mark the code complete, run held scripts, and resolve with `{ size, blank, errorCount }`. |
| `replace(code)` | Render new complete code. Morphs in place, or remounts the frame if scripts already ran. |
| `setTheme(tokens)` / `setContext(context)` | Update the theme or MCP Apps host context. |
| `notifyToolInput(args, { partial })` / `notifyToolResult(result)` | Forward tool data to MCP Apps widgets. |
| `screenshot()` | Capture the widget as a PNG data URL (best effort, see below). |
| `inspect()` | Errors, console, size, blank flag, kind, and the code so far. |
| `on(event, fn)` | `ready`, `resize`, `error`, `log`, `end`. |
| `dispose()` | Remove the frame. |

Pass `id` to give a widget a stable origin, so its localStorage and IndexedDB persist across reloads for that id on your site; choose it on the host, never from model output. `clearWidgetStorage(id)` wipes it. Without `id`, every frame gets a fresh origin.

Handlers: `onPrompt`, `onMessage`, `onOpenLink`, `onCallTool`, `onRequestDisplayMode`, `onUpdateModelContext`, `onWidgetState`, `onResize`, `onError`, `onLog`.

Code that starts with `<svg` renders as a standalone SVG; anything else is an HTML fragment.

### Preview

`previewWidget(code, { width, appearance })` renders complete code in a hidden frame and resolves with `{ ok, kind, width, height, blank, errors, console, screenshot }`, plus `screenshotError` when the capture failed.

### Content Security Policy

By default a frame cannot reach the network (`connect-src 'none'`), loads scripts, styles, images, and fonts only from cdnjs, jsDelivr, unpkg, and esm.sh (plus Google Fonts), and blocks form submissions and `eval`. Configure with `csp: { cdnOrigins, connectOrigins, imageOrigins, frameOrigins, allowEval }`, or pass a policy string.

## React

```tsx
import { Widget, useThemeTokens } from "generative-frame/react";

function ToolCall({ args, status }) {
  const tokens = useThemeTokens();
  return (
    <Widget
      code={args.widget_code ?? ""}
      streaming={status.type === "running"}
      tokens={tokens}
      onPrompt={(text) => composer.send(text)}
    />
  );
}
```

`<Widget>` accepts code that is complete or still growing: it writes only the new suffix, ends when `streaming` turns false, and replaces when the code is not an extension of what it has. `useWidget(options)` gives you the handle directly.

## Tools and prompts

```ts
import { jsonSchema } from "ai";
import { createWidgetTools, toAISDKTools } from "generative-frame/tools";

const tools = createWidgetTools();
streamText({ model, tools: toAISDKTools(tools, { jsonSchema }) });
```

Each tool is `{ name, description, inputSchema, execute }` with a JSON Schema input, so it adapts to any provider. `edit_widget` applies exact `old_string` → `new_string` replacements to the latest code of a widget, tracked by title in a registry, and fails without changes when a match is missing or ambiguous. `preview_widget` renders through the `preview` option, typically `previewWidget` in the browser; without it the tool returns an error result, so leave it out of tool sets that run on a server.

`generative-frame/prompts` exports `buildWidgetGuidance({ modules, platform, tokens, cdnOrigins, connectOrigins, allowEval, width, hostApi })`, which `read_me` returns: base rules, a token reference generated from your tokens, platform notes, rules that match the frame's CSP (`cdnOrigins`, `connectOrigins`, `allowEval`) and host API (`hostApi`), and modules (`diagram`, `chart`, `data_viz`, `interactive`, `mockup`, `elicitation`, `art`).

## Repair loop

```ts
import { previewWidget } from "generative-frame";
import { repairLoop } from "generative-frame/repair";

const { code, ok } = await repairLoop({
  generate: ({ feedback, previousCode }) => askModel(feedback?.text, previousCode),
  render: (code) => previewWidget(code),
  maxRounds: 3,
});
```

`generate` returns new code or `{ edits }`. Feedback lists errors with locations, a console excerpt, a blank-render flag, and optionally the screenshot.

## Spec mode

For UI built from your own components, the model writes a flat spec (`{ root, elements: { id: { type, props, children } }, state }`) as RFC 6902 JSON Patch operations, one per line, against a catalog you define. Nothing runs in a frame: your components render it.

```ts
import { defineCatalog } from "generative-frame/spec";

export const catalog = defineCatalog({
  components: {
    Card: {
      description: "A titled panel.",
      props: { type: "object", properties: { title: { type: "string" } }, required: ["title"] },
      slots: ["default", "footer"],
    },
    Button: {
      description: "A button.",
      props: { type: "object", properties: { label: { type: "string" } }, required: ["label"] },
      events: ["press"],
    },
  },
  actions: {
    refresh: { description: "Reloads the data.", params: { type: "object", properties: { range: { type: "string" } } } },
  },
});

const guidance = catalog.prompt({ mode: "inline" }); // or "jsonl" for render_spec
```

Props are JSON Schema; a Standard Schema that exposes JSON Schema (Zod 4) works too. `catalog.prompt()` documents the components, actions, the patch protocol, expressions, and rules.

```tsx
import { SpecRenderer, useSpecStream } from "generative-frame/spec/react";

const { spec, text } = useSpecStream({ source: modelOutput, mode: "inline", complete: !streaming });

<SpecRenderer
  spec={spec}
  catalog={catalog}
  components={{ Card: ({ props, children }) => <section><h2>{props.title}</h2>{children}</section>, Button: ({ props, emit }) => <button onClick={() => emit("press")}>{props.label}</button> }}
  handlers={{ refresh: ({ range }, { state }) => state.set("/rows", load(range)) }}
  streaming={streaming}
/>;
```

- **Streaming**: `createSpecStream()` (and `useSpecStream`) apply each complete line as it arrives, skip and report bad lines, and in `inline` mode separate prose from patches (in a ```spec fence or bare `{"op"` lines). Children that have not arrived render as pending; unknown types, invalid props, cycles, and components that throw render a small placeholder.
- **Expressions**: `{ $state: "/path" }`, `{ $bindState: "/path" }` (two-way, via `setProp`), `{ $template: "Hi ${/name}" }`, `{ $cond, $then, $else }`, and `$item`/`$bindItem`/`$index` inside `repeat`. `visible` takes conditions with `eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `not`, `$and`, `$or`, and arrays (all).
- **Actions**: `on: { press: { action, params } }` runs the built-in `setState` or a catalog action through your handlers; `watch: { "/path": action }` runs when a state value changes. User changes to state survive the model streaming more state.
- **Validation**: `validateSpec(spec, catalog)` returns issues with codes and JSON Pointers (`unknown-type`, `invalid-props`, `missing-child`, `cycle`, `unknown-action`, …); `formatSpecIssues` turns them into repair feedback.
- **Tool**: `createSpecTools(catalog)` from `generative-frame/spec/tools` returns `render_spec({ title, patches | spec })`, which validates and returns the issues. Patches on a title already rendered apply to that spec, so repairs are small. A spec-only app puts `catalog.prompt()` in its system prompt; next to the widget tools, compose them with `createWidgetTools({ extraTools: createSpecTools(catalog), modules: [specGuidanceModule(catalog)] })`, which also adds a `spec` module to `read_me`.

The format follows the flat-spec and JSONL-patch shape of Vercel's json-render, without depending on it.

## Delegated generation

To keep widget code out of the main agent's context, give it one tool that asks a second model for the widget and checks it with `repairLoop` and `previewWidget`. The docs have a short recipe; the package ships no agent of its own.

## assistant-ui

`generative-frame/assistant-ui` and `generative-frame/spec/assistant-ui` need `@assistant-ui/react` (an optional peer, imported only by these entries).

```tsx
import { AssistantRuntimeProvider, AuiConfig, Tools } from "@assistant-ui/react";
import { createWidgetToolkit, useWidgetInstructions } from "generative-frame/assistant-ui";
import { createSpecToolkit } from "generative-frame/spec/assistant-ui";

const widgets = createWidgetToolkit({
  widget: { maxHeight: 700 },
  spec: createSpecToolkit(catalog, { components }), // optional, from generative-frame/spec/assistant-ui
});

function Provider({ children }) {
  const runtime = useChatRuntime();
  const config = AuiConfig({ tools: Tools({ toolkit: widgets.toolkit }) });
  return (
    <AssistantRuntimeProvider runtime={runtime} config={config}>
      <Instructions />
      {children}
    </AssistantRuntimeProvider>
  );
}

function Instructions() {
  useWidgetInstructions(widgets.tools); // adds when-to-use rules to the system prompt
  return null;
}
```

- `show_widget` streams `widget_code` into a `<Widget>` from the partial tool arguments; `edit_widget` replays the edits from the thread, so history renders after a reload; `render_spec` streams patches into a `<SpecRenderer>`.
- In frontend execution, `show_widget` and `edit_widget` wait for the frame to finish rendering and return a `render` report (errors, console warnings, blank flag, height, and `feedback` text), so the model can fix a broken widget with `edit_widget`. Tune with `renderReport: { timeoutMs, settleMs }` (10000 and 300 ms by default) or turn it off with `renderReport: false`.
- `preview_widget` runs `previewWidget` in the browser. Its result leaves out the PNG unless `previewScreenshot: true`, because a base64 image in a JSON tool result is large.
- A widget's `sendPrompt(text)` appends a user message to the thread.
- Frames follow the app's shadcn/ui theme (`useAssistantUiThemeTokens`).
- The tools execute in the browser by default; the server forwards their schemas with `frontendTools(tools)` from `@assistant-ui/ai-sdk`. With `execution: "backend"`, run `toAISDKTools(createWidgetTools(), { jsonSchema })` on the server and the toolkit only renders. `getToolDeclarations` and `buildWidgetInstructions` from `generative-frame/tools` give a server the schemas and the instructions text.

## Limits

- Screenshots serialize the DOM into an SVG `foreignObject`. Web fonts loaded by URL, cross-origin images without CORS, and pseudo-elements are not reproduced, and layout can drift by a few pixels.
- A widget that changes after its scripts ran is remounted in a new frame, because classic scripts cannot be re-run in the same document.

## Development

`src/runtime` is the code that runs inside the frame. `scripts/build-runtime.mjs` bundles it into `src/runtime/generated.ts` (gitignored) before `build`, `test`, and `typecheck`. `pnpm dev` serves demos at `http://localhost:5199` (`/`, `/spec.html`, `/thread.html`, `/storage.html`); append `?auto` (and `&dark`) to run a scripted scenario, which saves screenshots and reports to `.screenshots/`. The thread demo uses recorded model streams, so they make no network model calls.
