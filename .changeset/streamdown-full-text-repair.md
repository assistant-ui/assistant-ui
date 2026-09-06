---
"@assistant-ui/react-streamdown": patch
---

fix: apply Markdown repair to the full message so that custom handlers and built-in transforms retain changes to earlier paragraphs.

This removes the tail-only optimization from 0.3.4 because it can discard repairs in earlier paragraphs. Built-in transforms and custom handlers can change text across the full message.

`tailBoundedRemend` repairs the full message on each call, so repair cost grows with message length. `findRemendWindowStart` remains available for compatibility, but its boundary is not a safe limit for Markdown repair.
