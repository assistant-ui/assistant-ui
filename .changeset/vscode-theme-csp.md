---
"@assistant-ui/vscode": patch
---

feat: add `@assistant-ui/vscode/theme.css`, which maps the shadcn tokens used by assistant-ui's components to VS Code theme variables and points Tailwind's `dark:` variant at VS Code's dark themes, and `renderWebviewHtml` and `createWebviewCsp` in `@assistant-ui/vscode/host`, which build the webview HTML with a nonce-based Content Security Policy that `getCspNonce` reads back in the webview.
