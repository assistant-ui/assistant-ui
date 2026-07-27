---
"@assistant-ui/react": patch
---

fix: assistant-transport marks in-transit commands delivered when a run completes successfully without state chunks, instead of leaving them pending forever
