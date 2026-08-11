---
"@assistant-ui/react-generative-ui": patch
---

fix: report the depth warning against the 32 levels of element nesting the Slack and Teams converters actually allow, instead of the 64 traversal units that ceiling is spent in
