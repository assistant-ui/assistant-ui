---
"@assistant-ui/core": patch
"@assistant-ui/react": patch
---

external-store: add `unstable_onBranchChange` adapter callback that fires on explicit `switchToBranch`, emitting the canonical (persisted) head and visible message ids, deduped by head
