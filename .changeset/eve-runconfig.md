---
"@assistant-ui/eve": patch
---

fix: forward runConfig to eve as client context (an explicit empty reload config cannot clear a staged one — core normalizes omitted and empty runConfig to the same value)
