---
"assistant-stream": patch
---

fix: a createAssistantStream callback that throws while a part or a merged stream is still open now ends the stream after the error chunk instead of hanging; open parts end where they stopped, without a part-finish or a completed tool-call args signal, and merged streams are cancelled
