---
"@assistant-ui/generative-ui": patch
---

feat: `specToUISpec` converts a generative-frame spec into the tree the Slack and Teams converters and `generativeUIToJSX` take, so a spec mode answer can go to Slack and Teams. Event bindings become `$action`, and an action param that reads a bound control's state becomes a `$field` reference to it.
