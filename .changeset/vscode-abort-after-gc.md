---
"@assistant-ui/vscode": patch
---

A route served by `serveWebviewRoutes` now sees `request.signal` abort when the webview aborts its fetch, even if a garbage collection runs while the route waits. Node's `Request` only forwards an abort while the `Request` object is still reachable, and the router did not keep it reachable, so a route that kept only `request.signal`, such as a long poll waiting for the abort, could wait forever.
