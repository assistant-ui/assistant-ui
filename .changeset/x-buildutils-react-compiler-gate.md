---
"@assistant-ui/x-buildutils": patch
---

fix: only run the react compiler on tap-dependent packages that declare a react peer, so non-React framework bridges do not gain memo caches that run outside any render the compiler understands
