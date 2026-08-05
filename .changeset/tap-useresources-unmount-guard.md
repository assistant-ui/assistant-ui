---
"@assistant-ui/tap": patch
---

fix(tap): guard useResources unmounts with isMounted, so StrictMode/Activity effect replays cannot double-unmount a child fiber
