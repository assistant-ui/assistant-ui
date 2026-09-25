---
"@assistant-ui/react-generative-ui": patch
---

fix: the A2UI reducer applies `v0.9.1` operations the way it applies `v0.9` ones instead of warning that the version is unsupported, so a surface from a v0.9.1 server renders
