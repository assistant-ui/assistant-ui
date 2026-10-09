---
"assistant-stream": patch
---

fix: carry a tool result's `messages` across the data-stream wire

The data-stream encoder dropped the nested `messages` a tool call produced from the tool result frame and the decoder never read it, so a server tool that returned a sub-agent transcript through `createAssistantStreamResponse` showed a plain tool call on a `DataStreamDecoder` client while UIMessageStream, AssistantTransport and aui/v0 carried it.
