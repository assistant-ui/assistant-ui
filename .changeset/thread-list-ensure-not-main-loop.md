---
"@assistant-ui/core": patch
---

fix: reject archiving, deleting or detaching the thread the user is in when its first `initialize()` fails, instead of looping forever and freezing the tab
