# @assistant-ui/vscode

Run [assistant-ui](https://www.assistant-ui.com/) inside a VS Code extension webview.

A webview cannot reach your backend with `fetch`, so this package tunnels `fetch` over the webview's `postMessage` channel. Your route handlers (`(req: Request) => Response`) run unchanged in the extension host, and their responses stream back to the webview.

## Entry points

- `@assistant-ui/vscode/host` runs in the extension host. It never imports the `vscode` module.
- `@assistant-ui/vscode/webview` runs in the webview bundle.

## Extension host

```ts
import { serveWebviewRoutes } from "@assistant-ui/vscode/host";
import { POST } from "./api/chat";

export function resolveWebviewView(view: vscode.WebviewView) {
  view.webview.options = { enableScripts: true };
  const server = serveWebviewRoutes(view.webview, {
    "/api/chat": { POST },
  });
  view.onDidDispose(() => server.dispose());
}
```

Unknown paths answer `404`, unsupported methods `405`, and a handler that throws `500`. Aborting the request in the webview aborts `req.signal` in the handler.

## Webview

Pass `vscodeFetch` to any runtime that takes a `fetch`:

```tsx
import { useChatRuntime, AssistantChatTransport } from "@assistant-ui/react-ai-sdk";
import { vscodeFetch } from "@assistant-ui/vscode/webview";

const runtime = useChatRuntime({
  transport: new AssistantChatTransport({ api: "/api/chat", fetch: vscodeFetch }),
});
```

Or use `useLocalRuntime` with `createVSCodeModelAdapter()`. It posts the thread (`messages`, `system`, and the JSON schemas of `tools`) to `/api/model`, and the route answers with `createAssistantStreamResponse` from `assistant-stream` or an AI SDK UI message stream response:

```tsx
import { useLocalRuntime } from "@assistant-ui/react";
import { createVSCodeModelAdapter } from "@assistant-ui/vscode/webview";

const adapter = createVSCodeModelAdapter();
const runtime = useLocalRuntime(adapter);
```

`acquireVsCodeApi()` may only be called once per webview. Use `getVSCodeApi()` wherever your webview code needs the API.

## Theme

`@assistant-ui/vscode/theme.css` maps the shadcn tokens used by assistant-ui's components (`--background`, `--primary`, `--muted-foreground`, `--border`, `--ring`, `--sidebar-*`, `--chart-*`, `--radius`, and the rest) to VS Code's `--vscode-*` theme variables, so the webview restyles itself when the user switches colour theme. It also re-points Tailwind's `dark:` variant at VS Code's `vscode-dark` and dark high-contrast body classes, sets `color-scheme`, uses the VS Code UI and editor fonts for `font-sans` and `font-mono`, and adds contrast borders and focus outlines under high-contrast themes.

Import it after Tailwind:

```css
@import "tailwindcss";
@import "tw-animate-css";
@import "@assistant-ui/vscode/theme.css";
```

If you keep an existing `globals.css` (such as the one from the assistant-ui templates), import the theme at the end of the file instead. Tailwind keeps the last `@custom-variant dark` and the last `@theme` value for a key, so a theme imported above the template's own `@custom-variant dark (&:is(.dark *))` and `--font-sans` leaves those in charge. The colour tokens are set on `body`, so they override a template's `:root` values in either position.

To override a token, set it on `body`:

```css
body {
  --radius: 0.25rem;
}
```

The background follows a webview view in the sidebar by default. Set `data-aui-vscode-surface` on `<html>` or `<body>` to `"editor"` for a webview panel in an editor tab, or to `"panel"` for a view in the bottom panel.

VS Code injects a default stylesheet into every webview (body padding, link and `code` colours, focus outlines). The theme hands those properties back to Tailwind's layers.
