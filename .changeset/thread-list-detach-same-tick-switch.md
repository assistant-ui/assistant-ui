---
"@assistant-ui/core": patch
---

fix: keep a thread off the main slot when `detach`, `archive` or `delete` is called in the tick a switch to it lands, instead of stopping, archiving or deleting the thread the user is now in
