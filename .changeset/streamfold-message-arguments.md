---
"assistant-stream": patch
---

Use retained Streamfold state while long JSON strings arrive in message tool arguments. Keep small and complete arguments on the existing parser, preserve partial metadata and tool UI APIs, and fall back when Streamfold is unavailable or input is unsupported.
