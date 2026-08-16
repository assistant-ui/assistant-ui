---
"@assistant-ui/tap": patch
---

fix: keep the compiler memo cache across uncommitted render replays so a StrictMode double invoke observes one memoized instance
