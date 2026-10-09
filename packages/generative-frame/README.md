# `generative-frame`

Render model-generated HTML and SVG widgets safely while they stream. Each widget runs in a [Safe Content Frame](https://www.npmjs.com/package/safe-content-frame) on its own site, under a strict Content Security Policy, and code streams into it chunk by chunk without reloading the frame.

- **Streaming**: partial markup renders as it arrives and is morphed in place, so finished elements stay put while new ones fade in. Scripts are held and run once, in order, when the code is complete.
- **Host bridge**: widgets call `sendPrompt(text)`, `openLink(url)`, and `genframe.callTool(name, args)`. The frame speaks the MCP Apps `ui/*` JSON-RPC protocol, so MCP Apps widgets work too, and `compat: ["openai"]` adds a `window.openai` subset.
- **Theming**: your page's theme (shadcn/ui variables or the canonical tokens) becomes CSS variables in the frame, also under the MCP Apps standard names, and updates live.
- **Diagnostics**: errors, unhandled rejections, console output, failed resources, CSP violations, and blank renders, plus a PNG screenshot taken inside the frame.
- **Model side**: provider-agnostic tool definitions (`read_me`, `show_widget`, `edit_widget`, `preview_widget`), a deterministic guidance generator, and a repair loop.

Framework-agnostic; the React binding is optional.

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

Handlers: `onPrompt`, `onMessage`, `onOpenLink`, `onCallTool`, `onRequestDisplayMode`, `onUpdateModelContext`, `onWidgetState`, `onResize`, `onError`, `onLog`.

Code that starts with `<svg` renders as a standalone SVG; anything else is an HTML fragment.

### Preview

`previewWidget(code, { width, appearance })` renders complete code in a hidden frame and resolves with `{ ok, errors, console, blank, height, screenshot }`.

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
      streaming={status === "running"}
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

Each tool is `{ name, description, inputSchema, execute }` with a JSON Schema input, so it adapts to any provider. `edit_widget` applies exact `old_string` → `new_string` replacements to the latest code of a widget, tracked by title in a registry, and fails without changes when a match is missing or ambiguous. Pass `preview: previewWidget` to enable `preview_widget` in the browser.

`generative-frame/prompts` exports `buildWidgetGuidance({ modules, platform, tokens, cdnOrigins })`, which `read_me` returns: base rules, a token reference generated from your tokens, platform notes, and modules (`diagram`, `chart`, `data_viz`, `interactive`, `mockup`, `elicitation`, `art`).

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

## Limits

- Screenshots serialize the DOM into an SVG `foreignObject`. Web fonts loaded by URL, cross-origin images without CORS, and pseudo-elements are not reproduced, and layout can drift by a few pixels.
- A widget that changes after its scripts ran is remounted in a new frame, because classic scripts cannot be re-run in the same document.

## Development

`src/runtime` is the code that runs inside the frame. `scripts/build-runtime.mjs` bundles it into `src/runtime/generated.ts` (gitignored) before `build`, `test`, and `typecheck`. `pnpm dev` serves a demo at `http://localhost:5199`; append `?auto` to run the scripted scenario, which saves screenshots to `.screenshots/`.
