---
"@assistant-ui/core": patch
---

fix: evict deleted external-store messages so no phantom branch survives — immediately on the setMessages path, and at the confirming host snapshot on the onDelete path
