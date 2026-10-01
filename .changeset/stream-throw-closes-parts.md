---
"assistant-stream": patch
---

fix: a createAssistantStream callback that throws now ends its own open parts instead of leaving the response hanging. Text and reasoning parts get their part-finish; tool calls whose args were still streaming are cut off without a part-finish or args-finish chunk. Background writes to parts ended by the failure are ignored; writes after an explicit close retain strict-mode errors. Merged streams keep delivering their output until their producers finish. Already completed args and the legacy data-stream encoder's fatal-error handling are unchanged.
