---
"@assistant-ui/core": patch
"@assistant-ui/react": patch
---

feat: let a tool approval request describe itself and report its outcome

an approval carries `prompt`, `display`, and `allowFreeform`, so a renderer can tell a question from a permission gate without reading provider metadata, and `ToolApprovalResponse` gains a `text` answer that resolves the request as answered rather than approved. `respondToToolApproval` now returns a promise that rejects when the runtime could not record the response, instead of the external-store runtime logging the rejection away, so a refused response leaves the request retryable.
