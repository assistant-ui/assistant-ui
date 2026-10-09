---
"@assistant-ui/store": patch
---

perf(store): wake only the selectors whose clients changed, so a token in a long thread no longer re-runs every message and part selector
