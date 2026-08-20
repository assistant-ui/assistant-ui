---
"@assistant-ui/core": patch
---

fix: evict deleted external-store messages from the repository so no phantom branch survives, on both the setMessages and onDelete paths
