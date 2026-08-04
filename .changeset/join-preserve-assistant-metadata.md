---
"@assistant-ui/core": patch
---

fix: preserve metadata from every joined assistant message

When consecutive assistant/tool outputs are joined into one message, only the first output's metadata was kept — annotations, data, steps, custom, timing, and feedback on any later assistant message (e.g. the final answer after a tool call) were silently dropped.
