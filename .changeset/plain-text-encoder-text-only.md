---
"assistant-stream": patch
---

fix: PlainTextEncoder emits assistant text only. Reasoning and tool-call argument deltas no longer leak into the output, non-text chunks (result, annotations, data, update-state, tool-call-args-text-finish) are skipped instead of throwing mid-stream, and the incorrect x-vercel-ai-data-stream header is removed from the response headers.
