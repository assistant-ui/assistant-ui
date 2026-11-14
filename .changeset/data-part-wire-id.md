---
"assistant-stream": patch
"@assistant-ui/react-data-stream": patch
---

assistant-stream: `UIMessageStreamDecoder` forwards a data part's wire `id` to `onData` when the chunk carries one, so an in-place update of a data part is distinguishable from a second part with the same payload. A chunk without an `id` keeps the previous callback shape.

react-data-stream: `useDataStreamRuntime({ onData })` receives that optional `id`.
