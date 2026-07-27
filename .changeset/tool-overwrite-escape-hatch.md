---
"assistant-stream": patch
"@assistant-ui/core": patch
---

Same-priority duplicate tool registrations throw again. The `Tool` type gains an optional `overwrite` flag (discouraged escape hatch) that lets a later registration silently replace a same-priority tool of the same name; the flag is stripped from the merged output.
