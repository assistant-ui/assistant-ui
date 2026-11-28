---
"assistant-stream": patch
---

AI SDK v7 `reset-step` chunks are now handled: the reset step's text, reasoning and tool call parts are discarded from the message and its tool calls never execute, while the content and tool results of earlier steps are kept.
