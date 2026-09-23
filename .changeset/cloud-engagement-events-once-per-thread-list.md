---
"@assistant-ui/core": patch
"assistant-cloud": patch
---

fix: report cloud engagement events once per thread list instead of once per mounted thread, keep counting a run that ends while its thread is in the background, and let an engagement id resolver decline an event for a thread it does not know
