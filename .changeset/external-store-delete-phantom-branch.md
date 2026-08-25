---
"@assistant-ui/core": patch
---

fix: evict deleted external-store messages so no phantom branch survives. the setMessages path evicts immediately; the onDelete path evicts at the confirming host snapshot
