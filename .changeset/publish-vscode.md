---
"@assistant-ui/vscode": patch
"assistant-ui": patch
---

Publish `@assistant-ui/vscode` to npm. It runs assistant-ui in a VS Code extension webview: `vscodeFetch` tunnels `fetch` to route handlers in the extension host, and the package also opens links in the browser, stores threads in a Memento, writes the webview HTML with a nonce-based Content Security Policy, and maps the components' theme tokens to VS Code's. `assistant-ui create -t vscode` scaffolds an extension that uses it.
