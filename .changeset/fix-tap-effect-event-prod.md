---
"@assistant-ui/tap": patch
---

fix: tapEffectEvent returned a frozen callback in production, breaking consumers that stored the reference externally (e.g. trigger popover plugin registry). Both dev and prod now use the same wrapper that reads the latest callback from the ref at call time — matching the documented "stable reference that always calls the most recent version" contract.
