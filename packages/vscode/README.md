# @assistant-ui/vscode

Run [assistant-ui](https://www.assistant-ui.com/) inside a VS Code extension webview.

See the [VS Code guide](https://www.assistant-ui.com/docs/guides/vscode) for the architecture, a quick start with `npx assistant-ui create -t vscode`, and the limitations of webviews.

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

Unknown paths answer `404`, unsupported methods `405`, and a handler that throws `500`. Aborting the request in the webview aborts `req.signal` in the handler. `serveWebviewRoutes` serves routes only: host calls from `installLinkInterceptor` or `createVSCodeStorage` reject in the webview, so use [`serveWebviewHost`](#host-services) when the webview uses them.

## Webview

Pass `vscodeFetch` to any runtime that takes a `fetch`:

```tsx
import { useChatRuntime, AssistantChatTransport } from "@assistant-ui/ai-sdk";
import { vscodeFetch } from "@assistant-ui/vscode/webview";

const runtime = useChatRuntime({
  transport: new AssistantChatTransport({ api: "/api/chat", fetch: vscodeFetch }),
});
```

## Host services

`serveWebviewHost` serves the same `routes` as `serveWebviewRoutes` and also answers the webview's calls into the host. Use it in place of `serveWebviewRoutes`:

```ts
import { serveWebviewHost } from "@assistant-ui/vscode/host";

const host = serveWebviewHost(view.webview, {
  routes: { "/api/chat": { POST } },
  openExternal: (url) => vscode.env.openExternal(vscode.Uri.parse(url)),
  storage: context.globalState,
});
view.onDidDispose(() => host.dispose());
```

### External links

A webview cannot navigate away or open windows. `installLinkInterceptor()` catches clicks on absolute `http:`, `https:`, and `mailto:` links, plus `window.open` calls, and asks the host to open them with `openExternal`. The host checks the scheme again against `externalSchemes` before calling it. Relative links, `#anchors`, and clicks the app already `preventDefault`ed are left alone.

```ts
import { installLinkInterceptor } from "@assistant-ui/vscode/webview";

installLinkInterceptor();
```

### Thread persistence

`createVSCodeStorage()` stores threads in the Memento passed as `storage` (`context.globalState` or `context.workspaceState`), so they survive reloading the window. Its keys are namespaced by `storagePrefix` (default `"@assistant-ui/vscode:"`).

```tsx
import { createLocalStorageAdapter } from "@assistant-ui/core/react";
import { useRemoteThreadListRuntime } from "@assistant-ui/react";
import { AssistantChatTransport, useChatRuntime } from "@assistant-ui/ai-sdk";
import { createVSCodeStorage, vscodeFetch } from "@assistant-ui/vscode/webview";

const threads = createLocalStorageAdapter({ storage: createVSCodeStorage() });
const transport = new AssistantChatTransport({ api: "/api/chat", fetch: vscodeFetch });

const runtime = useRemoteThreadListRuntime({
  adapter: threads,
  runtimeHook: function useThreadRuntime() {
    return useChatRuntime({ transport });
  },
});
```

`acquireVsCodeApi()` may only be called once per webview. Use `getVSCodeApi()` wherever your webview code needs the API.

## Webview HTML and Content Security Policy

`renderWebviewHtml` returns the webview's HTML with a Content Security Policy, a fresh nonce on every script tag, and your bundle's URIs converted with `asWebviewUri`:

```ts
import { renderWebviewHtml } from "@assistant-ui/vscode/host";

const dist = vscode.Uri.joinPath(context.extensionUri, "dist");
view.webview.options = { enableScripts: true, localResourceRoots: [dist] };
view.webview.html = renderWebviewHtml(view.webview, {
  scripts: [vscode.Uri.joinPath(dist, "webview.js")],
  styles: [vscode.Uri.joinPath(dist, "webview.css")],
  title: "Chat",
});
```

The strict policy (the default) is:

```
default-src 'none'; script-src 'nonce-…'; style-src <cspSource> 'nonce-…';
img-src <cspSource> blob: data: https:; media-src <cspSource> blob: data: https:;
font-src <cspSource> data:; connect-src <cspSource>; frame-src 'none'
```

- `csp: "relaxed"` replaces the style nonce with `'unsafe-inline'`, for libraries that inject `<style>` tags without a nonce. Browsers ignore `'unsafe-inline'` next to a nonce, so the nonce is dropped from `style-src`. `script-src` keeps it.
- `connectSrc`, `frameSrc`, and `scriptSrc` append sources. Pass `scriptSrc: [webview.cspSource]` when your bundle loads code-split chunks with `import()`, which carry no nonce.
- `wasmUnsafeEval: true` adds `'wasm-unsafe-eval'` for WebAssembly. `'unsafe-eval'` is never added.
- `surface` sets `data-aui-vscode-surface` on `<body>` for the theme, `rootId` names the mount element (`"root"`, or `null` for none), and `scriptType: "classic"` emits deferred classic scripts instead of modules.

`createWebviewCsp(webview, { nonce })` returns only the policy, and `createCspNonce()` a nonce, if you write your own HTML.

The nonce is also written to `<meta property="csp-nonce">`, the tag Vite reads. In the webview, `getCspNonce()` from `@assistant-ui/vscode/webview` returns it for libraries that inject tags at runtime.

## Theme

`@assistant-ui/vscode/theme.css` maps the shadcn tokens used by assistant-ui's components (`--background`, `--primary`, `--muted-foreground`, `--border`, `--ring`, `--sidebar-*`, `--chart-*`, `--radius`, and the rest) to VS Code's `--vscode-*` theme variables, so the webview restyles itself when the user switches colour theme. It also re-points Tailwind's `dark:` variant at VS Code's `vscode-dark` and dark high-contrast body classes, sets `color-scheme`, uses the VS Code UI and editor fonts for `font-sans` and `font-mono`, and adds contrast borders and focus outlines under high-contrast themes.

`--muted` and `--secondary` mix 6% and 12% of `--foreground` into `--background`, because no VS Code variable stays distinct from every surface: `--vscode-input-background` equals the editor background in Light Modern, and `--vscode-button-secondaryBackground` is transparent in Dark Modern. Under high-contrast themes, `--primary` is `--vscode-textLink-foreground` with `--background` as its foreground, since Dark High Contrast sets `--vscode-button-background` to its black background, and user message bubbles, the composer quote, and the active thread in the thread list get a contrast outline.

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

VS Code injects a default stylesheet into every webview (body padding, link, `code`, `kbd` and block quote colours, focus outlines), unlayered in older releases and as `@layer vscode-default` in newer ones. The theme resets those properties in either case, so Tailwind's preflight and your utilities decide them.
