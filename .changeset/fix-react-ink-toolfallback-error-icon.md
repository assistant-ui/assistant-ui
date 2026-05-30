---
"@assistant-ui/react-ink": patch
---

fix(react-ink): show the error icon for completed tool calls that errored. `ToolFallback` resolved a part with a `complete` status to the success icon (`+`) even when `isError` was set, so a finished-but-failed tool call rendered green. It now checks `isError` within the complete branch and shows the error icon (`x`), matching `useToolCallChecklist`.
