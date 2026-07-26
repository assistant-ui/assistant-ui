---
"@assistant-ui/react": patch
---

fix: tolerate a transient part-type mismatch in the part hooks so a thread switch can't throw inside useSyncExternalStore and unmount the app
