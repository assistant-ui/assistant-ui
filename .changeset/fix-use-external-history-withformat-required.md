---
"@assistant-ui/react-ai-sdk": patch
"@assistant-ui/core": patch
---

fix: `useAISDKRuntime` now throws when the supplied `ThreadHistoryAdapter` omits `withFormat`, instead of silently dropping all history load/append/update calls. The optional-call chain `historyAdapter.withFormat?.(…).load()` previously short-circuited to `undefined`. The `withFormat`-wrapped adapter is now memoized, and the persist effect short-circuits when no adapter is supplied (avoiding a redundant thread subscription). `ThreadHistoryAdapter.withFormat` gains a JSDoc note clarifying that it is required on the AI SDK path.
