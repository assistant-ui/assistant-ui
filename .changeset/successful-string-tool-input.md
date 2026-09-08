---
"assistant-stream": patch
---

fix: keep the JSON quotes on a successful tool input that is a plain string, so a tool with a string input schema executes instead of failing with a parameter parsing error
