---
"@assistant-ui/react": patch
---

streaming text, running tool durations, and message stall detection read no wall clock during render, so a cacheComponents prerender no longer fails on them.
