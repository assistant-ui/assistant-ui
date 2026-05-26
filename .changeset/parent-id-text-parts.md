---
"assistant-stream": patch
---

fix: preserve parentId on streamed text and reasoning parts

`AssistantStreamController` dropped `parentId` for text/reasoning parts written through a `withParentId(...)` controller: `addTextPart`/`addReasoningPart` never attached it, and `appendText`/`appendReasoning` reused the open append part across a `parentId` change. This silently merged parts and broke the `AuiTextDelta`/`AuiReasoningDelta` data-stream round trip (including the decoder's own `withParentId(...).appendText(...)` path).
