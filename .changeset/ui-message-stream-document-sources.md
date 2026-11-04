---
"assistant-stream": patch
---

`UIMessageStreamDecoder` now decodes AI SDK `source-document` chunks into document source parts, so `useDataStreamRuntime` shows the documents a response cites (title, media type, filename) instead of dropping them. `appendSource` and the accumulator accept document sources too. `SourcePart.url` is only present when `sourceType` is `"url"`, so code that reads `.url` as a string needs to check `sourceType` first.
