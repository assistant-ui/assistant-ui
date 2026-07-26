---
"@assistant-ui/tap": patch
---

fix: create the scheduler MessageChannel lazily so importing tap does not hold the Node event loop open
