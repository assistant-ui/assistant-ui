---
"assistant-stream": patch
---

fix: a createAssistantStream callback that throws now ends its own open parts instead of leaving the response hanging. Text and reasoning parts get their part-finish; tool calls end without a part-finish or a completed args signal, so a frontend tool does not run on partial args. Background writes to parts ended by the failure are ignored; writes after an explicit close retain strict-mode errors. Merged streams keep delivering their output until their producers finish.
