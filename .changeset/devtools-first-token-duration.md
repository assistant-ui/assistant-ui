---
"@assistant-ui/react-devtools": patch
---

fix: read the first token time as the duration the runtime records instead of subtracting the stream start, which always clamped it to zero
