---
"@assistant-ui/core": patch
"@assistant-ui/react": patch
---

Accept `data-*` prefixed types in ThreadMessageLike content, widen BaseAttachment.type, and make contentType optional. Graceful fallback for unknown attachment and message part types.
