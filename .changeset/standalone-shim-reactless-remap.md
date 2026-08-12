---
"@assistant-ui/x-buildutils": patch
---

fix: remap bare react imports to the react-free standalone-shim for tap-dependent packages without a react peer, so non-React framework bridges never require React at runtime
