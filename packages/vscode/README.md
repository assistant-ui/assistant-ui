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
