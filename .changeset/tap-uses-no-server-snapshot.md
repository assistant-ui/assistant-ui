---
"@assistant-ui/tap": patch
---

useSyncExternalStore: ignore getServerSnapshot — tap never hydrates, so the first render reads the client snapshot directly
