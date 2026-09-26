---
"assistant-stream": patch
---

fix: a createAssistantStream callback that throws while a part or a merged stream is still open now ends the stream after the error chunk instead of hanging; open text and reasoning parts get their part-finish, open tool calls end where they stopped without a part-finish or a completed args signal, so a frontend tool does not run on partial args, and merged streams are cancelled
