---
"assistant-stream": patch
---

fix: DataStreamDecoder drops tool-call args deltas for an already-closed args stream instead of crashing mid-decode when a text delta interleaves between a tool call's begin and its args
