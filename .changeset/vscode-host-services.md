---
"@assistant-ui/vscode": patch
---

feat: add `serveWebviewHost` and `installLinkInterceptor`, which open links clicked in the webview in the system browser through the extension host, and `createVSCodeStorage`, which persists `createLocalStorageAdapter` threads in an extension Memento such as `context.globalState`.
