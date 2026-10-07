---
"@assistant-ui/vscode": patch
---

feat: add `@assistant-ui/vscode`, which runs assistant-ui inside VS Code extension webviews. `vscodeFetch` tunnels `fetch` from the webview to route handlers served by `serveWebviewRoutes` in the extension host and streams the response back.
