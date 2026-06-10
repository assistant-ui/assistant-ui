---
"@assistant-ui/next": patch
---

fix: give each `"use generative"` module a distinct bundler-redirect identity so two toolkits in one app no longer collide under `next dev`
