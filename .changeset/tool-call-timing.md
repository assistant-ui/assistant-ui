---
"assistant-stream": patch
"@assistant-ui/core": patch
"@assistant-ui/react": patch
"@assistant-ui/react-native": patch
---

feat: per-tool-call timing and stall detection. `ToolCallMessagePart` gains a `timing` field (`{ startedAt, completedAt? }` in epoch ms), auto-populated by the assistant-stream accumulator at part start and result, and accepted on `ThreadMessageLike` for external-store hosts. New `useToolCallElapsed()` hook returns the call's elapsed milliseconds, ticking once per second while running; `unstable_useMessageStallDetection({ thresholdMs })` reports mid-run output stalls by watching a message content fingerprint. The kit `ToolFallback` trigger renders the duration when timing is present.
