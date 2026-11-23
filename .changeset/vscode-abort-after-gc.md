---
"@assistant-ui/vscode": patch
---

A route served by `serveWebviewRoutes` now sees `request.signal` abort when the webview aborts its fetch, even after the extension host has garbage collected the `Request`. Node's `Request` only forwards an abort while the `Request` object is still reachable, so a route that kept only `request.signal`, such as a long poll waiting for the abort, could wait forever.
