---
"@assistant-ui/tap": patch
---

fix: create the scheduler MessageChannel lazily so importing tap does not hold the Node event loop open; implement useMemoCache on tap's dispatcher so compiled components work under duplicated tap copies
