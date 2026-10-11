---
"@assistant-ui/core": patch
---

fix(core): clear the adapter-change gate before a failed replacement thread list load reports `isLoading: false`, so a thread action started from that notification is not rejected
