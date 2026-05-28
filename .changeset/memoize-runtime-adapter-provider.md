---
"@assistant-ui/core": patch
---

perf: memoize the `RuntimeAdapterProvider` context value so adapter consumers no longer re-render on every parent render when `adapters` is stable.
