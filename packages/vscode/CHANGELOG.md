# @assistant-ui/vscode

## 0.0.1

### Patch Changes

- [#10329](https://github.com/assistant-ui/assistant-ui/pull/10329) [`ec8321b`](https://github.com/assistant-ui/assistant-ui/commit/ec8321b0f16aa40d03ee51195bace46e43075a27) - Publish `@assistant-ui/vscode` to npm. It runs assistant-ui in a VS Code extension webview: `vscodeFetch` tunnels `fetch` to route handlers in the extension host, and the package also opens links in the browser, stores threads in a Memento, writes the webview HTML with a nonce-based Content Security Policy, and maps the components' theme tokens to VS Code's. `assistant-ui create -t vscode` scaffolds an extension that uses it. ([@bnb](https://github.com/bnb))
