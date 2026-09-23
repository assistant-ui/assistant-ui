---
"assistant-stream": patch
---

fix: a createAssistantStream callback that throws while a part is still open now closes that part, so the stream ends instead of hanging after the error chunk
